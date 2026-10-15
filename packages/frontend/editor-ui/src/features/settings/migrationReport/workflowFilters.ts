import type { BreakingChangeRuleDetailWorkflow } from '@n8n/api-types';
import { TIME } from '@/app/constants';

export type AgeFilter = 'any' | 'under30Days' | 'under6Months' | 'over12Months';
export type ExecutionsFilter = 'any' | 'none' | 'under100' | 'over1000';
export type PublishedFilter = 'any' | 'published' | 'notPublished';
/** `any`, `unassigned`, or the id of the owner. */
export type OwnerFilter = string;

export interface WorkflowFilters {
	lastRun: AgeFilter;
	lastUpdated: AgeFilter;
	executions: ExecutionsFilter;
	published: PublishedFilter;
	owner: OwnerFilter;
}

export const DEFAULT_WORKFLOW_FILTERS: WorkflowFilters = {
	lastRun: 'any',
	lastUpdated: 'any',
	executions: 'any',
	published: 'any',
	owner: 'any',
};

export const UNASSIGNED_OWNER = 'unassigned';

/** The number of filters that differ from the default. */
export function countActiveFilters(filters: WorkflowFilters): number {
	return (Object.keys(DEFAULT_WORKFLOW_FILTERS) as Array<keyof WorkflowFilters>).filter(
		(key) => filters[key] !== DEFAULT_WORKFLOW_FILTERS[key],
	).length;
}

// A date that is not there (a workflow that never ran) matches only `any`.
function matchesAge(date: Date | string | undefined, filter: AgeFilter, now: number): boolean {
	if (filter === 'any') return true;
	if (!date) return false;
	const age = now - new Date(date).getTime();
	if (filter === 'under30Days') return age < 30 * TIME.DAY;
	if (filter === 'under6Months') return age < 182 * TIME.DAY;
	return age > 365 * TIME.DAY;
}

function matchesExecutions(count: number, filter: ExecutionsFilter): boolean {
	if (filter === 'none') return count === 0;
	if (filter === 'under100') return count < 100;
	if (filter === 'over1000') return count > 1000;
	return true;
}

function matchesOwner(workflow: BreakingChangeRuleDetailWorkflow, filter: OwnerFilter): boolean {
	if (filter === 'any') return true;
	if (filter === UNASSIGNED_OWNER) return !workflow.owner;
	return workflow.owner?.id === filter;
}

export function matchesWorkflowFilters(
	workflow: BreakingChangeRuleDetailWorkflow,
	filters: WorkflowFilters,
	now = Date.now(),
): boolean {
	return (
		matchesAge(workflow.lastExecutedAt, filters.lastRun, now) &&
		matchesAge(workflow.lastUpdatedAt, filters.lastUpdated, now) &&
		matchesExecutions(workflow.numberOfExecutions, filters.executions) &&
		(filters.published === 'any' || workflow.active === (filters.published === 'published')) &&
		matchesOwner(workflow, filters.owner)
	);
}
