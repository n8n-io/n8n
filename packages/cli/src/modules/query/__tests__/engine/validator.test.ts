import { ValidationError } from '../../engine/errors';
import { lex } from '../../engine/lexer';
import { parse } from '../../engine/parser';
import type { SchemaMap } from '../../engine/schema-map';
import { validate } from '../../engine/validator';

const baseSchema = (overrides: Partial<SchemaMap> = {}): SchemaMap => ({
	dialect: 'postgresdb',
	resolveWorkflowId: () => null,
	hasReadAccess: () => false,
	accessibleWorkflowIds: [],
	tablePrefix: '',
	...overrides,
});

const v = (sql: string, schema: SchemaMap = baseSchema()) => validate(parse(lex(sql)), schema);

const expectError = (fn: () => unknown, code: string, position?: number) => {
	let thrown: unknown;
	try {
		fn();
	} catch (err) {
		thrown = err;
	}
	expect(thrown).toBeInstanceOf(ValidationError);
	const expected: Record<string, unknown> = { code };
	if (position !== undefined) expected.position = position;
	expect(thrown).toMatchObject(expected);
};

describe('validator', () => {
	// ---------------------------------------------------------------- Group 1
	describe('dialect', () => {
		it('accepts postgresdb', () => {
			expect(() =>
				v('SELECT * FROM executions', baseSchema({ dialect: 'postgresdb' })),
			).not.toThrow();
		});

		it('accepts sqlite', () => {
			expect(() => v('SELECT * FROM executions', baseSchema({ dialect: 'sqlite' }))).not.toThrow();
		});

		it('rejects any other dialect with DB_UNSUPPORTED', () => {
			const schema = baseSchema({ dialect: 'mysql' as unknown as SchemaMap['dialect'] });
			expectError(() => v('SELECT * FROM executions', schema), 'DB_UNSUPPORTED');
		});
	});

	// ---------------------------------------------------------------- Group 2
	describe('system table names', () => {
		it('resolves executions', () => {
			expect(v('SELECT * FROM executions').source).toEqual({ kind: 'executions' });
		});

		it('resolves workflows', () => {
			expect(v('SELECT * FROM workflows').source).toEqual({ kind: 'workflows' });
		});

		it('rejects an unknown bare table name', () => {
			expectError(() => v('SELECT * FROM bogus'), 'UNKNOWN_SOURCE', 14);
		});
	});

	// ---------------------------------------------------------------- Group 3
	describe('executions field whitelist', () => {
		const known = [
			'id',
			'workflowId',
			'workflowName',
			'status',
			'mode',
			'startedAt',
			'stoppedAt',
			'duration_ms',
			'retryOf',
		];

		it.each(known)('accepts %s in SELECT', (col) => {
			expect(() => v(`SELECT ${col} FROM executions`)).not.toThrow();
		});

		it('rejects unknown column in SELECT', () => {
			expectError(() => v('SELECT bogus FROM executions'), 'UNKNOWN_FIELD', 7);
		});

		it('rejects unknown column in WHERE', () => {
			expectError(() => v("SELECT * FROM executions WHERE bogus = 'x'"), 'UNKNOWN_FIELD', 31);
		});

		it('rejects unknown column in GROUP BY', () => {
			expectError(() => v('SELECT status FROM executions GROUP BY bogus'), 'UNKNOWN_FIELD', 39);
		});

		it('rejects unknown column in ORDER BY', () => {
			expectError(() => v('SELECT * FROM executions ORDER BY bogus'), 'UNKNOWN_FIELD', 34);
		});
	});

	// ---------------------------------------------------------------- Group 4
	describe('workflows field whitelist', () => {
		const known = ['id', 'name', 'active', 'createdAt', 'updatedAt'];

		it.each(known)('accepts %s in SELECT', (col) => {
			expect(() => v(`SELECT ${col} FROM workflows`)).not.toThrow();
		});

		it('rejects unknown column in SELECT', () => {
			expectError(() => v('SELECT bogus FROM workflows'), 'UNKNOWN_FIELD');
		});
	});

	// ---------------------------------------------------------------- Group 5
	describe('nodeOutput source', () => {
		const wfSchema = baseSchema({
			resolveWorkflowId: (name) => (name === 'crm-sync' ? 'wf-123' : null),
			hasReadAccess: (id) => id === 'wf-123',
		});

		it('resolves nodeOutput when workflow exists and user has access', () => {
			expect(v("SELECT * FROM 'crm-sync'.'Get users'", wfSchema).source).toEqual({
				kind: 'nodeOutput',
				workflowId: 'wf-123',
				nodeName: 'Get users',
			});
		});

		it('rejects when workflow does not resolve', () => {
			expectError(() => v("SELECT * FROM 'unknown'.'Get users'", wfSchema), 'UNKNOWN_WORKFLOW', 14);
		});

		it('rejects when user lacks read access', () => {
			const schema = baseSchema({
				resolveWorkflowId: () => 'wf-123',
				hasReadAccess: () => false,
			});
			expectError(() => v("SELECT * FROM 'crm-sync'.'Get users'", schema), 'FORBIDDEN_WORKFLOW');
		});

		it('accepts arbitrary field names in SELECT for nodeOutput', () => {
			expect(() =>
				v("SELECT anything, _execution_id FROM 'crm-sync'.'Get users'", wfSchema),
			).not.toThrow();
		});

		it('accepts arbitrary field names in WHERE for nodeOutput', () => {
			expect(() =>
				v("SELECT * FROM 'crm-sync'.'Get users' WHERE arbitrary = 1", wfSchema),
			).not.toThrow();
		});
	});

	// ---------------------------------------------------------------- Group 6
	describe('aggregates', () => {
		it('accepts COUNT(*)', () => {
			expect(v('SELECT COUNT(*) FROM executions').select).toEqual([
				{ kind: 'aggregate', fn: 'count', arg: 'star', as: 'count' },
			]);
		});

		it('accepts SUM(duration_ms) on executions', () => {
			expect(v('SELECT SUM(duration_ms) FROM executions').select).toEqual([
				{ kind: 'aggregate', fn: 'sum', arg: 'duration_ms', as: 'sum_duration_ms' },
			]);
		});

		it.each(['count', 'sum', 'avg', 'min', 'max'] as const)(
			'accepts %s on a known column',
			(fn) => {
				expect(() => v(`SELECT ${fn.toUpperCase()}(duration_ms) FROM executions`)).not.toThrow();
			},
		);

		it('rejects aggregate of unknown column', () => {
			expectError(() => v('SELECT SUM(bogus) FROM executions'), 'UNKNOWN_FIELD', 11);
		});

		it('accepts aggregate of arbitrary field on nodeOutput', () => {
			const wfSchema = baseSchema({
				resolveWorkflowId: () => 'wf-123',
				hasReadAccess: () => true,
			});
			expect(() => v("SELECT SUM(anything) FROM 'crm-sync'.'Get users'", wfSchema)).not.toThrow();
		});

		it('numbers duplicate aggregate aliases', () => {
			expect(v('SELECT COUNT(*), COUNT(*) FROM executions').select).toEqual([
				{ kind: 'aggregate', fn: 'count', arg: 'star', as: 'count' },
				{ kind: 'aggregate', fn: 'count', arg: 'star', as: 'count_2' },
			]);
		});

		it('does not number distinct aggregates with distinct args', () => {
			expect(v('SELECT COUNT(*), COUNT(id) FROM executions').select).toEqual([
				{ kind: 'aggregate', fn: 'count', arg: 'star', as: 'count' },
				{ kind: 'aggregate', fn: 'count', arg: 'id', as: 'count_id' },
			]);
		});

		it('rejects aggregates in WHERE clause', () => {
			expectError(() => v('SELECT * FROM executions WHERE COUNT(*) > 5'), 'AGGREGATE_IN_WHERE');
		});
	});

	// ---------------------------------------------------------------- Group 7
	describe('window placement', () => {
		const wfSchema = baseSchema({
			resolveWorkflowId: () => 'wf-123',
			hasReadAccess: () => true,
		});

		it('accepts LAST on nodeOutput', () => {
			expect(v("SELECT * FROM 'crm-sync'.'Get users' LAST 10", wfSchema).window).toEqual({
				kind: 'last',
				n: 10,
			});
		});

		it('accepts SINCE on nodeOutput', () => {
			expect(v("SELECT * FROM 'crm-sync'.'Get users' SINCE '2024-01-01'", wfSchema).window).toEqual(
				{ kind: 'since', iso: '2024-01-01' },
			);
		});

		it('accepts EXECUTION on nodeOutput', () => {
			expect(v("SELECT * FROM 'crm-sync'.'Get users' EXECUTION 'abc'", wfSchema).window).toEqual({
				kind: 'execution',
				id: 'abc',
			});
		});

		it('rejects LAST on executions', () => {
			expectError(() => v('SELECT * FROM executions LAST 10'), 'INVALID_WINDOW');
		});

		it('rejects SINCE on workflows', () => {
			expectError(() => v("SELECT * FROM workflows SINCE '2024-01-01'"), 'INVALID_WINDOW');
		});
	});

	// ---------------------------------------------------------------- Group 8
	describe('IR shape — full integration', () => {
		it('produces correct IR for a complex executions query', () => {
			const ir = v(
				"SELECT status, COUNT(*) FROM executions WHERE startedAt > '2024-01-01' GROUP BY status HAVING COUNT(*) > 5 ORDER BY COUNT(*) DESC LIMIT 10",
			);

			expect(ir).toEqual({
				source: { kind: 'executions' },
				select: [
					{ kind: 'column', name: 'status' },
					{ kind: 'aggregate', fn: 'count', arg: 'star', as: 'count' },
				],
				filter: {
					kind: 'compare',
					op: '>',
					field: 'startedAt',
					value: '2024-01-01',
				},
				groupBy: ['status'],
				having: {
					kind: 'compare',
					op: '>',
					lhs: { kind: 'aggregate', fn: 'count', arg: 'star' },
					value: 5,
				},
				orderBy: [{ kind: 'aggregate', fn: 'count', arg: 'star', direction: 'desc' }],
				limit: 10,
			});
		});

		it('produces correct IR for a nodeOutput query', () => {
			const wfSchema = baseSchema({
				resolveWorkflowId: (name) => (name === 'crm-sync' ? 'wf-123' : null),
				hasReadAccess: () => true,
			});

			const ir = v(
				"SELECT name, salary FROM 'crm-sync'.'Get users' LAST 10 WHERE salary > 70000",
				wfSchema,
			);

			expect(ir).toEqual({
				source: { kind: 'nodeOutput', workflowId: 'wf-123', nodeName: 'Get users' },
				select: [
					{ kind: 'column', name: 'name' },
					{ kind: 'column', name: 'salary' },
				],
				filter: {
					kind: 'compare',
					op: '>',
					field: 'salary',
					value: 70000,
				},
				window: { kind: 'last', n: 10 },
			});
		});
	});
});
