import {
	getSubworkflowId,
	isNodeWithWorkflowSelector,
	isResourceLocatorValue,
	type INode,
} from 'n8n-workflow';

import type { EntityReference } from '../../reference';
import type { WorkflowSubWorkflowRequirement } from '../workflow.types';

/**
 * Find and extract subworkflow references from a workflow
 *
 * Update subworkflow references from the import bindings
 */
export const subWorkflowNodeReference: EntityReference<WorkflowSubWorkflowRequirement> = {
	extract(workflow) {
		const requirements: WorkflowSubWorkflowRequirement[] = [];
		for (const node of workflow.nodes ?? []) {
			const referencedWorkflowId = getStaticSubworkflowId(node);
			if (referencedWorkflowId) {
				requirements.push({ workflowId: workflow.id, referencedWorkflowId });
			}
		}
		return requirements;
	},
	apply(workflow, bindings) {
		for (const node of workflow.nodes ?? []) {
			const currentId = getStaticSubworkflowId(node);
			if (!currentId) continue;
			const targetId = bindings.workflows.get(currentId);
			if (targetId) setStaticSubworkflowId(node, targetId);
		}
	},
};

export function getStaticSubworkflowId(node: INode): string | undefined {
	if (!isNodeWithWorkflowSelector(node)) return undefined;

	const { source = 'database' } = node.parameters;
	if (source !== 'database') return undefined;

	const { workflowId: storedWorkflowId } = node.parameters;
	return toStaticId(getSubworkflowId(node) ?? storedWorkflowId);
}

export function setStaticSubworkflowId(node: INode, workflowId: string): void {
	const stored = node.parameters.workflowId;
	if (isResourceLocatorValue(stored)) {
		stored.value = workflowId;
	} else {
		node.parameters.workflowId = workflowId;
	}
}

function toStaticId(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	// Expressions are resolved at runtime, so they are not static dependencies.
	if (trimmed === '' || trimmed.startsWith('=')) return undefined;
	return trimmed;
}
