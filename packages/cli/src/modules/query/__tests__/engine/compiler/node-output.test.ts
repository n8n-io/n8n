import { compile } from '../../../engine/compiler';
import { lex } from '../../../engine/lexer';
import { parse } from '../../../engine/parser';
import type { SchemaMap } from '../../../engine/schema-map';
import { validate } from '../../../engine/validator';

const baseSchema = (overrides: Partial<SchemaMap> = {}): SchemaMap => ({
	dialect: 'postgresdb',
	resolveWorkflowId: (n) => (n === 'crm' ? 'wf-1' : null),
	hasReadAccess: (id) => id === 'wf-1' || id === 'wf-2',
	accessibleWorkflowIds: ['wf-1', 'wf-2'],
	tablePrefix: '',
	...overrides,
});

const compileSql = (sql: string, schema: SchemaMap = baseSchema()) =>
	compile(validate(parse(lex(sql)), schema), schema);

describe.each(['postgresdb', 'sqlite'] as const)('node-output compiler (%s)', (dialect) => {
	const schema = (overrides: Partial<SchemaMap> = {}) => baseSchema({ dialect, ...overrides });

	// ---------------------------------------------------------------- Group 1
	describe('windows', () => {
		it('default LAST 10 when no window specified', () => {
			expect(compileSql("SELECT * FROM 'crm'.'node'", schema())).toMatchSnapshot();
		});

		it('explicit LAST 5', () => {
			expect(compileSql("SELECT * FROM 'crm'.'node' LAST 5", schema())).toMatchSnapshot();
		});

		it('SINCE date', () => {
			expect(
				compileSql("SELECT * FROM 'crm'.'node' SINCE '2024-01-01'", schema()),
			).toMatchSnapshot();
		});

		it('EXECUTION id', () => {
			expect(compileSql("SELECT * FROM 'crm'.'node' EXECUTION '42'", schema())).toMatchSnapshot();
		});
	});

	// ---------------------------------------------------------------- Group 2
	describe('residual ops', () => {
		it('passes filter through to residual', () => {
			const strategy = compileSql("SELECT * FROM 'crm'.'node' WHERE salary > 70000", schema());
			expect(strategy).toMatchSnapshot();
		});

		it('passes explicit projection through to residual', () => {
			expect(compileSql("SELECT name, salary FROM 'crm'.'node'", schema())).toMatchSnapshot();
		});

		it('passes order by through to residual', () => {
			expect(
				compileSql("SELECT * FROM 'crm'.'node' ORDER BY salary DESC", schema()),
			).toMatchSnapshot();
		});
	});

	// ---------------------------------------------------------------- Group 3
	describe('permission scope', () => {
		it('always includes accessible workflow ids in fetch SQL', () => {
			const strategy = compileSql("SELECT * FROM 'crm'.'node'", schema());
			if (strategy.kind !== 'sql+js') throw new Error('expected sql+js');
			expect(strategy.fetch.sql).toMatch(/e\."workflowId" IN \(/);
		});

		it('emits 1=0 when accessible list is empty', () => {
			// The user can't reach this state in practice (validator would reject the
			// workflow as unknown), but the compiler defends regardless.
			expect(
				compileSql("SELECT * FROM 'crm'.'node'", schema({ accessibleWorkflowIds: [] })),
			).toMatchSnapshot();
		});
	});

	// ---------------------------------------------------------------- Group 4
	describe('table prefix', () => {
		it('respects non-empty tablePrefix', () => {
			expect(
				compileSql("SELECT * FROM 'crm'.'node'", schema({ tablePrefix: 'n8n_' })),
			).toMatchSnapshot();
		});
	});

	// ---------------------------------------------------------------- Group 5
	describe('LIMIT', () => {
		it('explicit user LIMIT goes into strategy.limit (output rows), not the fetch SQL', () => {
			const strategy = compileSql("SELECT * FROM 'crm'.'node' LIMIT 50", schema());
			if (strategy.kind !== 'sql+js') throw new Error('expected sql+js');
			expect(strategy.limit).toBe(50);
			// LAST default still drives execution LIMIT inside the SQL
			expect(strategy.fetch.sql).toMatch(/LIMIT 10$/);
		});
	});
});
