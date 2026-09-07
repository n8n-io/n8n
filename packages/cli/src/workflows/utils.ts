import { Logger } from '@n8n/backend-common';
import type { WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Scope } from '@n8n/permissions';
import { NodeApiError, NodeError, WorkflowActivationError } from 'n8n-workflow';
import type { WorkflowSettings } from 'n8n-workflow';

import type { OwnershipService } from '@/services/ownership.service';

type RedactionMode = 'manual' | 'nonManual';

const REDACTED_MODES: Record<WorkflowSettings.RedactionPolicy, ReadonlySet<RedactionMode>> = {
	none: new Set(),
	'manual-only': new Set(['manual']),
	'non-manual': new Set(['nonManual']),
	all: new Set(['manual', 'nonManual']),
};

export function getRequiredRedactionScopes(
	oldPolicy: WorkflowSettings.RedactionPolicy | undefined,
	newPolicy: WorkflowSettings.RedactionPolicy,
): Scope[] {
	const oldSet = REDACTED_MODES[oldPolicy ?? 'none'];
	const newSet = REDACTED_MODES[newPolicy];

	const turnsOn = [...newSet].some((m) => !oldSet.has(m));
	const turnsOff = [...oldSet].some((m) => !newSet.has(m));

	const scopes: Scope[] = [];
	if (turnsOn) scopes.push('workflow:enableRedaction');
	if (turnsOff) scopes.push('workflow:disableRedaction');
	return scopes;
}

export function getErrorNodeId(error: unknown): string | undefined {
	if (error instanceof NodeError) return error.node.id;
	if (error instanceof WorkflowActivationError) return error.node?.id;
	return undefined;
}

export function getErrorDescription(error: unknown): string | undefined {
	if (error instanceof NodeApiError) return error.description ?? undefined;
	return undefined;
}

export function dropRedactionPolicy(newWorkflow: WorkflowEntity): void {
	if (newWorkflow.settings?.redactionPolicy !== undefined) {
		delete newWorkflow.settings.redactionPolicy;
	}
}

/**
 * Loads a workflow's owning project for event data purposes, falling back to empty
 * strings when it can't be resolved. Project lookup must never break execution.
 */
export async function getWorkflowProjectDetailsSafe(
	ownershipService: OwnershipService,
	workflowId: string,
): Promise<{ projectId: string; projectName: string }> {
	try {
		const project = await ownershipService.getWorkflowProjectCached(workflowId);
		return { projectId: project.id, projectName: project.name };
	} catch (error) {
		Container.get(Logger).warn('Failed to resolve owning project for workflow', {
			workflowId,
			error,
		});
		return { projectId: '', projectName: '' };
	}
}
