import { CredentialsRepository, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In } from '@n8n/typeorm';
import {
	validateWorkflowHasTriggerLikeNode,
	NodeHelpers,
	ensureError,
	mapConnectionsByDestination,
	validateNodeCredentials,
	isNodeConnected,
	isTriggerLikeNode,
	toExecutionContextEstablishmentHookParameter,
} from 'n8n-workflow';
import type { INode, INodes, IConnections, INodeType, IWorkflowSettings } from 'n8n-workflow';

import { STARTING_NODES } from '@/constants';
import type { NodeTypes } from '@/node-types';

export interface WorkflowValidationResult {
	isValid: boolean;
	error?: string;
}

export interface SubWorkflowValidationResult extends WorkflowValidationResult {
	invalidReferences?: Array<{
		nodeName: string;
		workflowId: string;
		workflowName?: string;
	}>;
}

export interface WorkflowStatus {
	exists: boolean;
	isPublished: boolean;
	name?: string;
}

@Service()
export class WorkflowValidationService {
	constructor(
		private readonly workflowRepository: WorkflowRepository,
		private readonly credentialsRepository: CredentialsRepository,
	) {}

	/**
	 * Validates node configuration (credentials, parameters) for connected and enabled nodes.
	 * Trigger-like nodes are always validated even without connections.
	 */
	private validateNodeConfiguration(
		nodes: INode[],
		connections: IConnections,
		nodeTypes: NodeTypes,
	): WorkflowValidationResult {
		try {
			const connectionsByDestination = mapConnectionsByDestination(connections);
			const issuesFound: Array<{ nodeName: string; issues: string[] }> = [];

			for (const node of nodes) {
				try {
					if (node.disabled) continue;

					const nodeType = nodeTypes.getByNameAndVersion(node.type, node.typeVersion);

					if (!nodeType) {
						issuesFound.push({
							nodeName: node.name,
							issues: ['Node type not found'],
						});
						continue;
					}

					const isNodeTriggerLike = isTriggerLikeNode(nodeType);

					const isConnected = isNodeConnected(node.name, connections, connectionsByDestination);

					if (!isConnected && !isNodeTriggerLike) continue;

					const nodeIssues: string[] = [];
					const credentialIssues = validateNodeCredentials(node, nodeType);

					// Convert credential issues to error messages
					for (const issue of credentialIssues) {
						if (issue.type === 'missing') {
							nodeIssues.push(`Missing required credential: ${issue.displayName}`);
						} else if (issue.type === 'not-configured') {
							nodeIssues.push(`Credential not configured: ${issue.displayName}`);
						}
					}

					const parameterIssues = this.validateNodeParameters(node, nodeType);
					nodeIssues.push(...parameterIssues);

					if (nodeIssues.length > 0) {
						issuesFound.push({
							nodeName: node.name,
							issues: nodeIssues,
						});
					}
				} catch (nodeError) {
					issuesFound.push({
						nodeName: node.name,
						issues: [`Error validating node: ${ensureError(nodeError).message}`],
					});
				}
			}

			if (issuesFound.length === 0) {
				return { isValid: true };
			}

			const errorLines = issuesFound.map((item) => {
				const issuesList = item.issues.map((issue) => `  - ${issue}`).join('\n');
				return `Node "${item.nodeName}":\n${issuesList}`;
			});

			const nodeCount = issuesFound.length;
			const pluralSuffix = nodeCount === 1 ? '' : 's';
			const error = `Cannot publish workflow: ${nodeCount} node${pluralSuffix} have configuration issues:\n\n${errorLines.join('\n\n')}`;

			return {
				isValid: false,
				error,
			};
		} catch (error) {
			return {
				isValid: false,
				error: `Workflow validation failed: ${ensureError(error).message}`,
			};
		}
	}

	/**
	 * Validates node parameters using NodeHelpers.
	 */
	private validateNodeParameters(node: INode, nodeType: INodeType): string[] {
		const issues: string[] = [];

		try {
			if (!nodeType.description?.properties) {
				return issues;
			}

			const nodeIssues = NodeHelpers.getNodeParametersIssues(
				nodeType.description.properties,
				node,
				nodeType.description,
			);

			if (nodeIssues?.parameters) {
				const paramNames = Object.keys(nodeIssues.parameters);
				if (paramNames.length > 0) {
					issues.push(`Missing or invalid required parameters: ${paramNames.join(', ')}`);
				}
			}
		} catch (error) {
			issues.push('Error validating node parameters');
		}

		return issues;
	}

	validateForActivation(
		nodes: INodes,
		connections: IConnections,
		nodeTypes: NodeTypes,
	): WorkflowValidationResult {
		// Validate trigger nodes
		const triggerValidation = validateWorkflowHasTriggerLikeNode(nodes, nodeTypes, STARTING_NODES);

		if (!triggerValidation.isValid) {
			return {
				isValid: false,
				error:
					triggerValidation.error ??
					'Workflow cannot be activated because it has no trigger node. At least one trigger, webhook, or polling node is required.',
			};
		}

		// Validate node configuration (credentials, parameters)
		const nodesArray = Object.values(nodes);
		const configValidation = this.validateNodeConfiguration(nodesArray, connections, nodeTypes);

		if (!configValidation.isValid) {
			return configValidation;
		}

		return { isValid: true };
	}

	/**
	 * Validates that workflows using dynamic (resolvable) credentials have:
	 * 1. A resolver configured on each dynamic credential.
	 * 2. At least one trigger node with context establishment hooks configured.
	 * These hooks extract identity from trigger data (e.g., bearer tokens from HTTP headers)
	 * and are required for dynamic credential resolution.
	 */
	async validateDynamicCredentials(
		nodes: INode[],
		nodeTypes: NodeTypes,
		workflowSettings?: IWorkflowSettings,
	): Promise<WorkflowValidationResult> {
		const credentialIds = new Set<string>();
		for (const node of nodes) {
			if (node.disabled) continue;
			for (const credName of Object.keys(node.credentials ?? {})) {
				const credData = node.credentials?.[credName];
				if (credData?.id) {
					credentialIds.add(credData.id);
				}
			}
		}

		if (credentialIds.size === 0) {
			return { isValid: true };
		}

		const resolvableCredentials = await this.credentialsRepository.find({
			where: { id: In([...credentialIds]), isResolvable: true },
			select: ['id', 'name', 'resolverId'],
		});

		if (resolvableCredentials.length === 0) {
			return { isValid: true };
		}

		const errors: string[] = [];

		// A credential is covered if it has its own resolver OR the workflow has a defined resolver
		const workflowResolverId = workflowSettings?.credentialResolverId;
		if (!workflowResolverId) {
			const credentialsWithoutResolver = resolvableCredentials.filter((c) => !c.resolverId);
			if (credentialsWithoutResolver.length > 0) {
				const credNames = credentialsWithoutResolver.map((c) => `"${c.name}"`).join(', ');
				errors.push(`dynamic credentials (${credNames}) require a resolver to be configured.`);
			}
		}

		const hasExtractorHook = nodes.some((node) => {
			if (node.disabled) return false;
			const nodeType = nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
			if (!nodeType || !isTriggerLikeNode(nodeType)) return false;
			const hookParams = toExecutionContextEstablishmentHookParameter(node.parameters);
			return (
				hookParams !== null &&
				hookParams.success &&
				hookParams.data.contextEstablishmentHooks.hooks.length > 0
			);
		});

		if (!hasExtractorHook) {
			const credNames = resolvableCredentials.map((c) => `"${c.name}"`).join(', ');
			errors.push(
				`dynamic credentials (${credNames}) require a trigger with an identity extractor configured. Please configure an identity extractor on the trigger node.`,
			);
		}

		if (errors.length > 0) {
			return {
				isValid: false,
				error: `Cannot publish workflow: ${errors.join(' ')}`,
			};
		}

		return { isValid: true };
	}

	/**
	 * Validates that all sub-workflow references in a workflow are published.
	 *
	 * This prevents publishing a parent workflow that references draft-only sub-workflows,
	 * which would cause runtime errors when the workflow is triggered in production.
	 *
	 */
	async validateSubWorkflowReferences(
		workflowId: string,
		nodes: INode[],
	): Promise<SubWorkflowValidationResult> {
		const executeWorkflowNodes = nodes.filter(
			(node) => node.type === 'n8n-nodes-base.executeWorkflow' && !node.disabled,
		);

		if (executeWorkflowNodes.length === 0) {
			return { isValid: true };
		}

		const invalidReferences: Array<{
			nodeName: string;
			workflowId: string;
			workflowName?: string;
		}> = [];

		for (const node of executeWorkflowNodes) {
			const subWorkflowId = this.extractWorkflowId(node);
			const source: string | undefined =
				typeof node.parameters?.source === 'string' ? node.parameters.source : undefined;

			if (this.shouldSkipSubWorkflowValidation(subWorkflowId, source)) {
				continue;
			}

			const status = await this.getWorkflowStatus(workflowId, subWorkflowId!);

			if (!status.exists || !status.isPublished) {
				invalidReferences.push({
					nodeName: node.name,
					workflowId: subWorkflowId!,
					workflowName: status.exists ? status.name : undefined,
				});
			}
		}

		if (invalidReferences.length > 0) {
			const errorMessages = invalidReferences.map((ref) => {
				const workflowName = ref.workflowName ? ` ("${ref.workflowName}")` : '';
				return `Node "${ref.nodeName}" references workflow ${ref.workflowId}${workflowName} which is not published`;
			});

			return {
				isValid: false,
				error: `Cannot publish workflow: ${errorMessages.join('; ')}. Please publish all referenced sub-workflows first.`,
				invalidReferences,
			};
		}

		return { isValid: true };
	}

	/**
	 * Gets the status of a sub-workflow for validation purposes.
	 * Allows self-referencing workflows (workflow calling itself).
	 */
	private async getWorkflowStatus(
		parentWorkflowId: string,
		subWorkflowId: string,
	): Promise<WorkflowStatus> {
		// Allow self-reference (workflow calling itself)
		if (subWorkflowId === parentWorkflowId) {
			return { exists: true, isPublished: true };
		}

		const subWorkflow = await this.workflowRepository.get({ id: subWorkflowId }, { relations: [] });

		if (!subWorkflow) {
			return { exists: false, isPublished: false };
		}

		return {
			exists: true,
			isPublished: subWorkflow.activeVersionId !== null,
			name: subWorkflow.name,
		};
	}

	/**
	 * Type guard to check if a value is an object with a value property.
	 */
	private hasValueProperty(obj: unknown): obj is { value?: string } {
		return typeof obj === 'object' && obj !== null && 'value' in obj;
	}

	/**
	 * Extracts the workflow ID from an Execute Workflow node's parameters.
	 * Handles both old format (string) and new format (object with value property).
	 */
	private extractWorkflowId(node: INode): string | undefined {
		const workflowIdParam = node.parameters?.workflowId;

		if (this.hasValueProperty(workflowIdParam)) {
			return workflowIdParam.value;
		}

		if (typeof workflowIdParam === 'string') {
			return workflowIdParam;
		}

		return undefined;
	}

	/**
	 * Determines if a sub-workflow reference should be skipped during validation.
	 * Skips when:
	 * - No workflow ID is provided
	 * - Workflow ID is an expression (starts with '=')
	 * - Source is not 'database' (e.g., url, parameter, localFile)
	 */
	private shouldSkipSubWorkflowValidation(
		workflowId: string | undefined,
		source: string | undefined,
	): boolean {
		if (!workflowId) return true;
		if (workflowId.startsWith('=')) return true;
		if (source && source !== 'database') return true;
		return false;
	}
}
