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
	CHAT_TRIGGER_NODE_TYPE,
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPES,
} from 'n8n-workflow';
import { FULL_ACCESS_NODE_TYPES } from 'n8n-core';
import type {
	INode,
	INodes,
	IConnections,
	INodeType,
	IWorkflowSettings,
	ICredentialType,
} from 'n8n-workflow';

import { MCP_TRIGGER_NODE_TYPE, STARTING_NODES } from '@/constants';
import { CredentialTypes } from '@/credential-types';
import { DynamicCredentialsProxy } from '@/credentials/dynamic-credentials-proxy';
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

/** Formats credential names as a quoted, comma-separated list for error messages. */
function formatCredentialNames(credentials: Array<{ name: string }>): string {
	return credentials.map((c) => `"${c.name}"`).join(', ');
}

/** Whether a node's parameters declare at least one context establishment hook. */
function hasContextEstablishmentHook(parameters: INode['parameters']): boolean {
	const hookParams = toExecutionContextEstablishmentHookParameter(parameters);
	return (
		hookParams !== null &&
		hookParams.success &&
		hookParams.data.contextEstablishmentHooks.hooks.length > 0
	);
}

@Service()
export class WorkflowValidationService {
	constructor(
		private readonly workflowRepository: WorkflowRepository,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly dynamicCredentialsProxy: DynamicCredentialsProxy,
		private readonly credentialTypes: CredentialTypes,
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

	/**
	 * Rejects workflows that bind a credential whose type sets
	 * `restrictToSupportedNodes: true` to a node not listed in its `supportedNodes`.
	 * Runs on every save — illegal bindings should never be persisted.
	 */
	validateCredentialNodeRestrictions(nodes: INode[]): WorkflowValidationResult {
		const violations: string[] = [];

		for (const node of nodes) {
			// Validate disabled nodes too — illegal bindings must never be persisted.
			// A disabled node can be re-enabled later (separate save, direct DB write,
			// workflow import), and the DB state should remain consistent regardless.
			if (!node.credentials) continue;

			const activeCredentialTypes = this.getActiveCredentialTypes(node);

			for (const credentialType of activeCredentialTypes) {
				if (!node.credentials[credentialType]) continue;

				let typeDef: ICredentialType | undefined;
				try {
					typeDef = this.credentialTypes.getByName(credentialType);
				} catch {
					continue; // unknown type — let other validators surface it
				}

				if (!typeDef?.restrictToSupportedNodes) continue;

				// `typeDef.supportedNodes` from the loader holds short node names
				// (e.g. "mattermost"), but `node.type` is fully qualified
				// (e.g. "n8n-nodes-base.mattermost"). `getSupportedNodes` returns
				// the post-processed FQ list so the comparison can match.
				const supportedNodes = this.credentialTypes.getSupportedNodes(credentialType);
				if (supportedNodes.includes(node.type)) continue;

				violations.push(
					`Node "${node.name}" (${node.type}) cannot use credential type "${credentialType}" — it is restricted to: ${
						supportedNodes.length > 0 ? supportedNodes.join(', ') : '(no nodes)'
					}.`,
				);
			}
		}

		if (violations.length === 0) return { isValid: true };

		return {
			isValid: false,
			error: `Cannot save workflow: ${violations.join(' ')}`,
		};
	}

	/**
	 * Returns the credential types that are actively in use on a node — the
	 * subset of `node.credentials` keys we should validate against.
	 *
	 * For "full-access" nodes (HTTP Request + its tool variants), the editor
	 * spreads `node.credentials` instead of replacing it when the user switches
	 * credential type, leaving inactive keys behind. Only the credential
	 * pointed at by the active `authentication` parameter is in use, so we
	 * limit the check to that one — otherwise the validator would reject a
	 * save based on an entry the user can't even see in the UI.
	 *
	 * For all other nodes, every entry in `node.credentials` corresponds to a
	 * declared credential the node may use (gated by `displayOptions` at
	 * runtime), so all keys remain candidates.
	 */
	private getActiveCredentialTypes(node: INode): string[] {
		if (!node.credentials) return [];

		if (!FULL_ACCESS_NODE_TYPES.has(node.type)) {
			return Object.keys(node.credentials);
		}

		const params = (node.parameters ?? {}) as Record<string, unknown>;
		const auth = typeof params.authentication === 'string' ? params.authentication : null;

		if (auth === 'predefinedCredentialType') {
			const cred = params.nodeCredentialType;
			return typeof cred === 'string' && cred.length > 0 ? [cred] : [];
		}
		if (auth === 'genericCredentialType') {
			const cred = params.genericAuthType;
			return typeof cred === 'string' && cred.length > 0 ? [cred] : [];
		}
		return [];
	}

	validateForActivation(
		nodes: INodes,
		connections: IConnections,
		nodeTypes: NodeTypes,
	): WorkflowValidationResult {
		// Validate workflow entry points: active, poll, webhook, or schedule triggers.
		const triggerValidation = validateWorkflowHasTriggerLikeNode(nodes, nodeTypes, STARTING_NODES);

		if (!triggerValidation.isValid) {
			return {
				isValid: false,
				error:
					triggerValidation.error ??
					'Workflow cannot be activated because it has no trigger node. At least one active trigger, poll trigger, webhook trigger, or schedule trigger node is required.',
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
	 * Validates that a workflow using dynamic (resolvable) credentials has a
	 * resolver configured and a trigger that provides the identity it needs.
	 *
	 * The resolver is workflow-level (`settings.credentialResolverId` override or
	 * the seeded system resolver):
	 * - A custom resolver (OAuth, Slack, …) keys on an external identity extracted
	 *   from trigger data, so it needs a trigger with a context establishment hook.
	 * - The default/system resolver keys on the n8n user identity, so it needs a
	 *   manual, chat, or sub-workflow trigger.
	 */
	async validateDynamicCredentials(
		nodes: INode[],
		nodeTypes: NodeTypes,
		workflowSettings?: IWorkflowSettings,
	): Promise<WorkflowValidationResult> {
		const credentialIds = this.collectCredentialIds(nodes);
		if (credentialIds.size === 0) {
			return { isValid: true };
		}

		const resolvableCredentials = await this.credentialsRepository.find({
			where: { id: In([...credentialIds]), isResolvable: true },
			select: ['id', 'name'],
		});

		if (resolvableCredentials.length === 0) {
			return { isValid: true };
		}

		const credNames = formatCredentialNames(resolvableCredentials);

		// Workflow override if present, otherwise the seeded system resolver (null when neither).
		const workflowResolverId =
			this.dynamicCredentialsProxy.getEffectiveResolverId(workflowSettings);
		const triggers = this.classifyTriggerIdentities(nodes, nodeTypes);

		const error = this.getDynamicCredentialsError(workflowResolverId, credNames, triggers);

		return error
			? { isValid: false, error: `Cannot publish workflow: ${error}` }
			: { isValid: true };
	}

	/**
	 * Returns the publish error for the workflow's resolvable credentials, or
	 * `undefined` when they are valid.
	 */
	private getDynamicCredentialsError(
		workflowResolverId: string | null,
		credNames: string,
		triggers: { hasExternalIdentityTrigger: boolean; hasN8nIdentityTrigger: boolean },
	): string | undefined {
		if (!workflowResolverId) {
			return `dynamic credentials (${credNames}) require a resolver to be configured.`;
		}

		const { hasExternalIdentityTrigger, hasN8nIdentityTrigger } = triggers;

		if (workflowResolverId === this.dynamicCredentialsProxy.getSystemResolverId()) {
			// System resolver: needs the n8n user identity.
			return hasN8nIdentityTrigger
				? undefined
				: `private credentials (${credNames}) are only supported in workflows triggered manually, via chat, or as a sub-workflow.`;
		}

		// Custom resolver: needs an external identity from the trigger.
		return hasExternalIdentityTrigger
			? undefined
			: `dynamic credentials (${credNames}) require a trigger with an identity extractor configured. Please configure an identity extractor on the trigger node.`;
	}

	/** Collects the ids of all credentials referenced by enabled nodes. */
	private collectCredentialIds(nodes: INode[]): Set<string> {
		const credentialIds = new Set<string>();
		for (const node of nodes) {
			if (node.disabled) continue;
			for (const credName of Object.keys(node.credentials ?? {})) {
				const credId = node.credentials?.[credName]?.id;
				if (credId) {
					credentialIds.add(credId);
				}
			}
		}
		return credentialIds;
	}

	/**
	 * Classifies a workflow's triggers by the identity they can provide:
	 * - `hasExternalIdentityTrigger`: external identity (context hook, Chat Hub, sub-workflow).
	 * - `hasN8nIdentityTrigger`: n8n user identity (manual/chat, Chat Hub, sub-workflow).
	 *
	 * This mirrors how the engine establishes identity at runtime: keep it in sync
	 * with `execution-context.ts` (manual/parent inheritance) and the identity sources
	 * accepted by the resolvers' identifiers (e.g. `N8NIdentifier`). When a new trigger
	 * or identity source is added there, it must be reflected here too. A follow-up
	 * tracks making this declarative instead of hardcoded.
	 */
	private classifyTriggerIdentities(
		nodes: INode[],
		nodeTypes: NodeTypes,
	): { hasExternalIdentityTrigger: boolean; hasN8nIdentityTrigger: boolean } {
		let hasExternalIdentityTrigger = false;
		let hasN8nIdentityTrigger = false;

		for (const node of nodes) {
			if (node.disabled) continue;
			const nodeType = nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
			if (!nodeType || !isTriggerLikeNode(nodeType)) continue;

			// Sub-workflows inherit identity from the parent; Chat Hub injects it.
			// Both satisfy either family.
			const isSubWorkflowTrigger = node.type === EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE;
			const isChatHubTrigger =
				node.type === CHAT_TRIGGER_NODE_TYPE && node.parameters.availableInChat === true;
			const isMcpTrigger =
				node.type === MCP_TRIGGER_NODE_TYPE && node.parameters.authentication === 'n8nOAuth2';
			if (isSubWorkflowTrigger || isChatHubTrigger || isMcpTrigger) {
				hasExternalIdentityTrigger = true;
				hasN8nIdentityTrigger = true;
				continue;
			}

			// Manual/chat triggers run with the n8n user identity.
			if (MANUAL_TRIGGER_NODE_TYPES.includes(node.type)) {
				hasN8nIdentityTrigger = true;
				continue;
			}

			// Any other trigger with a context establishment hook provides external identity.
			if (hasContextEstablishmentHook(node.parameters)) {
				hasExternalIdentityTrigger = true;
			}
		}

		return { hasExternalIdentityTrigger, hasN8nIdentityTrigger };
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
