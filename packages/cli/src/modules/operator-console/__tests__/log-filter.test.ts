import type { OperatorLogFilter, OperatorLogRecord } from '@n8n/api-types';

import { compileFilter, matches, unionFilters } from '../producer/log-filter';

const record = (overrides: Partial<OperatorLogRecord> = {}): OperatorLogRecord => ({
	seq: 1,
	ts: '2026-08-12T10:00:00.000Z',
	hostId: 'main-abc',
	role: 'main',
	stream: 'log',
	level: 'info',
	origin: 'live',
	message: 'Workflow executed successfully',
	...overrides,
});

describe('matches', () => {
	describe('no constraints', () => {
		it('should admit every record when the filter is empty', () => {
			expect(matches(record(), {})).toBe(true);
			expect(matches(record({ level: 'debug', role: 'worker' }), {})).toBe(true);
		});
	});

	describe('minLevel', () => {
		test.each([
			['error', 'error', true],
			['error', 'warn', false],
			['error', 'info', false],
			['error', 'debug', false],
			['warn', 'error', true],
			['warn', 'warn', true],
			['warn', 'info', false],
			['warn', 'debug', false],
			['info', 'error', true],
			['info', 'warn', true],
			['info', 'info', true],
			['info', 'debug', false],
			['debug', 'error', true],
			['debug', 'warn', true],
			['debug', 'info', true],
			['debug', 'debug', true],
		] as const)('minLevel=%s should %s a %s record', (minLevel, level, expected) => {
			expect(matches(record({ level }), { minLevel })).toBe(expected);
		});

		it('should admit every level when minLevel is absent', () => {
			expect(matches(record({ level: 'debug' }), {})).toBe(true);
		});
	});

	describe('scopes', () => {
		it('should admit a record whose scope is listed', () => {
			expect(matches(record({ scope: 'scaling' }), { scopes: ['scaling', 'push'] })).toBe(true);
		});

		it('should reject a record whose scope is not listed', () => {
			expect(matches(record({ scope: 'push' }), { scopes: ['scaling'] })).toBe(false);
		});

		it('should reject an unscoped record when scopes are constrained', () => {
			expect(matches(record({ scope: undefined }), { scopes: ['scaling'] })).toBe(false);
		});

		it('should treat an empty scope list as unconstrained', () => {
			expect(matches(record({ scope: undefined }), { scopes: [] })).toBe(true);
		});
	});

	describe('hostIds', () => {
		it('should admit a listed host', () => {
			expect(matches(record({ hostId: 'worker-1' }), { hostIds: ['worker-1', 'worker-2'] })).toBe(
				true,
			);
		});

		it('should reject an unlisted host', () => {
			expect(matches(record({ hostId: 'worker-3' }), { hostIds: ['worker-1'] })).toBe(false);
		});

		it('should treat an empty host list as unconstrained', () => {
			expect(matches(record({ hostId: 'worker-3' }), { hostIds: [] })).toBe(true);
		});

		it('should match host ids exactly, not by prefix', () => {
			expect(matches(record({ hostId: 'worker-10' }), { hostIds: ['worker-1'] })).toBe(false);
		});
	});

	describe('roles', () => {
		it('should admit a listed role', () => {
			expect(matches(record({ role: 'webhook' }), { roles: ['webhook', 'worker'] })).toBe(true);
		});

		it('should reject an unlisted role', () => {
			expect(matches(record({ role: 'main' }), { roles: ['worker'] })).toBe(false);
		});

		it('should treat an empty role list as unconstrained', () => {
			expect(matches(record({ role: 'main' }), { roles: [] })).toBe(true);
		});
	});

	describe('executionId', () => {
		it('should admit an exact match', () => {
			expect(matches(record({ executionId: '1234' }), { executionId: '1234' })).toBe(true);
		});

		it('should reject a different execution', () => {
			expect(matches(record({ executionId: '1235' }), { executionId: '1234' })).toBe(false);
		});

		it('should reject a record with no execution when one is requested', () => {
			expect(matches(record({ executionId: undefined }), { executionId: '1234' })).toBe(false);
		});

		it('should not coerce numeric-looking ids', () => {
			expect(matches(record({ executionId: '01234' }), { executionId: '1234' })).toBe(false);
		});
	});

	describe('grep', () => {
		it('should match a substring', () => {
			expect(matches(record({ message: 'ECONNREFUSED on port 5678' }), { grep: 'ECONN' })).toBe(
				true,
			);
		});

		it('should be case-insensitive in both directions', () => {
			expect(matches(record({ message: 'ECONNREFUSED' }), { grep: 'econnrefused' })).toBe(true);
			expect(matches(record({ message: 'econnrefused' }), { grep: 'ECONNREFUSED' })).toBe(true);
		});

		it('should reject a non-match', () => {
			expect(matches(record({ message: 'all good' }), { grep: 'error' })).toBe(false);
		});

		it('should treat the needle as a literal, not a regex', () => {
			expect(matches(record({ message: 'a.c' }), { grep: 'a.c' })).toBe(true);
			expect(matches(record({ message: 'abc' }), { grep: 'a.c' })).toBe(false);
			expect(matches(record({ message: 'literal (parens)' }), { grep: '(parens)' })).toBe(true);
		});

		it('should treat an empty grep as unconstrained', () => {
			expect(matches(record({ message: 'anything' }), { grep: '' })).toBe(true);
		});

		it('should search the message only, not the metadata', () => {
			const withMeta = record({ message: 'request failed', meta: { url: 'https://acme.test' } });

			expect(matches(withMeta, { grep: 'acme.test' })).toBe(false);
			expect(matches(withMeta, { grep: 'request' })).toBe(true);
		});
	});

	describe('combined constraints', () => {
		const filter: OperatorLogFilter = {
			minLevel: 'warn',
			roles: ['worker'],
			grep: 'timeout',
		};

		it('should require every constraint to pass', () => {
			const passing = record({ level: 'error', role: 'worker', message: 'Timeout reached' });

			expect(matches(passing, filter)).toBe(true);
		});

		test.each([
			['level too low', { level: 'info' }],
			['wrong role', { role: 'main' }],
			['no grep hit', { message: 'all good' }],
		] as Array<[string, Partial<OperatorLogRecord>]>)(
			'should reject when one constraint fails (%s)',
			(_label, overrides) => {
				const candidate = record({
					level: 'error',
					role: 'worker',
					message: 'Timeout reached',
					...overrides,
				});

				expect(matches(candidate, filter)).toBe(false);
			},
		);
	});
});

describe('compileFilter', () => {
	it('should be reusable across records without leaking state', () => {
		const predicate = compileFilter({ grep: 'boom', minLevel: 'warn' });

		expect(predicate(record({ level: 'error', message: 'BOOM' }))).toBe(true);
		expect(predicate(record({ level: 'info', message: 'BOOM' }))).toBe(false);
		expect(predicate(record({ level: 'error', message: 'fine' }))).toBe(false);
		expect(predicate(record({ level: 'error', message: 'kaboom!' }))).toBe(true);
	});

	it('should not be affected by later mutation of the source filter', () => {
		const filter: OperatorLogFilter = { hostIds: ['worker-1'] };
		const predicate = compileFilter(filter);

		filter.hostIds?.push('worker-2');

		expect(predicate(record({ hostId: 'worker-2' }))).toBe(false);
	});
});

describe('unionFilters', () => {
	it('should drop a constraint that either side leaves open', () => {
		expect(unionFilters({ minLevel: 'error' }, {})).toEqual({});
		expect(unionFilters({ hostIds: ['a'] }, {})).toEqual({});
		expect(unionFilters({ grep: 'boom' }, {})).toEqual({});
	});

	it('should widen minLevel to the more permissive of the two', () => {
		expect(unionFilters({ minLevel: 'error' }, { minLevel: 'debug' })).toEqual({
			minLevel: 'debug',
		});
		expect(unionFilters({ minLevel: 'info' }, { minLevel: 'warn' })).toEqual({ minLevel: 'info' });
	});

	it('should union list constraints without duplicates', () => {
		expect(unionFilters({ hostIds: ['a', 'b'] }, { hostIds: ['b', 'c'] })).toEqual({
			hostIds: ['a', 'b', 'c'],
		});
		expect(unionFilters({ roles: ['main'] }, { roles: ['worker'] })).toEqual({
			roles: ['main', 'worker'],
		});
		expect(unionFilters({ scopes: ['scaling'] }, { scopes: ['push'] })).toEqual({
			scopes: ['scaling', 'push'],
		});
	});

	it('should treat an empty list as unconstrained', () => {
		expect(unionFilters({ hostIds: ['a'] }, { hostIds: [] })).toEqual({});
	});

	it('should keep scalar constraints only when both sides agree', () => {
		expect(unionFilters({ executionId: '1' }, { executionId: '1' })).toEqual({ executionId: '1' });
		expect(unionFilters({ executionId: '1' }, { executionId: '2' })).toEqual({});
		expect(unionFilters({ grep: 'Boom' }, { grep: 'boom' })).toEqual({ grep: 'Boom' });
		expect(unionFilters({ grep: 'boom' }, { grep: 'bang' })).toEqual({});
	});

	it('should admit everything either input admitted', () => {
		const a: OperatorLogFilter = { minLevel: 'error', roles: ['main'] };
		const b: OperatorLogFilter = { minLevel: 'debug', roles: ['worker'] };
		const union = compileFilter(unionFilters(a, b));

		const onlyA = record({ level: 'error', role: 'main' });
		const onlyB = record({ level: 'debug', role: 'worker' });

		expect(matches(onlyA, a)).toBe(true);
		expect(matches(onlyB, b)).toBe(true);
		expect(union(onlyA)).toBe(true);
		expect(union(onlyB)).toBe(true);
	});

	it('should be usable as a reducer over many sessions', () => {
		const filters: OperatorLogFilter[] = [
			{ minLevel: 'error', hostIds: ['a'] },
			{ minLevel: 'warn', hostIds: ['b'] },
			{ minLevel: 'info', hostIds: ['c'] },
		];

		expect(filters.reduce(unionFilters)).toEqual({ minLevel: 'info', hostIds: ['a', 'b', 'c'] });
	});
});
