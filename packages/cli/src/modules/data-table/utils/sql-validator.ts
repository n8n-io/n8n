import type { DataSourceOptions } from '@n8n/typeorm';

import { getAllowedFunctions, isAllowedFunction } from './sql-function-allowlist';

export class SqlValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'SqlValidationError';
	}
}

export type SqlValidationResult = {
	type: 'select';
	tables: string[];
	functions: string[];
	rewrittenSql: string;
};

type SqlAstNode = Record<string, unknown>;

function resolveDialect(dbType: DataSourceOptions['type']): string {
	if (dbType === 'sqlite' || dbType === 'sqlite-pooled') {
		return 'SQLite';
	}
	return 'PostgresQL';
}

// ── Allowlists ──────────────────────────────────────────────────────
// Every AST node type and operator that can appear in a valid query
// must be listed here. Anything not listed is rejected.

/** Expression node types the walker will accept. */
const ALLOWED_EXPR_TYPES = new Set([
	'column_ref',
	'binary_expr',
	'unary_expr',
	'aggr_func',
	'function',
	'number',
	'single_quote_string',
	'double_quote_string',
	'bool',
	'null',
	'star',
	'expr_list',
	'cast',
	'case',
	'when',
	'else',
	'default', // internal: column name value wrapper
	'expr', // internal: column list entry wrapper
	'interval', // INTERVAL '1 day'
	'param', // parameterized value
]);

/** Binary operators the walker will accept. */
const ALLOWED_OPERATORS = new Set([
	'=',
	'!=',
	'<>',
	'<',
	'>',
	'<=',
	'>=',
	'AND',
	'OR',
	'NOT',
	'IN',
	'NOT IN',
	'BETWEEN',
	'NOT BETWEEN',
	'LIKE',
	'NOT LIKE',
	'ILIKE',
	'NOT ILIKE',
	'IS',
	'IS NOT',
	'+',
	'-',
	'*',
	'/',
	'%',
	'||', // string concatenation
]);

/** JOIN types allowed in FROM clause. */
const ALLOWED_JOIN_TYPES = new Set([
	undefined, // first table in FROM (no join keyword)
	'INNER JOIN',
	'LEFT JOIN',
	'LEFT OUTER JOIN',
	'RIGHT JOIN',
	'RIGHT OUTER JOIN',
	'CROSS JOIN',
	'JOIN',
]);

/**
 * Strict allowlist-based SQL validator.
 *
 * Security model: every AST node is checked against an explicit allowlist.
 * Anything not recognized is rejected. This means new parser features,
 * subqueries, CTEs, UNIONs, window functions, and any other construct
 * we haven't explicitly vetted will be blocked by default.
 */
export class SqlValidator {
	private readonly dialect: string;

	private readonly dbType: DataSourceOptions['type'];

	constructor(dbType: DataSourceOptions['type']) {
		this.dbType = dbType;
		this.dialect = resolveDialect(dbType);
	}

	/**
	 * Validates SQL without rewriting table names.
	 */
	validate(sql: string, allowedTables: string[]): SqlValidationResult {
		const ast = this.parse(sql) as SqlAstNode;

		this.assertSimpleSelect(ast);

		const tables = this.extractTables(ast);
		this.checkTablesAllowed(tables, allowedTables);

		const functions: string[] = [];
		this.assertAllNodesAllowed(ast, functions);

		return {
			type: 'select',
			tables: [...new Set(tables.map((t) => t.name))],
			functions: [...new Set(functions)],
			rewrittenSql: sql,
		};
	}

	/**
	 * Full pipeline: validate + rewrite table names + whiteListCheck.
	 */
	validateAndRewrite(
		sql: string,
		allowedTables: string[],
		tableMapping: Map<string, string>,
	): SqlValidationResult {
		const ast = this.parse(sql) as SqlAstNode;

		this.assertSimpleSelect(ast);

		const tables = this.extractTables(ast);
		this.checkTablesAllowed(tables, allowedTables);

		const functions: string[] = [];
		this.assertAllNodesAllowed(ast, functions);

		// Rewrite table names from logical to physical
		for (const table of tables) {
			const physical = tableMapping.get(table.name.toLowerCase());
			if (!physical) {
				throw new SqlValidationError(`No physical table mapping found for table '${table.name}'`);
			}
			table.ref.table = physical;
		}

		// eslint-disable-next-line @typescript-eslint/consistent-type-imports
		const { Parser } = require('node-sql-parser') as typeof import('node-sql-parser');
		const parser = new Parser();

		// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
		const rewrittenSql = parser.sqlify(ast as any, { database: this.dialect });

		// Defense-in-depth: whiteListCheck on rewritten SQL
		const physicalTableNames = [...new Set(tables.map((t) => t.name))].map((name) => {
			const physical = tableMapping.get(name.toLowerCase());
			if (!physical) {
				throw new SqlValidationError(`No physical table mapping found for table '${name}'`);
			}
			return `select::null::${physical}`;
		});

		try {
			parser.whiteListCheck(rewrittenSql, physicalTableNames, {
				database: this.dialect,
			});
		} catch {
			throw new SqlValidationError(
				'Rewritten SQL references tables not in the allowed physical table list',
			);
		}

		return {
			type: 'select',
			tables: [...new Set(tables.map((t) => t.name))],
			functions: [...new Set(functions)],
			rewrittenSql,
		};
	}

	// ── Parsing ───────────────────────────────────────────────────────

	private parse(sql: string): unknown {
		const trimmed = sql.trim();
		if (trimmed.length === 0) {
			throw new SqlValidationError('SQL query must not be empty');
		}

		// eslint-disable-next-line @typescript-eslint/consistent-type-imports
		const { Parser } = require('node-sql-parser') as typeof import('node-sql-parser');
		const parser = new Parser();

		try {
			return parser.astify(trimmed, { database: this.dialect });
		} catch {
			throw new SqlValidationError('Failed to parse SQL query');
		}
	}

	// ── Structure checks ──────────────────────────────────────────────

	/**
	 * Reject anything that isn't a single, simple SELECT.
	 * No CTEs, no UNION, no INTO, no window clause.
	 */
	private assertSimpleSelect(ast: unknown): void {
		if (Array.isArray(ast)) {
			throw new SqlValidationError('Only single SELECT statements are allowed');
		}

		const node = ast as SqlAstNode;
		if (node.type !== 'select') {
			throw new SqlValidationError('Only single SELECT statements are allowed');
		}

		if (node.with !== null && node.with !== undefined) {
			throw new SqlValidationError('WITH/CTE expressions are not allowed');
		}

		if (node._next !== null && node._next !== undefined) {
			throw new SqlValidationError('UNION/INTERSECT/EXCEPT are not allowed');
		}

		const into = node.into as SqlAstNode | null | undefined;
		if (into && into.expr !== undefined && into.expr !== null) {
			throw new SqlValidationError('SELECT INTO is not allowed');
		}

		if (node.window !== null && node.window !== undefined) {
			throw new SqlValidationError('Window clauses are not allowed');
		}
	}

	// ── Table extraction & validation ─────────────────────────────────

	private extractTables(
		ast: SqlAstNode,
	): Array<{ name: string; db: string | null; ref: SqlAstNode }> {
		const from = ast.from as SqlAstNode[] | null;
		if (!Array.isArray(from)) return [];

		const tables: Array<{ name: string; db: string | null; ref: SqlAstNode }> = [];

		for (const entry of from) {
			// Reject derived tables (subqueries in FROM)
			if (entry.expr && typeof entry.expr === 'object') {
				throw new SqlValidationError('Subqueries in FROM (derived tables) are not allowed');
			}

			if (typeof entry.table !== 'string') continue;

			// Reject schema-qualified references
			if (entry.db !== null && entry.db !== undefined) {
				throw new SqlValidationError(
					`Schema-qualified table references are not allowed: '${String(entry.db)}.${entry.table}'`,
				);
			}

			// Reject unknown join types
			if (!ALLOWED_JOIN_TYPES.has(entry.join as string | undefined)) {
				throw new SqlValidationError(`Join type '${String(entry.join)}' is not allowed`);
			}

			tables.push({ name: entry.table, db: null, ref: entry });

			// Validate the ON condition if present
			// (done later by assertAllNodesAllowed, but verify it's an expression not a subquery)
		}

		return tables;
	}

	private checkTablesAllowed(
		tables: Array<{ name: string; db: string | null; ref: SqlAstNode }>,
		allowedTables: string[],
	): void {
		const allowedLower = new Set(allowedTables.map((t) => t.toLowerCase()));
		for (const table of tables) {
			if (!allowedLower.has(table.name.toLowerCase())) {
				throw new SqlValidationError(`Table '${table.name}' is not in the allowed table list`);
			}
		}
	}

	// ── Allowlist walker ──────────────────────────────────────────────

	/**
	 * Walk every expression node in the AST and verify it is in the
	 * allowlist. Rejects any node type not explicitly permitted.
	 *
	 * Also collects function names for reporting.
	 */
	private assertAllNodesAllowed(ast: SqlAstNode, functions: string[]): void {
		// Validate column expressions
		const columns = ast.columns as SqlAstNode[] | string;
		if (Array.isArray(columns)) {
			for (const col of columns) {
				this.assertExprAllowed(col, functions);
			}
		}

		// Validate FROM ON conditions
		const from = ast.from as SqlAstNode[] | null;
		if (Array.isArray(from)) {
			for (const entry of from) {
				if (entry.on) {
					this.assertExprAllowed(entry.on as SqlAstNode, functions);
				}
			}
		}

		// Validate WHERE
		if (ast.where) {
			this.assertExprAllowed(ast.where as SqlAstNode, functions);
		}

		// Validate GROUP BY
		const groupby = ast.groupby as SqlAstNode | null;
		if (groupby && typeof groupby === 'object') {
			const groupCols = (groupby as SqlAstNode).columns as SqlAstNode[] | undefined;
			if (Array.isArray(groupCols)) {
				for (const col of groupCols) {
					this.assertExprAllowed(col, functions);
				}
			}
		}

		// Validate HAVING
		if (ast.having) {
			this.assertExprAllowed(ast.having as SqlAstNode, functions);
		}

		// Validate ORDER BY
		const orderby = ast.orderby as SqlAstNode[] | null;
		if (Array.isArray(orderby)) {
			for (const item of orderby) {
				if (item.expr) {
					this.assertExprAllowed(item.expr as SqlAstNode, functions);
				}
			}
		}

		// Validate LIMIT
		const limit = ast.limit as SqlAstNode | null;
		if (limit && typeof limit === 'object') {
			const limitValues = limit.value as SqlAstNode[] | undefined;
			if (Array.isArray(limitValues)) {
				for (const v of limitValues) {
					this.assertExprAllowed(v, functions);
				}
			}
		}

		// Reject DISTINCT ON (complex; plain DISTINCT is fine)
		const distinct = ast.distinct as SqlAstNode | null;
		if (distinct && typeof distinct === 'object' && distinct.type === 'DISTINCT ON') {
			throw new SqlValidationError('DISTINCT ON is not allowed');
		}
	}

	/**
	 * Recursively validate a single expression node against the allowlist.
	 * Throws on any unrecognized node type, operator, or structure.
	 */
	private assertExprAllowed(node: unknown, functions: string[]): void {
		if (node === null || node === undefined) return;
		if (typeof node !== 'object') return; // primitives are fine
		if (Array.isArray(node)) {
			for (const item of node) {
				this.assertExprAllowed(item, functions);
			}
			return;
		}

		const obj = node as SqlAstNode;
		const type = obj.type as string | undefined;

		// Nodes without a type are structural wrappers (e.g., args object) — recurse
		if (type === undefined) {
			for (const value of Object.values(obj)) {
				if (value && typeof value === 'object') {
					this.assertExprAllowed(value, functions);
				}
			}
			return;
		}

		// ── Reject subqueries anywhere ──
		// Subqueries have a nested `ast` property with `tableList`
		if ('tableList' in obj || 'ast' in obj) {
			throw new SqlValidationError('Subqueries are not allowed');
		}

		// ── Check type against allowlist ──
		if (!ALLOWED_EXPR_TYPES.has(type)) {
			throw new SqlValidationError(`SQL expression type '${type}' is not allowed`);
		}

		// ── Type-specific validation ──

		if (type === 'binary_expr') {
			const op = obj.operator as string;
			if (!ALLOWED_OPERATORS.has(op)) {
				throw new SqlValidationError(`Operator '${op}' is not allowed`);
			}
			this.assertExprAllowed(obj.left, functions);
			this.assertExprAllowed(obj.right, functions);
			return;
		}

		if (type === 'unary_expr') {
			const op = obj.operator as string;
			if (op !== 'NOT' && op !== '-' && op !== '+') {
				throw new SqlValidationError(`Unary operator '${op}' is not allowed`);
			}
			this.assertExprAllowed(obj.expr, functions);
			return;
		}

		if (type === 'aggr_func') {
			const name = (obj.name as string).toUpperCase();
			if (!isAllowedFunction(name, this.dbType)) {
				throw new SqlValidationError(`Function '${name}' is not allowed`);
			}
			// Reject window functions attached to aggregates (OVER clause)
			if (obj.over !== null && obj.over !== undefined) {
				throw new SqlValidationError('Window functions (OVER) are not allowed');
			}
			functions.push(name);
			this.assertExprAllowed(obj.args, functions);
			return;
		}

		if (type === 'function') {
			const nameObj = obj.name as SqlAstNode | undefined;
			const nameArray = nameObj?.name as Array<{ value: string }> | undefined;
			if (
				Array.isArray(nameArray) &&
				nameArray.length > 0 &&
				typeof nameArray[0].value === 'string'
			) {
				const funcName = nameArray[0].value.toUpperCase();
				if (!isAllowedFunction(funcName, this.dbType)) {
					throw new SqlValidationError(
						`Function '${funcName}' is not allowed. Allowed: ${getAllowedFunctions(this.dbType).join(', ')}`,
					);
				}
				// Reject window functions
				if (obj.over !== null && obj.over !== undefined) {
					throw new SqlValidationError('Window functions (OVER) are not allowed');
				}
				functions.push(funcName);
			}
			this.assertExprAllowed(obj.args, functions);
			return;
		}

		if (type === 'cast') {
			this.assertExprAllowed(obj.expr, functions);
			// target type is a keyword — safe
			return;
		}

		if (type === 'case') {
			this.assertExprAllowed(obj.expr, functions); // CASE <expr>
			this.assertExprAllowed(obj.args, functions); // WHEN/ELSE branches
			return;
		}

		if (type === 'when') {
			this.assertExprAllowed(obj.cond, functions);
			this.assertExprAllowed(obj.result, functions);
			return;
		}

		if (type === 'else') {
			this.assertExprAllowed(obj.result, functions);
			return;
		}

		if (type === 'expr_list') {
			const values = obj.value as unknown[];
			if (Array.isArray(values)) {
				for (const v of values) {
					this.assertExprAllowed(v, functions);
				}
			}
			return;
		}

		if (type === 'column_ref') {
			// Column references are safe — just table.column
			// The column value can be a nested { expr: { type: 'default', value: 'name' } }
			const col = obj.column;
			if (col && typeof col === 'object') {
				const colObj = col as SqlAstNode;
				if (colObj.expr && typeof colObj.expr === 'object') {
					const exprObj = colObj.expr as SqlAstNode;
					if (exprObj.type !== 'default') {
						throw new SqlValidationError(
							`Unexpected column expression type '${String(exprObj.type)}'`,
						);
					}
				}
			}
			return;
		}

		// Leaf types: number, string, bool, null, star, default, expr, interval, param
		// These are terminal — no children to validate beyond what's already checked.
		if (type === 'expr') {
			// Wrapper around an expression
			this.assertExprAllowed(obj.expr, functions);
			return;
		}
	}
}
