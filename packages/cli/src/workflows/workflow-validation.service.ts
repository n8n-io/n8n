import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { validateWorkflowHasTriggerLikeNode } from 'n8n-workflow';
import type { INode, INodes } from 'n8n-workflow';

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
	constructor(private readonly workflowRepository: WorkflowRepository) {}

	validateForActivation(nodes: INodes, nodeTypes: NodeTypes): WorkflowValidationResult {
		const triggerValidation = validateWorkflowHasTriggerLikeNode(nodes, nodeTypes, STARTING_NODES);

		if (!triggerValidation.isValid) {
			return {
				isValid: false,
				error:
					triggerValidation.error ??
					'Workflow cannot be activated because it has no trigger node. At least one trigger, webhook, or polling node is required.',
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
