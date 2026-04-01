import type { DataSourceOptions } from '@n8n/typeorm';

import { getAllowedFunctions, isAllowedFunction } from './sql-function-allowlist';

// ── Error ──────────────────────────────────────────────────────────

export class SqlValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'SqlValidationError';
	}
}

// ── Types ──────────────────────────────────────────────────────────

export type SqlValidationResult = {
	type: 'select';
	tables: string[];
	functions: string[];
	rewrittenSql: string;
};

export type TableColumnSchema = {
	name: string;
	columns: string[];
};

// ── Token types (internal) ─────────────────────────────────────────

type TokenType =
	| 'keyword'
	| 'identifier'
	| 'number'
	| 'string'
	| 'operator'
	| 'punctuation'
	| 'star';

type Token = {
	type: TokenType;
	value: string;
	upper: string;
	start: number;
	end: number;
};

type TableRef = {
	name: string;
	tokenIndex: number;
};

// ── Token helpers ──────────────────────────────────────────────────

function isToken(tokens: Token[], index: number, type: TokenType, value?: string): boolean {
	if (index < 0 || index >= tokens.length) return false;
	const t = tokens[index];
	return t.type === type && (value === undefined || t.upper === value.toUpperCase());
}

function isPunc(tokens: Token[], index: number, value: string): boolean {
	return isToken(tokens, index, 'punctuation', value);
}

function isKeyword(tokens: Token[], index: number, value?: string): boolean {
	return isToken(tokens, index, 'keyword', value);
}

function isIdentifier(tokens: Token[], index: number): boolean {
	return isToken(tokens, index, 'identifier');
}

// ── Allowlists ─────────────────────────────────────────────────────
// Security model: every character is tokenized. Every token is validated.
// Every identifier must resolve to a known table, column, or function.
// No aliases, no banned-keyword list — the closed-world check on
// identifiers rejects anything unknown, including SQL keywords that
// our tokenizer doesn't recognize.

/** SQL keywords allowed in the simplified SELECT subset. */
const ALLOWED_KEYWORDS = new Set([
	'SELECT',
	'FROM',
	'WHERE',
	'JOIN',
	'LEFT',
	'RIGHT',
	'INNER',
	'OUTER',
	'CROSS',
	'ON',
	'AND',
	'OR',
	'NOT',
	'IN',
	'BETWEEN',
	'LIKE',
	'ILIKE',
	'IS',
	'NULL',
	'TRUE',
	'FALSE',
	'GROUP',
	'BY',
	'ORDER',
	'ASC',
	'DESC',
	'LIMIT',
	'OFFSET',
	'HAVING',
	'DISTINCT',
	'AS', // only valid inside CAST(expr AS type)
	'CASE',
	'WHEN',
	'THEN',
	'ELSE',
	'END',
	'CAST',
]);

/** CAST target types the validator will accept. */
const ALLOWED_CAST_TYPES = new Set([
	'TEXT',
	'VARCHAR',
	'CHAR',
	'CHARACTER',
	'INTEGER',
	'INT',
	'BIGINT',
	'SMALLINT',
	'REAL',
	'FLOAT',
	'DOUBLE',
	'NUMERIC',
	'DECIMAL',
	'BOOLEAN',
	'BOOL',
	'DATE',
	'TIME',
	'TIMESTAMP',
	'DATETIME',
	'BLOB',
]);

/**
 * Check if the token at `index` is inside a CAST(... AS <type>) expression.
 * Scans backward from the AS keyword to find the matching '(' and checks
 * if CAST precedes it.
 */
function isInsideCast(tokens: Token[], asIndex: number): boolean {
	let depth = 0;
	for (let j = asIndex - 1; j >= 0; j--) {
		if (isPunc(tokens, j, ')')) depth++;
		if (isPunc(tokens, j, '(')) {
			if (depth === 0) {
				return isKeyword(tokens, j - 1, 'CAST');
			}
			depth--;
		}
	}
	return false;
}

// ── Tokenizer ──────────────────────────────────────────────────────
// Each pattern is tried at the current position using the sticky (y) flag.
// First match wins. If nothing matches, the character is rejected.

type TokenRule = {
	type: TokenType | 'skip' | 'error';
	re: RegExp;
	message?: string;
};

const TOKEN_RULES: TokenRule[] = [
	{ type: 'skip', re: /\s+/y },
	{ type: 'error', re: /--/y, message: 'Comments are not allowed' },
	{ type: 'error', re: /\/\*/y, message: 'Comments are not allowed' },
	{ type: 'string', re: /'(?:[^']|'')*'/y },
	{ type: 'error', re: /'/y, message: 'Unterminated string literal' },
	{ type: 'number', re: /\d+(?:\.\d+)?/y },
	{ type: 'operator', re: /\|\||<=|>=|<>|!=|[=<>+\-/%]/y },
	{ type: 'star', re: /\*/y },
	{ type: 'punctuation', re: /[(),.]/y },
	{ type: 'identifier', re: /[a-zA-Z_]\w*/y }, // classified as keyword below
];

function tokenize(sql: string): Token[] {
	const tokens: Token[] = [];
	let pos = 0;

	while (pos < sql.length) {
		let matched = false;

		for (const rule of TOKEN_RULES) {
			rule.re.lastIndex = pos;
			const m = rule.re.exec(sql);
			if (!m) continue;

			if (rule.type === 'error') {
				throw new SqlValidationError(rule.message!);
			}

			if (rule.type !== 'skip') {
				const value = m[0];
				const upper = value.toUpperCase();
				const type: TokenType =
					rule.type === 'identifier' && ALLOWED_KEYWORDS.has(upper)
						? 'keyword'
						: (rule.type as TokenType);

				tokens.push({ type, value, upper, start: pos, end: pos + value.length });
			}

			pos += m[0].length;
			matched = true;
			break;
		}

		if (!matched) {
			throw new SqlValidationError(`Unexpected character '${sql[pos]}' at position ${pos}`);
		}
	}

	return tokens;
}

// ── Validator ──────────────────────────────────────────────────────

export class SqlValidator {
	private readonly dbType: DataSourceOptions['type'];

	constructor(dbType: DataSourceOptions['type']) {
		this.dbType = dbType;
	}

	/**
	 * Validates SQL without rewriting table names.
	 */
	validate(sql: string, tableSchemas: TableColumnSchema[]): SqlValidationResult {
		const trimmed = sql.trim();
		const { tables, functions } = this.doValidate(trimmed, tableSchemas);

		return {
			type: 'select',
			tables: [...new Set(tables.map((t) => t.name))],
			functions: [...new Set(functions)],
			rewrittenSql: trimmed,
		};
	}

	/**
	 * Full pipeline: validate + rewrite table names.
	 */
	validateAndRewrite(
		sql: string,
		tableSchemas: TableColumnSchema[],
		tableMapping: Map<string, string>,
	): SqlValidationResult {
		const trimmed = sql.trim();
		const { tokens, tables, functions } = this.doValidate(trimmed, tableSchemas);

		// Rewrite ALL occurrences of table names (FROM, JOIN, and column qualifiers)
		const tableNamesLower = new Set(tables.map((t) => t.name.toLowerCase()));
		for (const token of tokens) {
			if (token.type !== 'identifier') continue;
			if (!tableNamesLower.has(token.value.toLowerCase())) continue;

			const physical = tableMapping.get(token.value.toLowerCase());
			if (!physical) {
				throw new SqlValidationError(`No physical table mapping found for table '${token.value}'`);
			}
			token.value = physical;
		}

		const rewrittenSql = this.toSql(tokens, trimmed);

		return {
			type: 'select',
			tables: [...new Set(tables.map((t) => t.name))],
			functions: [...new Set(functions)],
			rewrittenSql,
		};
	}

	// ── Core validation pipeline ──────────────────────────────────

	private doValidate(
		sql: string,
		tableSchemas: TableColumnSchema[],
	): { tokens: Token[]; tables: TableRef[]; functions: string[] } {
		// 1. Tokenize — validates every character
		const tokens = tokenize(sql);
		if (tokens.length === 0) {
			throw new SqlValidationError('SQL query must not be empty');
		}

		// 2. First token must be SELECT
		if (!isKeyword(tokens, 0, 'SELECT')) {
			throw new SqlValidationError('Only SELECT statements are allowed');
		}

		// 3. Only one SELECT keyword (blocks subqueries, UNIONs, CTEs)
		let selectCount = 0;
		for (let i = 0; i < tokens.length; i++) {
			if (isKeyword(tokens, i, 'SELECT')) {
				selectCount++;
				if (selectCount > 1) {
					throw new SqlValidationError(
						'Only single SELECT statements are allowed (no subqueries or set operations)',
					);
				}
			}
		}

		// 4. Extract table references
		const tables = this.extractTables(tokens, tableSchemas);

		// 5. Every query must reference at least one table
		if (tables.length === 0) {
			throw new SqlValidationError('Query must reference at least one table in FROM clause');
		}

		// 6. Validate every identifier against the closed world (including functions)
		const functions = this.validateAllIdentifiers(tokens, tableSchemas);

		return { tokens, tables, functions };
	}

	// ── Table extraction ──────────────────────────────────────────

	/**
	 * Extract table references from FROM and JOIN at parenthesis depth 0.
	 */
	private extractTables(tokens: Token[], tableSchemas: TableColumnSchema[]): TableRef[] {
		const allowedLower = new Set(tableSchemas.map((t) => t.name.toLowerCase()));
		const tables: TableRef[] = [];
		let depth = 0;

		for (let i = 0; i < tokens.length; i++) {
			if (isPunc(tokens, i, '(')) depth++;
			if (isPunc(tokens, i, ')')) depth--;

			if (depth !== 0) continue;

			if (isKeyword(tokens, i, 'FROM')) {
				i = this.extractTablesAt(tokens, i + 1, tables, allowedLower, true);
			} else if (isKeyword(tokens, i, 'JOIN')) {
				i = this.extractTablesAt(tokens, i + 1, tables, allowedLower, false);
			}
		}

		return tables;
	}

	/**
	 * After FROM or JOIN: extract table name(s).
	 * FROM supports comma-separated lists; JOIN expects a single table.
	 * Handles optional AS alias after each table name.
	 */
	private extractTablesAt(
		tokens: Token[],
		startIndex: number,
		tables: TableRef[],
		allowedLower: Set<string>,
		allowMultiple: boolean,
	): number {
		let i = startIndex;

		while (isIdentifier(tokens, i)) {
			this.validateTableName(tokens[i], allowedLower);
			tables.push({ name: tokens[i].value, tokenIndex: i });
			i++;

			// Skip optional AS alias (e.g. FROM orders AS o)
			if (isKeyword(tokens, i, 'AS') && isIdentifier(tokens, i + 1)) {
				i += 2;
			}

			if (allowMultiple && isPunc(tokens, i, ',')) {
				i++;
				continue;
			}

			break;
		}

		return i - 1;
	}

	private validateTableName(token: Token, allowedLower: Set<string>): void {
		if (!allowedLower.has(token.value.toLowerCase())) {
			throw new SqlValidationError(`Table '${token.value}' is not in the allowed table list`);
		}
	}

	// ── Closed-world identifier validation ────────────────────────

	/**
	 * Every identifier token must be a known table name, column name,
	 * allowed function name, or CAST target type. This is the core
	 * security guarantee — anything unknown is rejected.
	 * Also validates and collects function names.
	 */
	private validateAllIdentifiers(tokens: Token[], tableSchemas: TableColumnSchema[]): string[] {
		const tableNames = new Set(tableSchemas.map((t) => t.name.toLowerCase()));
		const allColumns = new Set<string>();
		const columnsByTable = new Map<string, Set<string>>();
		const functions: string[] = [];

		for (const schema of tableSchemas) {
			const colSet = new Set(schema.columns.map((c) => c.toLowerCase()));
			columnsByTable.set(schema.name.toLowerCase(), colSet);
			for (const col of schema.columns) {
				allColumns.add(col.toLowerCase());
			}
		}

		for (let i = 0; i < tokens.length; i++) {
			if (!isIdentifier(tokens, i)) continue;

			const value = tokens[i].value;
			const lower = value.toLowerCase();
			const upper = tokens[i].upper;

			// 1. Function call: identifier followed by '('
			if (isPunc(tokens, i + 1, '(')) {
				if (!isAllowedFunction(upper, this.dbType)) {
					throw new SqlValidationError(
						`Function '${upper}' is not allowed. Allowed: ${getAllowedFunctions(this.dbType).join(', ')}`,
					);
				}
				functions.push(upper);
				continue;
			}

			// 2. Known table name
			if (tableNames.has(lower)) continue;

			// 3. Table-qualified column: table.column
			if (isPunc(tokens, i - 1, '.') && isIdentifier(tokens, i - 2)) {
				const tableLower = tokens[i - 2].value.toLowerCase();
				const tableCols = columnsByTable.get(tableLower);
				if (tableCols && tableCols.has(lower)) continue;

				throw new SqlValidationError(
					`Column '${value}' does not exist in table '${tokens[i - 2].value}'`,
				);
			}

			// 4. Identifier after AS
			if (isKeyword(tokens, i - 1, 'AS')) {
				// Inside CAST(expr AS <type>) → validate against allowed types
				if (isInsideCast(tokens, i - 1)) {
					if (ALLOWED_CAST_TYPES.has(upper)) continue;
					throw new SqlValidationError(`Cast type '${value}' is not allowed`);
				}
				// Outside CAST → column alias, harmless
				continue;
			}

			// 5. Standalone column name (must exist in at least one allowed table)
			if (allColumns.has(lower)) continue;

			throw new SqlValidationError(
				`Unknown identifier '${value}'. Must be a table name, column name, or allowed function`,
			);
		}

		return functions;
	}

	// ── SQL reconstruction ────────────────────────────────────────

	/** Rebuild SQL from tokens, substituting any rewritten values. */
	private toSql(tokens: Token[], originalSql: string): string {
		let result = '';
		let lastEnd = 0;

		for (const token of tokens) {
			result += originalSql.slice(lastEnd, token.start);
			result += token.value;
			lastEnd = token.end;
		}

		result += originalSql.slice(lastEnd);
		return result.trim();
	}
}
