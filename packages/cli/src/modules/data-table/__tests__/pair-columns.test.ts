import { orderColumnRenames, pairDataTableColumns } from '../utils/pair-columns';

function orderRenames(columns: Array<[from: string, to: string, newType?: string]>) {
	const { ordered, blocked } = orderColumnRenames(
		columns.map(([from, to, newType = 'string']) => ({
			target: { name: from, type: 'string' },
			source: { name: to, type: newType },
		})),
	);
	const format = (pairs: typeof ordered) =>
		pairs.map(({ target, source }) => `${target.name}->${source.name}`);
	return { ordered: format(ordered), blocked: format(blocked) };
}

describe('orderColumnRenames', () => {
	it.each([
		{
			change: 'a swap',
			columns: [
				['a', 'b'],
				['b', 'a'],
			] as Array<[string, string]>,
			blocked: ['a->b', 'b->a'],
		},
		{
			change: 'a cycle',
			columns: [
				['a', 'b'],
				['b', 'c'],
				['c', 'a'],
			] as Array<[string, string]>,
			blocked: ['a->b', 'b->c', 'c->a'],
		},
		{
			change: 'a rename to a lower-case variant of another column',
			columns: [
				['a', 'b'],
				['B', 'B'],
			] as Array<[string, string]>,
			blocked: ['a->b'],
		},
		{
			change: 'a rename to an upper-case variant of another column',
			columns: [
				['a', 'B'],
				['b', 'b'],
			] as Array<[string, string]>,
			blocked: ['a->B'],
		},
	])('blocks $change', ({ columns, blocked }) => {
		expect(orderRenames(columns)).toEqual({ ordered: [], blocked });
	});

	it('blocks a rename to the name that a case-only rename keeps', () => {
		expect(
			orderRenames([
				['b', 'B'],
				['a', 'b'],
			]),
		).toEqual({ ordered: ['b->B'], blocked: ['a->b'] });
	});

	it('orders a chain of renames so that each new name is free', () => {
		expect(
			orderRenames([
				['a', 'b'],
				['b', 'c'],
			]),
		).toEqual({ ordered: ['b->c', 'a->b'], blocked: [] });
	});

	it('allows a rename to the name of a retyped column', () => {
		expect(
			orderRenames([
				['a', 'b'],
				['b', 'b', 'number'],
			]),
		).toEqual({ ordered: ['a->b'], blocked: [] });
	});

	it('allows a case-only rename', () => {
		expect(orderRenames([['foo', 'Foo']])).toEqual({ ordered: ['foo->Foo'], blocked: [] });
	});
});

describe('pairDataTableColumns', () => {
	it('pairs a column by id even when another column has its name', () => {
		const email = { id: 'c1', name: 'email' };
		const oldEmail = { id: 'c2', name: 'email' };
		const mail = { id: 'c1', name: 'mail' };

		expect(pairDataTableColumns([email], [oldEmail, mail])).toEqual({
			pairs: [{ source: email, target: mail }],
			added: [],
			removed: [oldEmail],
		});
	});

	it('pairs columns by name when they have no id or an id the target does not have', () => {
		const email = { name: 'email' };
		const age = { id: 'c9', name: 'age' };
		const targetEmail = { id: 'c1', name: 'email' };
		const targetAge = { id: 'c2', name: 'age' };

		expect(pairDataTableColumns([email, age], [targetEmail, targetAge])).toEqual({
			pairs: [
				{ source: email, target: targetEmail },
				{ source: age, target: targetAge },
			],
			added: [],
			removed: [],
		});
	});

	it('returns added columns in source order and removed columns in target order', () => {
		const kept = { id: 'c1', name: 'email' };
		const firstNew = { name: 'b' };
		const secondNew = { name: 'a' };
		const firstOld = { id: 'c3', name: 'y' };
		const secondOld = { id: 'c2', name: 'x' };

		expect(pairDataTableColumns([firstNew, kept, secondNew], [firstOld, kept, secondOld])).toEqual({
			pairs: [{ source: kept, target: kept }],
			added: [firstNew, secondNew],
			removed: [firstOld, secondOld],
		});
	});
});
