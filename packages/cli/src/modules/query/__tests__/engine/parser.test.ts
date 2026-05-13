import { ParseError } from '../../engine/errors';
import { lex } from '../../engine/lexer';
import { parse } from '../../engine/parser';

const p = (sql: string) => parse(lex(sql));

describe('parser', () => {
	// ---------------------------------------------------------------- Group 1
	describe('SELECT projection', () => {
		it('parses SELECT *', () => {
			expect(p('SELECT * FROM executions')).toEqual({
				kind: 'Select',
				columns: [{ kind: 'star' }],
				from: { source: { kind: 'systemTable', name: 'executions', position: 14 } },
			});
		});

		it('parses a single column', () => {
			expect(p('SELECT status FROM executions')).toMatchObject({
				columns: [{ kind: 'column', ref: { name: 'status' } }],
			});
		});

		it('parses multiple columns', () => {
			const ast = p('SELECT a, b, c FROM executions');
			expect(ast.columns).toHaveLength(3);
			expect(ast.columns).toMatchObject([
				{ kind: 'column', ref: { name: 'a' } },
				{ kind: 'column', ref: { name: 'b' } },
				{ kind: 'column', ref: { name: 'c' } },
			]);
		});

		it('parses COUNT(*)', () => {
			expect(p('SELECT COUNT(*) FROM executions')).toMatchObject({
				columns: [{ kind: 'aggregate', fn: 'count', arg: 'star' }],
			});
		});

		it.each(['count', 'sum', 'avg', 'min', 'max'] as const)('parses %s(col) aggregate', (fn) => {
			expect(p(`SELECT ${fn.toUpperCase()}(duration_ms) FROM executions`)).toMatchObject({
				columns: [{ kind: 'aggregate', fn, arg: { name: 'duration_ms' } }],
			});
		});

		it('parses a mixed projection (aggregates + columns)', () => {
			const ast = p('SELECT AVG(duration_ms), status, COUNT(*) FROM executions');
			expect(ast.columns).toHaveLength(3);
			expect(ast.columns).toMatchObject([
				{ kind: 'aggregate', fn: 'avg', arg: { name: 'duration_ms' } },
				{ kind: 'column', ref: { name: 'status' } },
				{ kind: 'aggregate', fn: 'count', arg: 'star' },
			]);
		});
	});

	// ---------------------------------------------------------------- Group 2
	describe('FROM source', () => {
		it('parses an unquoted system table', () => {
			expect(p('SELECT * FROM executions')).toMatchObject({
				from: { source: { kind: 'systemTable', name: 'executions' } },
			});
		});

		it('parses the workflows system table', () => {
			expect(p('SELECT * FROM workflows')).toMatchObject({
				from: { source: { kind: 'systemTable', name: 'workflows' } },
			});
		});

		it('parses a nodeOutput source', () => {
			expect(p("SELECT * FROM 'crm-sync'.'Get users'")).toMatchObject({
				from: {
					source: { kind: 'nodeOutput', workflow: 'crm-sync', node: 'Get users' },
				},
			});
		});

		it('tolerates spaces and punctuation in quoted names', () => {
			expect(p("SELECT * FROM 'wf, with: punct'.'node-name'")).toMatchObject({
				from: {
					source: {
						kind: 'nodeOutput',
						workflow: 'wf, with: punct',
						node: 'node-name',
					},
				},
			});
		});
	});

	// ---------------------------------------------------------------- Group 3
	describe('windows', () => {
		it('parses LAST <n>', () => {
			expect(p("SELECT * FROM 'wf'.'node' LAST 10")).toMatchObject({
				from: { window: { kind: 'last', n: 10 } },
			});
		});

		it('parses SINCE <date>', () => {
			expect(p("SELECT * FROM 'wf'.'node' SINCE '2024-01-01'")).toMatchObject({
				from: { window: { kind: 'since', iso: '2024-01-01' } },
			});
		});

		it('parses EXECUTION <id>', () => {
			expect(p("SELECT * FROM 'wf'.'node' EXECUTION 'abc123'")).toMatchObject({
				from: { window: { kind: 'execution', id: 'abc123' } },
			});
		});

		it('leaves window undefined when absent', () => {
			const ast = p("SELECT * FROM 'wf'.'node'");
			expect(ast.from.window).toBeUndefined();
		});
	});

	// ---------------------------------------------------------------- Group 4
	describe('WHERE — basics', () => {
		it.each(['=', '!=', '<>', '<', '>', '<=', '>='] as const)('parses %s comparison', (op) => {
			expect(p(`SELECT * FROM executions WHERE x ${op} 5`)).toMatchObject({
				where: {
					kind: 'compare',
					op,
					left: { kind: 'column', ref: { name: 'x' } },
					right: { value: 5 },
				},
			});
		});

		it('parses a column-vs-string comparison', () => {
			expect(p("SELECT * FROM executions WHERE status = 'error'")).toMatchObject({
				where: {
					kind: 'compare',
					op: '=',
					left: { kind: 'column', ref: { name: 'status' } },
					right: { value: 'error' },
				},
			});
		});
	});

	// ---------------------------------------------------------------- Group 5
	describe('WHERE — boolean composition', () => {
		it('parses AND', () => {
			expect(p('SELECT * FROM executions WHERE a = 1 AND b = 2')).toMatchObject({
				where: {
					kind: 'and',
					left: { kind: 'compare', left: { ref: { name: 'a' } }, right: { value: 1 } },
					right: { kind: 'compare', left: { ref: { name: 'b' } }, right: { value: 2 } },
				},
			});
		});

		it('parses OR', () => {
			expect(p('SELECT * FROM executions WHERE a = 1 OR b = 2')).toMatchObject({
				where: {
					kind: 'or',
					left: { kind: 'compare' },
					right: { kind: 'compare' },
				},
			});
		});

		it('binds AND tighter than OR (a AND b OR c → (a AND b) OR c)', () => {
			expect(p('SELECT * FROM executions WHERE a = 1 AND b = 2 OR c = 3')).toMatchObject({
				where: {
					kind: 'or',
					left: {
						kind: 'and',
						left: { kind: 'compare', left: { ref: { name: 'a' } } },
						right: { kind: 'compare', left: { ref: { name: 'b' } } },
					},
					right: { kind: 'compare', left: { ref: { name: 'c' } } },
				},
			});
		});

		it('binds AND tighter than OR (a OR b AND c → a OR (b AND c))', () => {
			expect(p('SELECT * FROM executions WHERE a = 1 OR b = 2 AND c = 3')).toMatchObject({
				where: {
					kind: 'or',
					left: { kind: 'compare', left: { ref: { name: 'a' } } },
					right: {
						kind: 'and',
						left: { kind: 'compare', left: { ref: { name: 'b' } } },
						right: { kind: 'compare', left: { ref: { name: 'c' } } },
					},
				},
			});
		});

		it('parses NOT', () => {
			expect(p("SELECT * FROM executions WHERE NOT status = 'success'")).toMatchObject({
				where: {
					kind: 'not',
					arg: { kind: 'compare', left: { ref: { name: 'status' } } },
				},
			});
		});

		it('parens override precedence: (a OR b) AND c → AND at root', () => {
			expect(p('SELECT * FROM executions WHERE (a = 1 OR b = 2) AND c = 3')).toMatchObject({
				where: {
					kind: 'and',
					left: { kind: 'or' },
					right: { kind: 'compare', left: { ref: { name: 'c' } } },
				},
			});
		});
	});

	// ---------------------------------------------------------------- Group 6
	describe('WHERE — special predicates', () => {
		it('parses IS NULL', () => {
			expect(p('SELECT * FROM executions WHERE error IS NULL')).toMatchObject({
				where: { kind: 'isNull', arg: { name: 'error' } },
			});
		});

		it('parses IS NOT NULL', () => {
			expect(p('SELECT * FROM executions WHERE error IS NOT NULL')).toMatchObject({
				where: { kind: 'isNotNull', arg: { name: 'error' } },
			});
		});

		it('parses IN with a single value', () => {
			expect(p("SELECT * FROM executions WHERE status IN ('error')")).toMatchObject({
				where: {
					kind: 'in',
					left: { name: 'status' },
					values: [{ value: 'error' }],
				},
			});
		});

		it('parses IN with multiple values', () => {
			expect(
				p("SELECT * FROM executions WHERE status IN ('error', 'crashed', 'failed')"),
			).toMatchObject({
				where: {
					kind: 'in',
					left: { name: 'status' },
					values: [{ value: 'error' }, { value: 'crashed' }, { value: 'failed' }],
				},
			});
		});

		it('parses LIKE', () => {
			expect(p("SELECT * FROM workflows WHERE name LIKE 'crm%'")).toMatchObject({
				where: {
					kind: 'like',
					left: { name: 'name' },
					pattern: 'crm%',
				},
			});
		});
	});

	// ---------------------------------------------------------------- Group 7
	describe('GROUP BY', () => {
		it('parses a single column', () => {
			expect(p('SELECT status FROM executions GROUP BY status')).toMatchObject({
				groupBy: [{ name: 'status' }],
			});
		});

		it('parses multiple columns', () => {
			const ast = p('SELECT * FROM executions GROUP BY status, mode');
			expect(ast.groupBy).toHaveLength(2);
			expect(ast.groupBy).toMatchObject([{ name: 'status' }, { name: 'mode' }]);
		});
	});

	// ---------------------------------------------------------------- Group 8
	describe('HAVING', () => {
		it('parses HAVING with an aggregate comparison', () => {
			expect(p('SELECT status FROM executions GROUP BY status HAVING COUNT(*) > 5')).toMatchObject({
				having: {
					kind: 'compare',
					op: '>',
					left: { kind: 'aggregate', fn: 'count', arg: 'star' },
					right: { value: 5 },
				},
			});
		});
	});

	// ---------------------------------------------------------------- Group 9
	describe('ORDER BY', () => {
		it('defaults to ascending', () => {
			expect(p('SELECT * FROM executions ORDER BY startedAt')).toMatchObject({
				orderBy: [{ expr: { kind: 'column', ref: { name: 'startedAt' } }, direction: 'asc' }],
			});
		});

		it('parses explicit DESC', () => {
			expect(p('SELECT * FROM executions ORDER BY startedAt DESC')).toMatchObject({
				orderBy: [{ direction: 'desc' }],
			});
		});

		it('parses explicit ASC', () => {
			expect(p('SELECT * FROM executions ORDER BY startedAt ASC')).toMatchObject({
				orderBy: [{ direction: 'asc' }],
			});
		});

		it('parses multiple ordering items', () => {
			const ast = p('SELECT * FROM executions ORDER BY startedAt DESC, duration ASC');
			expect(ast.orderBy).toHaveLength(2);
			expect(ast.orderBy).toMatchObject([
				{ expr: { ref: { name: 'startedAt' } }, direction: 'desc' },
				{ expr: { ref: { name: 'duration' } }, direction: 'asc' },
			]);
		});

		it('parses ordering by an aggregate', () => {
			expect(
				p('SELECT status FROM executions GROUP BY status ORDER BY COUNT(*) DESC'),
			).toMatchObject({
				orderBy: [
					{
						expr: { kind: 'aggregate', fn: 'count', arg: 'star' },
						direction: 'desc',
					},
				],
			});
		});
	});

	// ---------------------------------------------------------------- Group 10
	describe('LIMIT', () => {
		it('parses LIMIT <n>', () => {
			expect(p('SELECT * FROM executions LIMIT 100')).toMatchObject({
				limit: 100,
			});
		});
	});

	// ---------------------------------------------------------------- Group 11
	describe('full integration', () => {
		it('parses a realistic statement', () => {
			const sql =
				"SELECT status, COUNT(*) FROM executions WHERE startedAt > '2024-01-01' GROUP BY status HAVING COUNT(*) > 5 ORDER BY COUNT(*) DESC LIMIT 10";

			const ast = p(sql);

			expect(ast.kind).toBe('Select');
			expect(ast.columns).toMatchObject([
				{ kind: 'column', ref: { name: 'status' } },
				{ kind: 'aggregate', fn: 'count', arg: 'star' },
			]);
			expect(ast.from.source).toMatchObject({
				kind: 'systemTable',
				name: 'executions',
			});
			expect(ast.where).toMatchObject({
				kind: 'compare',
				op: '>',
				left: { ref: { name: 'startedAt' } },
				right: { value: '2024-01-01' },
			});
			expect(ast.groupBy).toMatchObject([{ name: 'status' }]);
			expect(ast.having).toMatchObject({
				kind: 'compare',
				op: '>',
				left: { kind: 'aggregate', fn: 'count' },
				right: { value: 5 },
			});
			expect(ast.orderBy).toMatchObject([
				{ expr: { kind: 'aggregate', fn: 'count' }, direction: 'desc' },
			]);
			expect(ast.limit).toBe(10);
		});
	});

	// ---------------------------------------------------------------- Group 12
	describe('general parse errors', () => {
		const expectParseError = (sql: string, expected: Partial<{ position: number }> = {}) => {
			let thrown: unknown;
			try {
				p(sql);
			} catch (err) {
				thrown = err;
			}
			expect(thrown).toBeInstanceOf(ParseError);
			expect(thrown).toMatchObject({ code: 'PARSE_ERROR', ...expected });
		};

		it('errors on missing projection (SELECT FROM ...)', () => {
			expectParseError('SELECT FROM executions');
		});

		it('errors on missing FROM clause', () => {
			expectParseError('SELECT *');
		});

		it('errors on incomplete WHERE', () => {
			expectParseError('SELECT * FROM executions WHERE');
		});

		it('errors on trailing garbage after a complete statement', () => {
			expectParseError('SELECT * FROM executions EXTRA');
		});

		it('errors on missing comma in IN list', () => {
			expectParseError("SELECT * FROM executions WHERE x IN ('a' 'b')");
		});

		it('errors on missing closing paren in IN list', () => {
			expectParseError("SELECT * FROM executions WHERE x IN ('a', 'b'");
		});
	});

	// ---------------------------------------------------------------- Group 13
	describe('v1 rejections', () => {
		const expectCodeError = (sql: string, code: string) => {
			let thrown: unknown;
			try {
				p(sql);
			} catch (err) {
				thrown = err;
			}
			expect(thrown).toBeInstanceOf(ParseError);
			expect(thrown).toMatchObject({ code });
		};

		it.each([
			'SELECT * FROM x JOIN y ON x.a = y.a',
			'SELECT * FROM x LEFT JOIN y ON x.a = y.a',
			'SELECT * FROM x RIGHT JOIN y ON x.a = y.a',
			'SELECT * FROM x INNER JOIN y ON x.a = y.a',
			'SELECT * FROM x FULL JOIN y ON x.a = y.a',
			'SELECT * FROM x CROSS JOIN y',
			'SELECT * FROM x LEFT OUTER JOIN y ON x.a = y.a',
		])('rejects %s as JOINS_NOT_SUPPORTED', (sql) => {
			expectCodeError(sql, 'JOINS_NOT_SUPPORTED');
		});

		it('rejects column aliases (SELECT col AS alias)', () => {
			expectCodeError('SELECT col AS alias FROM executions', 'ALIASES_NOT_SUPPORTED');
		});

		it('rejects source aliases (FROM x AS u)', () => {
			expectCodeError('SELECT * FROM executions AS u', 'ALIASES_NOT_SUPPORTED');
		});
	});
});
