import type { BreakingChangeRuleDetailWorkflow, BreakingChangeWorkflowOwner } from '@n8n/api-types';
import { TIME } from '@/app/constants';
import type { RowContext } from '../findingState';

export const now = new Date('2026-10-09T12:00:00Z').getTime();
export const daysAgo = (days: number) => new Date(now - days * TIME.DAY);

export const workflowRow = (
	overrides: Partial<BreakingChangeRuleDetailWorkflow> = {},
): BreakingChangeRuleDetailWorkflow => ({
	id: 'workflow-1',
	name: 'Workflow',
	active: true,
	numberOfExecutions: 10,
	lastUpdatedAt: daysAgo(1),
	lastExecutedAt: daysAgo(1),
	issues: [],
	status: 'open',
	isArchived: false,
	...overrides,
});

export const rowContext = (overrides: Partial<RowContext> = {}): RowContext => ({
	migratedIds: new Set(),
	savingIds: new Set(),
	notifyingIds: new Set(),
	...overrides,
});

export const owner = (
	id: string,
	overrides: Partial<BreakingChangeWorkflowOwner> = {},
): BreakingChangeWorkflowOwner => ({
	id,
	firstName: null,
	lastName: null,
	email: `${id}@example.com`,
	source: 'assigned',
	...overrides,
});
