import type { RandomShape } from '../specialise.ts';
import { withoutRandomValues } from './verify.ts';

const A = '11111111-2222-4333-8444-555555555555';
const B = 'aaaaaaaa-bbbb-4ccc-9ddd-eeeeeeeeeeee';
const C = '01234567-89ab-4cde-bf01-23456789abcd';
const V1 = 'fedcba98-7654-4321-a987-6543210fedcb';
const UUID: RandomShape[] = [{ kind: 'uuid' }];
const INTEGER: RandomShape[] = [{ kind: 'integer', min: 0, max: 100 }];

function same(mine: unknown, theirs: unknown, others: unknown[], shapes: RandomShape[]): boolean {
	const pair = withoutRandomValues(mine, theirs, others, shapes);
	return JSON.stringify(pair.mine) === JSON.stringify(pair.theirs);
}

describe('the comparison of random values with v1', () => {
	it('accepts another UUID at a position where the compiled node used the random source', () => {
		const request = (key: string) => [{ url: 'https://example.test/', headers: { 'x-key': key } }];
		expect(same(request(A), request(V1), [request(B), request(C)], UUID)).toBe(true);
	});

	it('accepts a UUID inside a text when the other characters are equal', () => {
		expect(
			same(`{"key":"${A}","n":1}`, `{"key":"${V1}","n":1}`, [`{"key":"${B}","n":1}`], UUID),
		).toBe(true);
		expect(
			same(`{"key":"${A}","n":1}`, `{"key":"${V1}","n":2}`, [`{"key":"${B}","n":1}`], UUID),
		).toBe(false);
	});

	it('refuses a difference at a position that does not change with the seed', () => {
		expect(same({ key: A, id: A }, { key: V1, id: V1 }, [{ key: B, id: A }], UUID)).toBe(false);
	});

	it('refuses a v1 value that is not a version 4 UUID', () => {
		const version1 = 'fedcba98-7654-1321-a987-6543210fedcb';
		const variant = 'fedcba98-7654-4321-c987-6543210fedcb';
		for (const theirs of [version1, variant, V1.toUpperCase(), V1.slice(1), '<random uuid>', 7]) {
			expect(same({ key: A }, { key: theirs }, [{ key: B }], UUID)).toBe(false);
		}
	});

	it('refuses a UUID when the module makes none', () => {
		expect(same({ key: A }, { key: V1 }, [{ key: B }], INTEGER)).toBe(false);
		expect(same({ key: A }, { key: V1 }, [{ key: B }], [])).toBe(false);
	});

	it('accepts an integer of the same range', () => {
		expect(same({ id: 12 }, { id: 99 }, [{ id: 40 }], INTEGER)).toBe(true);
		expect(same({ id: 12 }, { id: 0 }, [{ id: 40 }], INTEGER)).toBe(true);
	});

	it('refuses an integer outside the range, and a value that is not an integer', () => {
		for (const theirs of [100, -1, 1.5, '12', null]) {
			expect(same({ id: 12 }, { id: theirs }, [{ id: 40 }], INTEGER)).toBe(false);
		}
	});

	it('refuses an integer when the range is not known at compile time', () => {
		expect(same({ id: 12 }, { id: 13 }, [{ id: 40 }], [{ kind: 'integer' }])).toBe(false);
		expect(same({ id: 0.25 }, { id: 0.5 }, [{ id: 0.75 }], [{ kind: 'number' }])).toBe(false);
	});

	it('uses the smallest range when the values fit more than one range', () => {
		const two: RandomShape[] = [
			{ kind: 'integer', min: 0, max: 10 },
			{ kind: 'integer', min: 0, max: 100 },
		];
		expect(same({ id: 3 }, { id: 57 }, [{ id: 4 }], two)).toBe(false);
		expect(same({ id: 3 }, { id: 9 }, [{ id: 4 }], two)).toBe(true);
		expect(same({ id: 30 }, { id: 57 }, [{ id: 4 }], two)).toBe(true);
	});

	it('keeps each other difference', () => {
		expect(same({ key: A, n: 1 }, { key: V1, n: 2 }, [{ key: B, n: 1 }], UUID)).toBe(false);
		expect(same({ key: A }, { key: V1, more: 1 }, [{ key: B }], UUID)).toBe(false);
		expect(same([{ key: A }], [{ key: V1 }, { key: V1 }], [[{ key: B }]], UUID)).toBe(false);
		expect(
			same({ key: A, a: 1, b: 2 }, { key: V1, b: 2, a: 1 }, [{ key: B, a: 1, b: 2 }], UUID),
		).toBe(false);
	});

	it('changes nothing when the runs with other seeds are equal', () => {
		const pair = withoutRandomValues({ key: A }, { key: V1 }, [{ key: A }], UUID);
		expect(pair).toEqual({ mine: { key: A }, theirs: { key: V1 } });
	});
});
