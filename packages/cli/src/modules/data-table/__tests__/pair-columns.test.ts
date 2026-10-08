import { orderColumnRenames } from '../utils/pair-columns';

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
