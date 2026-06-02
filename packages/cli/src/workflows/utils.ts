import type { RedactionEnforcementSettings } from '@n8n/api-types';
import type { WorkflowEntity } from '@n8n/db';
import type { Scope } from '@n8n/permissions';
import { NodeApiError, NodeError, WorkflowActivationError } from 'n8n-workflow';
import type { WorkflowSettings } from 'n8n-workflow';

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

export function policyFromFloor(
	floor: RedactionEnforcementSettings,
): WorkflowSettings.RedactionPolicy | undefined {
	if (!floor.enforced) return undefined;
	if (floor.manual) return 'all';
	if (floor.production) return 'non-manual';
	return undefined;
}

export function policyMeetsFloor(
	policy: WorkflowSettings.RedactionPolicy,
	floor: RedactionEnforcementSettings,
): boolean {
	if (!floor.enforced) return true;

	const redactsProduction = policy === 'non-manual' || policy === 'all';
	const redactsManual = policy === 'manual-only' || policy === 'all';

	if (floor.production && !redactsProduction) return false;
	if (floor.manual && !redactsManual) return false;

	return true;
}

export function dropRedactionPolicy(newWorkflow: WorkflowEntity): void {
	if (newWorkflow.settings?.redactionPolicy !== undefined) {
		delete newWorkflow.settings.redactionPolicy;
	}
}
