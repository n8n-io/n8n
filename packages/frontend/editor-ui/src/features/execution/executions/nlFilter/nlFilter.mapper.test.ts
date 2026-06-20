import { aiResponseToExecutionFilter } from './nlFilter.mapper';
import { getDefaultExecutionFilters } from '../executions.utils';

describe('aiResponseToExecutionFilter', () => {
	const workflows = [
		{ id: 'wf-1', name: 'Daily Report' },
		{ id: 'wf-2', name: 'Slack notifier' },
	];

	it('returns the default filter for an empty AI response', () => {
		const result = aiResponseToExecutionFilter({}, workflows);
		expect(result).toEqual(getDefaultExecutionFilters());
	});

	it('passes status through directly when valid', () => {
		const result = aiResponseToExecutionFilter({ status: 'error' }, workflows);
		expect(result.status).toBe('error');
	});

	it('passes workflowId through directly when present in the inventory', () => {
		const result = aiResponseToExecutionFilter({ workflowId: 'wf-1' }, workflows);
		expect(result.workflowId).toBe('wf-1');
	});

	it('ignores a workflowId not in the inventory', () => {
		const result = aiResponseToExecutionFilter({ workflowId: 'unknown' }, workflows);
		expect(result.workflowId).toBe('all');
	});

	it('resolves workflowName (case-insensitive) to a workflowId from the inventory', () => {
		const result = aiResponseToExecutionFilter({ workflowName: 'daily report' }, workflows);
		expect(result.workflowId).toBe('wf-1');
	});

	it('ignores a workflowName with no match', () => {
		const result = aiResponseToExecutionFilter({ workflowName: 'nope' }, workflows);
		expect(result.workflowId).toBe('all');
	});

	it('maps startedAfter / startedBefore into startDate / endDate', () => {
		const result = aiResponseToExecutionFilter(
			{ startedAfter: '2026-05-12T00:00:00.000Z', startedBefore: '2026-05-13T00:00:00.000Z' },
			workflows,
		);
		expect(result.startDate).toBe('2026-05-12T00:00:00.000Z');
		expect(result.endDate).toBe('2026-05-13T00:00:00.000Z');
	});

	it('drops a non-ISO startedAfter (silent ignore, no crash)', () => {
		const result = aiResponseToExecutionFilter({ startedAfter: 'yesterday' }, workflows);
		expect(result.startDate).toBe('');
	});
});
