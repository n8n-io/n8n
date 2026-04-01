import type { DataSourceOptions } from '@n8n/typeorm';

import { isAllowedFunction } from './sql-function-allowlist';

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

/**
 * Resolves the node-sql-parser dialect string from a TypeORM database type.
 */
function resolveDialect(dbType: DataSourceOptions['type']): string {
	if (dbType === 'sqlite' || dbType === 'sqlite-pooled') {
		return 'SQLite';
	}
	return 'PostgresQL';
}

/**
 * SQL keywords that appear as `function` nodes in node-sql-parser AST
 * but are not actual callable functions. They must be allowed implicitly
 * and never routed through the function allowlist.
 */
const SQL_KEYWORD_FUNCTIONS = new Set(['EXISTS', 'NOT EXISTS']);

/**
 * AST-based SQL validation pipeline.
 *
 * This is the security boundary between user-supplied SQL and the database.
 * The validation pipeline enforces:
 * 1. Only SELECT statements
 * 2. Only explicitly allowed tables
 * 3. Only explicitly allowed functions
 * 4. No schema-qualified references (e.g., public.table)
 * 5. No multiple statements (semicolon injection)
 * 6. Table name rewriting from logical to physical names
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
	 * Used for basic validation checks.
	 */
	validate(sql: string, allowedTables: string[]): SqlValidationResult {
		const ast = this.parse(sql);
		this.assertSingleSelect(ast);
		const selectAst = ast as SqlAstNode;

		const tables = this.extractAllTables(selectAst);
		this.validateTables(tables, allowedTables);

		const functions = this.extractAllFunctions(selectAst);
		this.validateFunctions(functions);

		return {
			type: 'select',
			tables: [...new Set(tables.map((t) => t.name))],
			functions: [...new Set(functions)],
			rewrittenSql: sql,
		};
	}

	/**
	 * Full pipeline: validate + rewrite table names + whiteListCheck.
	 * Returns result with `rewrittenSql` containing physical table names.
	 */
	validateAndRewrite(
		sql: string,
		allowedTables: string[],
		tableMapping: Map<string, string>,
	): SqlValidationResult {
		const ast = this.parse(sql);
		this.assertSingleSelect(ast);
		const selectAst = ast as SqlAstNode;

		const tables = this.extractAllTables(selectAst);
		this.validateTables(tables, allowedTables);

		const functions = this.extractAllFunctions(selectAst);
		this.validateFunctions(functions);

		// Rewrite table names from logical to physical
		this.rewriteTableNames(selectAst, tableMapping);

		// eslint-disable-next-line @typescript-eslint/consistent-type-imports
		const { Parser } = require('node-sql-parser') as typeof import('node-sql-parser');
		const parser = new Parser();

		// selectAst was produced by parser.astify — it has the correct shape,
		// but our SqlAstNode alias lost the type. Cast through unknown.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
		const rewrittenSql = parser.sqlify(selectAst as any, { database: this.dialect });

		// Defense-in-depth: run whiteListCheck on the rewritten SQL
		// to verify only physical table names appear
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

	/**
	 * Parse SQL into an AST using node-sql-parser.
	 * Throws SqlValidationError for empty input or parse failures.
	 */
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

	/**
	 * Assert the AST represents exactly one SELECT statement.
	 * Rejects multiple statements (semicolon injection) and non-SELECT types.
	 */
	private assertSingleSelect(ast: unknown): void {
		// Multiple statements produce an array
		if (Array.isArray(ast)) {
			throw new SqlValidationError('Only single SELECT statements are allowed');
		}

		const node = ast as SqlAstNode;
		if (node.type !== 'select') {
			throw new SqlValidationError('Only single SELECT statements are allowed');
		}

		// Reject SELECT ... INTO (creates tables or writes to files)
		const into = node.into as SqlAstNode | null | undefined;
		if (into && into.expr !== undefined && into.expr !== null) {
			throw new SqlValidationError('SELECT INTO is not allowed');
		}
	}

	/**
	 * Extract all table references from the AST, including from subqueries,
	 * UNION chains, CTEs, and derived tables.
	 *
	 * Returns an array of objects with `name`, `db` (schema), and the source
	 * location to enable rewriting.
	 */
	private extractAllTables(
		ast: SqlAstNode,
	): Array<{ name: string; db: string | null; ref: SqlAstNode }> {
		const tables: Array<{ name: string; db: string | null; ref: SqlAstNode }> = [];

		this.walkSelectAst(ast, (selectNode) => {
			// FROM clause
			const from = selectNode.from as SqlAstNode[] | null;
			if (Array.isArray(from)) {
				for (const entry of from) {
					if (typeof entry.table === 'string') {
						tables.push({
							name: entry.table,
							db: (entry.db as string) ?? null,
							ref: entry,
						});
					}

					// Derived table (subquery in FROM): { expr: { ast: { ... } } }
					if (entry.expr && typeof entry.expr === 'object') {
						const exprNode = entry.expr as SqlAstNode;
						if (exprNode.ast && typeof exprNode.ast === 'object') {
							this.walkSelectAst(exprNode.ast as SqlAstNode, (inner) => {
								const innerFrom = inner.from as SqlAstNode[] | null;
								if (Array.isArray(innerFrom)) {
									for (const innerEntry of innerFrom) {
										if (typeof innerEntry.table === 'string') {
											tables.push({
												name: innerEntry.table,
												db: (innerEntry.db as string) ?? null,
												ref: innerEntry,
											});
										}
									}
								}
							});
						}
					}
				}
			}

			// CTE (WITH clause): each CTE has a .stmt sub-AST
			const withClause = selectNode.with as SqlAstNode[] | null;
			if (Array.isArray(withClause)) {
				for (const cte of withClause) {
					if (cte.stmt && typeof cte.stmt === 'object') {
						const cteNames = new Set<string>();
						for (const c of withClause) {
							const nameObj = c.name as SqlAstNode | undefined;
							if (nameObj && typeof nameObj.value === 'string') {
								cteNames.add(nameObj.value.toLowerCase());
							}
						}
						this.walkSelectAst(cte.stmt as SqlAstNode, (inner) => {
							const innerFrom = inner.from as SqlAstNode[] | null;
							if (Array.isArray(innerFrom)) {
								for (const innerEntry of innerFrom) {
									if (
										typeof innerEntry.table === 'string' &&
										!cteNames.has(innerEntry.table.toLowerCase())
									) {
										tables.push({
											name: innerEntry.table,
											db: (innerEntry.db as string) ?? null,
											ref: innerEntry,
										});
									}
								}
							}
						});
					}
				}
			}
		});

		return tables;
	}

	/**
	 * Walk through a SELECT AST node and its UNION chain (_next).
	 * Calls the visitor for each SELECT-level node.
	 * Also recurses into subqueries found in WHERE, HAVING, columns, etc.
	 */
	private walkSelectAst(ast: SqlAstNode, visitor: (node: SqlAstNode) => void): void {
		visitor(ast);

		// Walk subqueries in all expression-bearing clauses
		this.walkExpressionsForSubqueries(ast, visitor);

		// UNION chain: _next holds the next SELECT in the union
		if (ast._next && typeof ast._next === 'object') {
			this.walkSelectAst(ast._next as SqlAstNode, visitor);
		}
	}

	/**
	 * Recursively search for subquery ASTs embedded in expressions
	 * (WHERE, HAVING, columns, etc.)
	 */
	private walkExpressionsForSubqueries(node: unknown, visitor: (node: SqlAstNode) => void): void {
		if (node === null || node === undefined || typeof node !== 'object') {
			return;
		}

		if (Array.isArray(node)) {
			for (const item of node) {
				this.walkExpressionsForSubqueries(item, visitor);
			}
			return;
		}

		const obj = node as SqlAstNode;

		// A subquery nested in an expression will have an `ast` property
		// with `tableList` and `columnList` siblings
		if (obj.ast && typeof obj.ast === 'object' && 'tableList' in (obj as Record<string, unknown>)) {
			const subAst = obj.ast as SqlAstNode;
			if (subAst.type === 'select') {
				this.walkSelectAst(subAst, visitor);
			}
		}

		// Recurse into all properties
		for (const key of Object.keys(obj)) {
			// Skip recursing into `from` from this generic walker —
			// `from` is handled by extractAllTables directly
			if (key === 'from') continue;
			const value = obj[key];
			if (value && typeof value === 'object') {
				this.walkExpressionsForSubqueries(value, visitor);
			}
		}
	}

	/**
	 * Validate extracted table references against the allowed list.
	 * Also rejects schema-qualified references (db property set).
	 */
	private validateTables(
		tables: Array<{ name: string; db: string | null; ref: SqlAstNode }>,
		allowedTables: string[],
	): void {
		const allowedLower = new Set(allowedTables.map((t) => t.toLowerCase()));

		for (const table of tables) {
			// Reject schema-qualified references
			if (table.db !== null && table.db !== undefined) {
				throw new SqlValidationError(
					`Schema-qualified table references are not allowed: '${String(table.db)}.${table.name}'`,
				);
			}

			// Check table is in the allowlist (case-insensitive)
			if (!allowedLower.has(table.name.toLowerCase())) {
				throw new SqlValidationError(`Table '${table.name}' is not in the allowed table list`);
			}
		}
	}

	/**
	 * Extract all function names from the AST by recursively walking all nodes.
	 * Handles both `aggr_func` (COUNT, SUM, etc.) and `function` types,
	 * as well as `window_func` types.
	 */
	private extractAllFunctions(ast: SqlAstNode): string[] {
		const functions: string[] = [];
		this.walkForFunctions(ast, functions);
		return functions;
	}

	/**
	 * Recursively walk the AST to find function call nodes.
	 *
	 * node-sql-parser represents functions in three forms:
	 * - `aggr_func`: { type: "aggr_func", name: "COUNT", args: { ... } }
	 * - `function`:  { type: "function", name: { name: [{ value: "COALESCE" }] }, args: { ... } }
	 * - `window_func`: { type: "window_func", name: "ROW_NUMBER", over: { ... } }
	 */
	private walkForFunctions(node: unknown, functions: string[]): void {
		if (node === null || node === undefined || typeof node !== 'object') {
			return;
		}

		if (Array.isArray(node)) {
			for (const item of node) {
				this.walkForFunctions(item, functions);
			}
			return;
		}

		const obj = node as SqlAstNode;
		const type = obj.type as string | undefined;

		// Aggregate functions: COUNT, SUM, AVG, MIN, MAX
		if (type === 'aggr_func' && typeof obj.name === 'string') {
			functions.push(obj.name.toUpperCase());
		}

		// Regular functions: COALESCE, LOWER, pg_read_file, etc.
		if (type === 'function' && obj.name && typeof obj.name === 'object') {
			const nameObj = obj.name as SqlAstNode;
			const nameArray = nameObj.name as Array<{ value: string }> | undefined;
			if (
				Array.isArray(nameArray) &&
				nameArray.length > 0 &&
				typeof nameArray[0].value === 'string'
			) {
				const funcName = nameArray[0].value.toUpperCase();
				// Skip SQL keywords that appear as function nodes (e.g. EXISTS)
				if (!SQL_KEYWORD_FUNCTIONS.has(funcName)) {
					functions.push(funcName);
				}
			}
		}

		// Window functions: ROW_NUMBER, RANK, etc.
		if (type === 'window_func' && typeof obj.name === 'string') {
			functions.push(obj.name.toUpperCase());
		}

		// Recurse into all properties
		for (const key of Object.keys(obj)) {
			const value = obj[key];
			if (value && typeof value === 'object') {
				this.walkForFunctions(value, functions);
			}
		}
	}

	/**
	 * Validate extracted function names against the allowlist.
	 */
	private validateFunctions(functions: string[]): void {
		for (const fn of functions) {
			if (!isAllowedFunction(fn, this.dbType)) {
				throw new SqlValidationError(`Function '${fn}' is not allowed`);
			}
		}
	}

	/**
	 * Rewrite table names in the AST from logical names to physical names
	 * using the provided mapping.
	 *
	 * Mutates the AST in place. Handles FROM, JOIN, UNION, CTE, and subqueries.
	 */
	private rewriteTableNames(ast: SqlAstNode, tableMapping: Map<string, string>): void {
		this.walkSelectAstForRewrite(ast, (fromEntry) => {
			if (typeof fromEntry.table === 'string') {
				const physical = tableMapping.get(fromEntry.table.toLowerCase());
				if (physical === undefined) {
					throw new SqlValidationError(
						`No physical table mapping found for table '${fromEntry.table}'`,
					);
				}
				fromEntry.table = physical;
			}
		});
	}

	/**
	 * Walk the AST to find all FROM entries for rewriting.
	 * Visits every table reference including in JOINs, UNIONs, CTEs, and subqueries.
	 */
	private walkSelectAstForRewrite(
		ast: SqlAstNode,
		rewriter: (fromEntry: SqlAstNode) => void,
	): void {
		// FROM clause (includes JOINs)
		const from = ast.from as SqlAstNode[] | null;
		if (Array.isArray(from)) {
			for (const entry of from) {
				if (typeof entry.table === 'string') {
					rewriter(entry);
				}

				// Derived table (subquery in FROM)
				if (entry.expr && typeof entry.expr === 'object') {
					const exprNode = entry.expr as SqlAstNode;
					if (exprNode.ast && typeof exprNode.ast === 'object') {
						this.walkSelectAstForRewrite(exprNode.ast as SqlAstNode, rewriter);
					}
				}
			}
		}

		// Subqueries in expressions (WHERE, HAVING, columns, etc.)
		this.walkExpressionsForRewrite(ast, rewriter);

		// CTE (WITH clause)
		const withClause = ast.with as SqlAstNode[] | null;
		if (Array.isArray(withClause)) {
			for (const cte of withClause) {
				if (cte.stmt && typeof cte.stmt === 'object') {
					this.walkSelectAstForRewrite(cte.stmt as SqlAstNode, rewriter);
				}
			}
		}

		// UNION chain
		if (ast._next && typeof ast._next === 'object') {
			this.walkSelectAstForRewrite(ast._next as SqlAstNode, rewriter);
		}
	}

	/**
	 * Walk all expression nodes for subqueries that need table rewriting.
	 */
	private walkExpressionsForRewrite(
		node: unknown,
		rewriter: (fromEntry: SqlAstNode) => void,
	): void {
		if (node === null || node === undefined || typeof node !== 'object') {
			return;
		}

		if (Array.isArray(node)) {
			for (const item of node) {
				this.walkExpressionsForRewrite(item, rewriter);
			}
			return;
		}

		const obj = node as SqlAstNode;

		// A subquery in an expression
		if (obj.ast && typeof obj.ast === 'object' && 'tableList' in (obj as Record<string, unknown>)) {
			const subAst = obj.ast as SqlAstNode;
			if (subAst.type === 'select') {
				this.walkSelectAstForRewrite(subAst, rewriter);
			}
		}

		for (const key of Object.keys(obj)) {
			if (key === 'from') continue;
			const value = obj[key];
			if (value && typeof value === 'object') {
				this.walkExpressionsForRewrite(value, rewriter);
			}
		}
	}
}
