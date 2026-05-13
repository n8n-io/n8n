import { compile } from '../../../engine/compiler';
import { lex } from '../../../engine/lexer';
import { parse } from '../../../engine/parser';
import type { SchemaMap } from '../../../engine/schema-map';
import { validate } from '../../../engine/validator';

const baseSchema = (overrides: Partial<SchemaMap> = {}): SchemaMap => ({
	dialect: 'postgresdb',
	resolveWorkflowId: () => null,
	hasReadAccess: (id) => ['wf-1', 'wf-2'].includes(id),
	accessibleWorkflowIds: ['wf-1', 'wf-2'],
	tablePrefix: '',
	...overrides,
});

const compileSql = (sql: string, schema: SchemaMap = baseSchema()) =>
	compile(validate(parse(lex(sql)), schema), schema);

describe.each(['postgresdb', 'sqlite'] as const)('workflows compiler (%s)', (dialect) => {
	const schema = (overrides: Partial<SchemaMap> = {}) => baseSchema({ dialect, ...overrides });

	// ---------------------------------------------------------------- Group 1
	describe('SELECT projection', () => {
		it('SELECT *', () => {
			expect(compileSql('SELECT * FROM workflows', schema())).toMatchSnapshot();
		});

		it('explicit columns', () => {
			expect(compileSql('SELECT id, name, createdAt FROM workflows', schema())).toMatchSnapshot();
		});

		it('COUNT(*)', () => {
			expect(compileSql('SELECT COUNT(*) FROM workflows', schema())).toMatchSnapshot();
		});

		it('mixed projection with GROUP BY', () => {
			expect(
				compileSql('SELECT active, COUNT(*) FROM workflows GROUP BY active', schema()),
			).toMatchSnapshot();
		});
	});

	// ---------------------------------------------------------------- Group 2
	describe('WHERE comparisons', () => {
		it.each(['=', '!=', '<>', '<', '>', '<=', '>='] as const)('operator %s', (op) => {
			expect(
				compileSql(`SELECT * FROM workflows WHERE createdAt ${op} '2024-01-01'`, schema()),
			).toMatchSnapshot();
		});
	});

	// ---------------------------------------------------------------- Group 3
	describe('WHERE composition', () => {
		it('AND', () => {
			expect(
				compileSql(
					"SELECT * FROM workflows WHERE name LIKE 'crm%' AND createdAt > '2024-01-01'",
					schema(),
				),
			).toMatchSnapshot();
		});

		it('OR', () => {
			expect(
				compileSql(
					"SELECT * FROM workflows WHERE name LIKE 'crm%' OR name LIKE 'sales%'",
					schema(),
				),
			).toMatchSnapshot();
		});

		it('NOT', () => {
			expect(
				compileSql("SELECT * FROM workflows WHERE NOT name LIKE 'archive%'", schema()),
			).toMatchSnapshot();
		});

		it('nested parens', () => {
			expect(
				compileSql(
					"SELECT * FROM workflows WHERE (name LIKE 'crm%' OR name LIKE 'sales%') AND createdAt > '2024-01-01'",
					schema(),
				),
			).toMatchSnapshot();
		});
	});

	// ---------------------------------------------------------------- Group 4
	describe('WHERE special predicates', () => {
		it('IN', () => {
			expect(
				compileSql("SELECT * FROM workflows WHERE id IN ('wf-1', 'wf-2', 'wf-3')", schema()),
			).toMatchSnapshot();
		});

		it('LIKE', () => {
			expect(
				compileSql("SELECT * FROM workflows WHERE name LIKE 'crm%'", schema()),
			).toMatchSnapshot();
		});

		it('IS NULL', () => {
			expect(
				compileSql('SELECT * FROM workflows WHERE updatedAt IS NULL', schema()),
			).toMatchSnapshot();
		});

		it('IS NOT NULL', () => {
			expect(
				compileSql('SELECT * FROM workflows WHERE updatedAt IS NOT NULL', schema()),
			).toMatchSnapshot();
		});
	});

	// ---------------------------------------------------------------- Group 5
	describe('GROUP BY + HAVING', () => {
		it('GROUP BY single column', () => {
			expect(
				compileSql('SELECT active, COUNT(*) FROM workflows GROUP BY active', schema()),
			).toMatchSnapshot();
		});

		it('HAVING aggregate compare', () => {
			expect(
				compileSql(
					'SELECT active, COUNT(*) FROM workflows GROUP BY active HAVING COUNT(*) > 5',
					schema(),
				),
			).toMatchSnapshot();
		});
	});

	// ---------------------------------------------------------------- Group 6
	describe('ORDER BY', () => {
		it('ASC default', () => {
			expect(compileSql('SELECT * FROM workflows ORDER BY name', schema())).toMatchSnapshot();
		});

		it('DESC explicit', () => {
			expect(
				compileSql('SELECT * FROM workflows ORDER BY createdAt DESC', schema()),
			).toMatchSnapshot();
		});

		it('multiple items', () => {
			expect(
				compileSql('SELECT * FROM workflows ORDER BY active DESC, name ASC', schema()),
			).toMatchSnapshot();
		});

		it('by aggregate', () => {
			expect(
				compileSql(
					'SELECT active, COUNT(*) FROM workflows GROUP BY active ORDER BY COUNT(*) DESC',
					schema(),
				),
			).toMatchSnapshot();
		});
	});

	// ---------------------------------------------------------------- Group 7
	describe('LIMIT', () => {
		it('explicit LIMIT', () => {
			expect(compileSql('SELECT * FROM workflows LIMIT 10', schema())).toMatchSnapshot();
		});

		it('default LIMIT applied when omitted', () => {
			expect(compileSql('SELECT * FROM workflows', schema())).toMatchSnapshot();
		});
	});

	// ---------------------------------------------------------------- Group 8
	describe('permission scope', () => {
		it('always includes id filter', () => {
			const result = compileSql('SELECT * FROM workflows', schema());
			expect(result.sql).toMatch(/w\."id" IN \(/);
		});

		it('emits 1=0 when accessible list is empty', () => {
			expect(
				compileSql('SELECT * FROM workflows', schema({ accessibleWorkflowIds: [] })),
			).toMatchSnapshot();
		});

		it('respects non-empty tablePrefix', () => {
			expect(
				compileSql('SELECT * FROM workflows', schema({ tablePrefix: 'n8n_' })),
			).toMatchSnapshot();
		});
	});

	// ---------------------------------------------------------------- Group 9
	describe('full integration', () => {
		it('realistic query', () => {
			expect(
				compileSql(
					"SELECT id, name FROM workflows WHERE name LIKE 'crm%' AND createdAt > '2024-01-01' ORDER BY createdAt DESC LIMIT 10",
					schema(),
				),
			).toMatchSnapshot();
		});
	});
});
