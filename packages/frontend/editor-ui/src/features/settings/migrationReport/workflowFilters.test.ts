import type { BreakingChangeRuleDetailWorkflow } from '@n8n/api-types';
import { TIME } from '@/app/constants';
import {
	countActiveFilters,
	DEFAULT_WORKFLOW_FILTERS,
	matchesWorkflowFilters,
	type WorkflowFilters,
} from './workflowFilters';

const now = new Date('2026-10-09T12:00:00Z').getTime();
const daysAgo = (days: number) => new Date(now - days * TIME.DAY);

const workflow = (
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
	...overrides,
});

const matches = (item: BreakingChangeRuleDetailWorkflow, filters: Partial<WorkflowFilters>) =>
	matchesWorkflowFilters(item, { ...DEFAULT_WORKFLOW_FILTERS, ...filters }, now);

describe('workflowFilters', () => {
	it('should match every workflow with the default filters', () => {
		expect(matches(workflow({ lastExecutedAt: undefined }), {})).toBe(true);
	});

	it.each([
		['under30Days', 29, true],
		['under30Days', 31, false],
		['under6Months', 150, true],
		['under6Months', 200, false],
		['over12Months', 400, true],
		['over12Months', 300, false],
	] as const)('should filter the last run by %s (%i days ago: %s)', (lastRun, days, expected) => {
		expect(matches(workflow({ lastExecutedAt: daysAgo(days) }), { lastRun })).toBe(expected);
	});

	it('should match a workflow that never ran only with any last run', () => {
		const neverRan = workflow({ lastExecutedAt: undefined });
		expect(matches(neverRan, { lastRun: 'over12Months' })).toBe(false);
		expect(matches(neverRan, { lastRun: 'under30Days' })).toBe(false);
	});

	it('should filter the last update', () => {
		const stale = workflow({ lastUpdatedAt: daysAgo(400) });
		expect(matches(stale, { lastUpdated: 'over12Months' })).toBe(true);
		expect(matches(stale, { lastUpdated: 'under30Days' })).toBe(false);
	});

	it.each([
		['none', 0, true],
		['none', 1, false],
		['under100', 99, true],
		['under100', 100, false],
		['over1000', 1001, true],
		['over1000', 1000, false],
	] as const)('should filter the executions by %s (%i: %s)', (executions, count, expected) => {
		expect(matches(workflow({ numberOfExecutions: count }), { executions })).toBe(expected);
	});

	it('should filter the publish state', () => {
		expect(matches(workflow({ active: true }), { published: 'published' })).toBe(true);
		expect(matches(workflow({ active: true }), { published: 'notPublished' })).toBe(false);
		expect(matches(workflow({ active: false }), { published: 'notPublished' })).toBe(true);
	});

	it('should filter the owner by id or by no owner', () => {
		const owner = {
			id: 'user-1',
			firstName: 'Ada',
			lastName: null,
			email: null,
			source: 'assigned' as const,
		};
		expect(matches(workflow({ owner }), { owner: 'user-1' })).toBe(true);
		expect(matches(workflow({ owner }), { owner: 'user-2' })).toBe(false);
		expect(matches(workflow({ owner }), { owner: 'unassigned' })).toBe(false);
		expect(matches(workflow(), { owner: 'unassigned' })).toBe(true);
	});

	it('should count the filters that differ from the default', () => {
		expect(countActiveFilters(DEFAULT_WORKFLOW_FILTERS)).toBe(0);
		expect(
			countActiveFilters({ ...DEFAULT_WORKFLOW_FILTERS, owner: 'user-1', executions: 'none' }),
		).toBe(2);
	});
});
