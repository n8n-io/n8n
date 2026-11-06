import { sortOptionFor, sortWorkflows } from './workflowSort';
import { daysAgo, owner, workflowRow } from './__tests__/workflowRow';

const names = (rows: Array<{ name: string }>) => rows.map((row) => row.name);

describe('workflowSort', () => {
	it('should find the option that describes the sort', () => {
		expect(sortOptionFor([{ id: 'numberOfExecutions', desc: false }])).toBe('fewestRuns');
		expect(sortOptionFor([{ id: 'name', desc: true }])).toBe('nameDesc');
	});

	it('should find no option for a sort that only a column header sets', () => {
		expect(sortOptionFor([{ id: 'owner', desc: false }])).toBeUndefined();
		expect(sortOptionFor([])).toBeUndefined();
	});

	it('should keep the order without a sort', () => {
		const rows = [workflowRow({ name: 'b' }), workflowRow({ name: 'a' })];

		expect(sortWorkflows(rows, [], 'Unassigned')).toBe(rows);
	});

	it('should sort names without regard to case', () => {
		const rows = [
			workflowRow({ name: 'Gamma' }),
			workflowRow({ name: 'alpha' }),
			workflowRow({ name: 'Beta' }),
		];

		// A case-sensitive sort would put `alpha` last, after the capitals.
		expect(names(sortWorkflows(rows, [{ id: 'name', desc: false }], 'Unassigned'))).toEqual([
			'alpha',
			'Beta',
			'Gamma',
		]);
	});

	it('should sort a workflow that never ran as the oldest', () => {
		const rows = [
			workflowRow({ name: 'never', lastExecutedAt: undefined }),
			workflowRow({ name: 'recent', lastExecutedAt: daysAgo(1) }),
			workflowRow({ name: 'old', lastExecutedAt: daysAgo(30) }),
		];

		expect(
			names(sortWorkflows(rows, [{ id: 'lastExecutedAt', desc: true }], 'Unassigned')),
		).toEqual(['recent', 'old', 'never']);
	});

	it('should sort owners by the label that the cell shows', () => {
		const rows = [
			workflowRow({ name: 'grace', owner: owner('grace', { firstName: 'Grace' }) }),
			workflowRow({ name: 'unassigned' }),
			workflowRow({ name: 'ada', owner: owner('ada', { firstName: 'Ada' }) }),
		];

		expect(names(sortWorkflows(rows, [{ id: 'owner', desc: false }], 'Unassigned'))).toEqual([
			'ada',
			'grace',
			'unassigned',
		]);
	});

	it('should sort run counts as numbers', () => {
		const rows = [
			workflowRow({ name: 'nine', numberOfExecutions: 9 }),
			workflowRow({ name: 'hundred', numberOfExecutions: 100 }),
		];

		expect(
			names(sortWorkflows(rows, [{ id: 'numberOfExecutions', desc: true }], 'Unassigned')),
		).toEqual(['hundred', 'nine']);
	});
});
