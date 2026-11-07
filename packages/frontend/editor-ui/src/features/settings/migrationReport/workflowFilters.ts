import type {
	BreakingChangeRuleDetailWorkflow,
	MigrationFindingTriageStatus,
} from '@n8n/api-types';
import { TIME } from '@/app/constants';
import {
	findingState,
	isUnresolved,
	isUnresolvedState,
	type FindingState,
	type MigrationContext,
} from './findingState';

export type AgeFilter = 'any' | 'under30Days' | 'under6Months' | 'over12Months';
export type ExecutionsFilter = 'any' | 'none' | 'under100' | 'over1000';
export type PublishedFilter = 'any' | 'published' | 'notPublished';
export type StateFilter = 'any' | MigrationFindingTriageStatus;
/** `any`, `unassigned`, or the id of the owner. */
export type OwnerFilter = string;
/** `any`, `personal` for all personal projects, or the id of a team project. */
export type ProjectFilter = string;

export interface WorkflowFilters {
	lastRun: AgeFilter;
	lastUpdated: AgeFilter;
	executions: ExecutionsFilter;
	published: PublishedFilter;
	owner: OwnerFilter;
	project: ProjectFilter;
	state: StateFilter;
	showArchived: boolean;
}

export const DEFAULT_WORKFLOW_FILTERS: WorkflowFilters = {
	lastRun: 'any',
	lastUpdated: 'any',
	executions: 'any',
	published: 'any',
	owner: 'any',
	project: 'any',
	state: 'any',
	showArchived: false,
};

// The callout offers to dismiss open findings on workflows that did not run for
// 12 months. "Review" applies the same filters, so it shows the rows the callout counts.
export const UNUSED_WORKFLOW_FILTERS: WorkflowFilters = {
	...DEFAULT_WORKFLOW_FILTERS,
	state: 'open',
	lastRun: 'over12Months',
};

export const UNASSIGNED_OWNER = 'unassigned';
export const PERSONAL_PROJECTS = 'personal';

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

function matchesProject(
	workflow: BreakingChangeRuleDetailWorkflow,
	filter: ProjectFilter,
): boolean {
	if (filter === 'any') return true;
	if (filter === PERSONAL_PROJECTS) return workflow.homeProjectType === 'personal';
	return workflow.homeProjectId === filter;
}

function matchesState(state: FindingState, filter: StateFilter): boolean {
	if (filter === 'any') return true;
	return filter === 'open' ? isUnresolvedState(state) : state === filter;
}

/**
 * `state` is the state that the page shows. A migrated row shows as `migrated`,
 * so it matches no state filter.
 */
export function matchesWorkflowFilters(
	workflow: BreakingChangeRuleDetailWorkflow,
	filters: WorkflowFilters,
	now = Date.now(),
	state: FindingState = workflow.status,
): boolean {
	return (
		matchesState(state, filters.state) &&
		matchesAge(workflow.lastExecutedAt, filters.lastRun, now) &&
		matchesAge(workflow.lastUpdatedAt, filters.lastUpdated, now) &&
		matchesExecutions(workflow.numberOfExecutions, filters.executions) &&
		(filters.published === 'any' || workflow.active === (filters.published === 'published')) &&
		matchesOwner(workflow, filters.owner) &&
		matchesProject(workflow, filters.project) &&
		(filters.showArchived || !workflow.isArchived)
	);
}

/** The rows that match the name search and the filters. */
export function filterWorkflows(
	rows: BreakingChangeRuleDetailWorkflow[],
	query: string,
	filters: WorkflowFilters,
	context: MigrationContext,
	now = Date.now(),
): BreakingChangeRuleDetailWorkflow[] {
	const search = query.toLowerCase();
	return rows.filter(
		(row) =>
			(!search || row.name.toLowerCase().includes(search)) &&
			matchesWorkflowFilters(row, filters, now, findingState(row, context)),
	);
}

/** The counts on the quick filters. Won't fix counts as resolved, so `open` leaves it out. */
export function countQuickFilters(
	rows: BreakingChangeRuleDetailWorkflow[],
	context: MigrationContext,
	currentUserId: string | undefined,
) {
	return {
		assignedToMe: rows.filter((row) => row.owner?.id === currentUserId).length,
		open: rows.filter((row) => isUnresolved(row, context)).length,
		wontFix: rows.filter((row) => findingState(row, context) === 'wont_fix').length,
		unassigned: rows.filter((row) => !row.owner).length,
	};
}
