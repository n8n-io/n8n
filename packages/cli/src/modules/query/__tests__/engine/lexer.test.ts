import { ParseError } from '../../engine/errors';
import { lex } from '../../engine/lexer';

describe('lexer', () => {
	describe('empty input', () => {
		it('returns only EOF for empty string', () => {
			expect(lex('')).toEqual([{ kind: 'EOF', start: 0 }]);
		});

		it('returns only EOF for whitespace-only input', () => {
			expect(lex('   \t\n  ')).toEqual([{ kind: 'EOF', start: 7 }]);
		});
	});

	describe('keywords', () => {
		const keywords = [
			'SELECT',
			'FROM',
			'WHERE',
			'AND',
			'OR',
			'NOT',
			'ORDER',
			'BY',
			'GROUP',
			'HAVING',
			'LIMIT',
			'ASC',
			'DESC',
			'IS',
			'NULL',
			'IN',
			'LIKE',
			'LAST',
			'SINCE',
			'EXECUTION',
			'COUNT',
			'SUM',
			'AVG',
			'MIN',
			'MAX',
			'JOIN',
			'LEFT',
			'RIGHT',
			'INNER',
			'FULL',
			'CROSS',
			'OUTER',
			'ON',
			'AS',
		];

		it.each(keywords)('recognizes %s', (kw) => {
			expect(lex(kw)).toEqual([
				{ kind: 'KEYWORD', value: kw, start: 0 },
				{ kind: 'EOF', start: kw.length },
			]);
		});

		it.each(['select', 'Select', 'SeLeCt'])('is case-insensitive (%s → SELECT)', (input) => {
			expect(lex(input)[0]).toEqual({ kind: 'KEYWORD', value: 'SELECT', start: 0 });
		});
	});

	describe('identifiers', () => {
		it.each(['status', 'duration_ms', '_execution_id', 'col1', 'a'])('lexes %s', (id) => {
			expect(lex(id)).toEqual([
				{ kind: 'IDENT', value: id, start: 0 },
				{ kind: 'EOF', start: id.length },
			]);
		});

		it('preserves identifier case', () => {
			expect(lex('CamelCase')[0]).toEqual({ kind: 'IDENT', value: 'CamelCase', start: 0 });
		});
	});

	describe('numbers', () => {
		it('lexes an integer', () => {
			expect(lex('42')).toEqual([
				{ kind: 'NUMBER', value: 42, start: 0 },
				{ kind: 'EOF', start: 2 },
			]);
		});

		it('lexes a decimal', () => {
			expect(lex('3.14')).toEqual([
				{ kind: 'NUMBER', value: 3.14, start: 0 },
				{ kind: 'EOF', start: 4 },
			]);
		});

		it('lexes zero', () => {
			expect(lex('0')[0]).toEqual({ kind: 'NUMBER', value: 0, start: 0 });
		});
	});

	describe('strings', () => {
		it('lexes a plain string', () => {
			expect(lex("'hello'")).toEqual([
				{ kind: 'STRING', value: 'hello', start: 0 },
				{ kind: 'EOF', start: 7 },
			]);
		});

		it('lexes a string with spaces', () => {
			expect(lex("'workflow name'")[0]).toEqual({
				kind: 'STRING',
				value: 'workflow name',
				start: 0,
			});
		});

		it('lexes an empty string', () => {
			expect(lex("''")[0]).toEqual({ kind: 'STRING', value: '', start: 0 });
		});

		it("unescapes doubled single quotes ('it''s' → it's)", () => {
			expect(lex("'it''s'")[0]).toEqual({ kind: 'STRING', value: "it's", start: 0 });
		});

		it('handles multiple doubled quotes in one string', () => {
			expect(lex("'a''b''c'")[0]).toEqual({ kind: 'STRING', value: "a'b'c", start: 0 });
		});
	});

	describe('operators', () => {
		it.each(['=', '!=', '<>', '<', '>', '<=', '>='])('lexes %s', (op) => {
			expect(lex(op)).toEqual([
				{ kind: 'OPERATOR', value: op, start: 0 },
				{ kind: 'EOF', start: op.length },
			]);
		});
	});

	describe('star', () => {
		it('lexes * as its own token', () => {
			expect(lex('*')).toEqual([
				{ kind: 'STAR', start: 0 },
				{ kind: 'EOF', start: 1 },
			]);
		});
	});

	describe('punctuation', () => {
		it.each(['(', ')', ',', '.'])('lexes %s', (p) => {
			expect(lex(p)).toEqual([
				{ kind: 'PUNCT', value: p, start: 0 },
				{ kind: 'EOF', start: 1 },
			]);
		});
	});

	describe('full statements', () => {
		it("lexes SELECT * FROM 'executions' WHERE status = 'error'", () => {
			expect(lex("SELECT * FROM 'executions' WHERE status = 'error'")).toEqual([
				{ kind: 'KEYWORD', value: 'SELECT', start: 0 },
				{ kind: 'STAR', start: 7 },
				{ kind: 'KEYWORD', value: 'FROM', start: 9 },
				{ kind: 'STRING', value: 'executions', start: 14 },
				{ kind: 'KEYWORD', value: 'WHERE', start: 27 },
				{ kind: 'IDENT', value: 'status', start: 33 },
				{ kind: 'OPERATOR', value: '=', start: 40 },
				{ kind: 'STRING', value: 'error', start: 42 },
				{ kind: 'EOF', start: 49 },
			]);
		});

		it('tolerates extra whitespace between tokens', () => {
			const result = lex('SELECT   *  FROM');
			expect(result.map((t) => t.kind)).toEqual(['KEYWORD', 'STAR', 'KEYWORD', 'EOF']);
		});

		it('treats tabs and newlines as whitespace', () => {
			const result = lex('SELECT\t*\nFROM');
			expect(result.map((t) => t.kind)).toEqual(['KEYWORD', 'STAR', 'KEYWORD', 'EOF']);
		});
	});

	describe('position tracking', () => {
		it('records start offsets that match the source positions', () => {
			const sql = 'SELECT * FROM x';
			//          0123456789012345
			//                    1
			const tokens = lex(sql);
			expect(tokens[0].start).toBe(0); // SELECT
			expect(tokens[1].start).toBe(7); // *
			expect(tokens[2].start).toBe(9); // FROM
			expect(tokens[3].start).toBe(14); // x
			expect(tokens[4].start).toBe(15); // EOF
		});
	});

	describe('errors', () => {
		it('throws ParseError on unknown character', () => {
			let thrown: unknown;
			try {
				lex('@foo');
			} catch (err) {
				thrown = err;
			}
			expect(thrown).toBeInstanceOf(ParseError);
			expect(thrown).toMatchObject({ code: 'PARSE_ERROR', position: 0 });
		});

		it('throws ParseError on unterminated string', () => {
			let thrown: unknown;
			try {
				lex("'hello");
			} catch (err) {
				thrown = err;
			}
			expect(thrown).toBeInstanceOf(ParseError);
			expect(thrown).toMatchObject({ code: 'PARSE_ERROR', position: 0 });
		});

		it('throws ParseError with mid-input position on unknown character after valid tokens', () => {
			let thrown: unknown;
			try {
				lex('SELECT @');
			} catch (err) {
				thrown = err;
			}
			expect(thrown).toBeInstanceOf(ParseError);
			expect(thrown).toMatchObject({ position: 7 });
		});
	});
});
