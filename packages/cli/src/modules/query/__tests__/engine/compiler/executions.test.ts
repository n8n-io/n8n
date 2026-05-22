import { compile } from '../../../engine/compiler';
import { lex } from '../../../engine/lexer';
import { parse } from '../../../engine/parser';
import type { SchemaMap } from '../../../engine/schema-map';
import { validate } from '../../../engine/validator';

const baseSchema = (overrides: Partial<SchemaMap> = {}): SchemaMap => ({
	dialect: 'postgresdb',
	resolveWorkflowId: () => null,
	resolveNodeName: () => null,
	hasReadAccess: (id) => ['wf-1', 'wf-2'].includes(id),
	accessibleWorkflowIds: ['wf-1', 'wf-2'],
	tablePrefix: '',
	...overrides,
});

const compileSql = (sql: string, schema: SchemaMap = baseSchema()) =>
	compile(validate(parse(lex(sql)), schema), schema);

describe.each(['postgresdb', 'sqlite'] as const)('executions compiler (%s)', (dialect) => {
	const schema = (overrides: Partial<SchemaMap> = {}) => baseSchema({ dialect, ...overrides });

	// ---------------------------------------------------------------- Group 1
	describe('SELECT projection', () => {
		it('SELECT *', () => {
			expect(compileSql('SELECT * FROM executions', schema())).toMatchSnapshot();
		});

		it('explicit columns', () => {
			expect(
				compileSql('SELECT id, status, duration_ms FROM executions', schema()),
			).toMatchSnapshot();
		});

		it('COUNT(*)', () => {
			expect(compileSql('SELECT COUNT(*) FROM executions', schema())).toMatchSnapshot();
		});

		it('mixed projection with GROUP BY', () => {
			expect(
				compileSql('SELECT status, COUNT(*) FROM executions GROUP BY status', schema()),
			).toMatchSnapshot();
		});
	});

	// ---------------------------------------------------------------- Group 2
	describe('WHERE comparisons', () => {
		it.each(['=', '!=', '<>', '<', '>', '<=', '>='] as const)('operator %s', (op) => {
			expect(
				compileSql(`SELECT * FROM executions WHERE duration_ms ${op} 1000`, schema()),
			).toMatchSnapshot();
		});
	});

	// ---------------------------------------------------------------- Group 3
	describe('WHERE composition', () => {
		it('AND', () => {
			expect(
				compileSql(
					"SELECT * FROM executions WHERE status = 'error' AND mode = 'webhook'",
					schema(),
				),
			).toMatchSnapshot();
		});

		it('OR', () => {
			expect(
				compileSql(
					"SELECT * FROM executions WHERE status = 'error' OR status = 'crashed'",
					schema(),
				),
			).toMatchSnapshot();
		});

		it('NOT', () => {
			expect(
				compileSql("SELECT * FROM executions WHERE NOT status = 'success'", schema()),
			).toMatchSnapshot();
		});

		it('nested parens', () => {
			expect(
				compileSql(
					"SELECT * FROM executions WHERE (status = 'error' OR status = 'crashed') AND mode = 'webhook'",
					schema(),
				),
			).toMatchSnapshot();
		});
	});

	// ---------------------------------------------------------------- Group 4
	describe('WHERE special predicates', () => {
		it('IN', () => {
			expect(
				compileSql(
					"SELECT * FROM executions WHERE status IN ('error', 'crashed', 'failed')",
					schema(),
				),
			).toMatchSnapshot();
		});

		it('LIKE', () => {
			expect(
				compileSql("SELECT * FROM executions WHERE workflowName LIKE 'crm%'", schema()),
			).toMatchSnapshot();
		});

		it('IS NULL', () => {
			expect(
				compileSql('SELECT * FROM executions WHERE retryOf IS NULL', schema()),
			).toMatchSnapshot();
		});

		it('IS NOT NULL', () => {
			expect(
				compileSql('SELECT * FROM executions WHERE retryOf IS NOT NULL', schema()),
			).toMatchSnapshot();
		});
	});

	// ---------------------------------------------------------------- Group 5
	describe('GROUP BY + HAVING', () => {
		it('GROUP BY single column', () => {
			expect(
				compileSql('SELECT status, COUNT(*) FROM executions GROUP BY status', schema()),
			).toMatchSnapshot();
		});

		it('GROUP BY multiple columns', () => {
			expect(
				compileSql('SELECT status, mode, COUNT(*) FROM executions GROUP BY status, mode', schema()),
			).toMatchSnapshot();
		});

		it('HAVING aggregate compare', () => {
			expect(
				compileSql(
					'SELECT status, COUNT(*) FROM executions GROUP BY status HAVING COUNT(*) > 5',
					schema(),
				),
			).toMatchSnapshot();
		});
	});

	// ---------------------------------------------------------------- Group 6
	describe('ORDER BY', () => {
		it('ASC default', () => {
			expect(compileSql('SELECT * FROM executions ORDER BY startedAt', schema())).toMatchSnapshot();
		});

		it('DESC explicit', () => {
			expect(
				compileSql('SELECT * FROM executions ORDER BY startedAt DESC', schema()),
			).toMatchSnapshot();
		});

		it('multiple items', () => {
			expect(
				compileSql('SELECT * FROM executions ORDER BY startedAt DESC, duration_ms ASC', schema()),
			).toMatchSnapshot();
		});

		it('by aggregate', () => {
			expect(
				compileSql(
					'SELECT status, COUNT(*) FROM executions GROUP BY status ORDER BY COUNT(*) DESC',
					schema(),
				),
			).toMatchSnapshot();
		});
	});

	// ---------------------------------------------------------------- Group 7
	describe('LIMIT', () => {
		it('explicit LIMIT', () => {
			expect(compileSql('SELECT * FROM executions LIMIT 10', schema())).toMatchSnapshot();
		});

		it('default LIMIT applied when omitted', () => {
			expect(compileSql('SELECT * FROM executions', schema())).toMatchSnapshot();
		});
	});

	// ---------------------------------------------------------------- Group 8
	describe('permission scope', () => {
		it('always includes workflowId filter', () => {
			const result = compileSql('SELECT * FROM executions', schema());
			if (result.kind !== 'sql-only') throw new Error('expected sql-only');
			expect(result.sql).toMatch(/e\."workflowId" IN \(/);
		});

		it('emits 1=0 when accessible list is empty', () => {
			expect(
				compileSql('SELECT * FROM executions', schema({ accessibleWorkflowIds: [] })),
			).toMatchSnapshot();
		});

		it('respects non-empty tablePrefix', () => {
			expect(
				compileSql('SELECT * FROM executions', schema({ tablePrefix: 'n8n_' })),
			).toMatchSnapshot();
		});
	});

	// ---------------------------------------------------------------- Group 9
	describe('full integration', () => {
		it('realistic complex query', () => {
			expect(
				compileSql(
					"SELECT status, COUNT(*) FROM executions WHERE startedAt > '2024-01-01' GROUP BY status HAVING COUNT(*) > 5 ORDER BY COUNT(*) DESC LIMIT 10",
					schema(),
				),
			).toMatchSnapshot();
		});
	});
});
