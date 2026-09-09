import { compareExecutionListItems } from '../compare-execution-list-items';

const item = (id: string) => ({ id });

describe('compareExecutionListItems', () => {
	it('puts the higher numeric id first', () => {
		expect(compareExecutionListItems(item('10'), item('9'))).toBeLessThan(0);
		expect(compareExecutionListItems(item('9'), item('10'))).toBeGreaterThan(0);
	});

	it('puts a v2 id before a numeric id', () => {
		const v2 = item('01917b3e-0000-7000-8000-000000000000');
		const numeric = item('999');

		expect(compareExecutionListItems(v2, numeric)).toBeLessThan(0);
		expect(compareExecutionListItems(numeric, v2)).toBeGreaterThan(0);
	});

	it('puts the higher v2 id first', () => {
		const lower = item('01917b3e-0000-7000-8000-000000000001');
		const higher = item('01917b3e-0000-7000-8000-000000000002');

		expect(compareExecutionListItems(higher, lower)).toBeLessThan(0);
		expect(compareExecutionListItems(lower, higher)).toBeGreaterThan(0);
	});

	it('returns 0 for the same id', () => {
		expect(compareExecutionListItems(item('7'), item('7'))).toBe(0);
	});

	it('sorts a mixed list newest first', () => {
		const items = [item('9'), item('11'), item('aaa-1'), item('10'), item('bbb-1')];

		expect([...items].sort(compareExecutionListItems).map((i) => i.id)).toEqual([
			'bbb-1',
			'aaa-1',
			'11',
			'10',
			'9',
		]);
	});
});
