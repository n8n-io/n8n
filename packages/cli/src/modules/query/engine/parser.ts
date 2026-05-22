import type {
	ColumnRef,
	CompareOp,
	Expr,
	FromClause,
	Literal,
	OrderByItem,
	ScalarExpr,
	SelectColumn,
	SelectStmt,
	Source,
	WindowClause,
} from './ast';
import { ParseError } from './errors';
import type { Token } from './lexer';

const AGGREGATE_FNS = new Set(['COUNT', 'SUM', 'AVG', 'MIN', 'MAX']);
const JOIN_KEYWORDS = new Set(['JOIN', 'LEFT', 'RIGHT', 'INNER', 'FULL', 'CROSS']);

export function parse(tokens: Token[]): SelectStmt {
	let i = 0;

	const peek = (offset = 0): Token => tokens[i + offset];
	const advance = (): Token => tokens[i++];

	const matchKw = (...names: string[]): Token | null => {
		const t = peek();
		if (t.kind === 'KEYWORD' && names.includes(t.value)) {
			i++;
			return t;
		}
		return null;
	};

	const expectKw = (name: string): Token => {
		const t = peek();
		if (t.kind === 'KEYWORD' && t.value === name) {
			i++;
			return t;
		}
		throw new ParseError(`Expected ${name}, got ${describe(t)}`, t.start);
	};

	const matchPunct = (p: string): boolean => {
		const t = peek();
		if (t.kind === 'PUNCT' && t.value === p) {
			i++;
			return true;
		}
		return false;
	};

	const expectPunct = (p: string): void => {
		const t = peek();
		if (t.kind === 'PUNCT' && t.value === p) {
			i++;
			return;
		}
		throw new ParseError(`Expected '${p}', got ${describe(t)}`, t.start);
	};

	const describe = (t: Token): string => {
		switch (t.kind) {
			case 'EOF':
				return 'end of input';
			case 'STAR':
				return "'*'";
			case 'KEYWORD':
				return `keyword ${t.value}`;
			case 'IDENT':
				return `identifier '${t.value}'`;
			case 'STRING':
				return `string '${t.value}'`;
			case 'NUMBER':
				return `number ${t.value}`;
			case 'OPERATOR':
				return `operator '${t.value}'`;
			case 'PUNCT':
				return `'${t.value}'`;
		}
	};

	const rejectJoin = (): void => {
		const t = peek();
		if (t.kind === 'KEYWORD' && JOIN_KEYWORDS.has(t.value)) {
			throw new ParseError('JOIN clauses are not supported in v1', t.start, 'JOINS_NOT_SUPPORTED');
		}
	};

	const rejectAlias = (): void => {
		const t = peek();
		if (t.kind === 'KEYWORD' && t.value === 'AS') {
			throw new ParseError('Aliases are not supported in v1', t.start, 'ALIASES_NOT_SUPPORTED');
		}
	};

	function parseSelectStmt(): SelectStmt {
		expectKw('SELECT');
		const columns = parseSelectColumns();

		expectKw('FROM');
		const from = parseFromClause();

		const where = matchKw('WHERE') ? parseExpr() : undefined;

		let groupBy: ColumnRef[] | undefined;
		if (matchKw('GROUP')) {
			expectKw('BY');
			groupBy = parseColumnList();
		}

		const having = matchKw('HAVING') ? parseExpr() : undefined;

		let orderBy: OrderByItem[] | undefined;
		if (matchKw('ORDER')) {
			expectKw('BY');
			orderBy = parseOrderByList();
		}

		let limit: number | undefined;
		if (matchKw('LIMIT')) {
			const t = peek();
			if (t.kind !== 'NUMBER') {
				throw new ParseError(`Expected number after LIMIT, got ${describe(t)}`, t.start);
			}
			advance();
			limit = t.value;
		}

		const stmt: SelectStmt = { kind: 'Select', columns, from };
		if (where !== undefined) stmt.where = where;
		if (groupBy !== undefined) stmt.groupBy = groupBy;
		if (having !== undefined) stmt.having = having;
		if (orderBy !== undefined) stmt.orderBy = orderBy;
		if (limit !== undefined) stmt.limit = limit;
		return stmt;
	}

	function parseSelectColumns(): SelectColumn[] {
		if (peek().kind === 'STAR') {
			advance();
			return [{ kind: 'star' }];
		}

		const columns: SelectColumn[] = [parseScalarExpr()];
		rejectAlias();
		while (matchPunct(',')) {
			columns.push(parseScalarExpr());
			rejectAlias();
		}
		return columns;
	}

	function parseScalarExpr(): ScalarExpr {
		const t = peek();

		if (t.kind === 'KEYWORD' && AGGREGATE_FNS.has(t.value)) {
			advance();
			expectPunct('(');
			const argT = peek();
			let arg: ColumnRef | 'star';
			if (argT.kind === 'STAR') {
				advance();
				arg = 'star';
			} else if (argT.kind === 'IDENT') {
				advance();
				arg = { name: argT.value, position: argT.start };
			} else {
				throw new ParseError(
					`Expected column or * in aggregate, got ${describe(argT)}`,
					argT.start,
				);
			}
			expectPunct(')');
			return {
				kind: 'aggregate',
				fn: t.value.toLowerCase() as 'count' | 'sum' | 'avg' | 'min' | 'max',
				arg,
			};
		}

		if (t.kind === 'IDENT') {
			advance();
			return { kind: 'column', ref: { name: t.value, position: t.start } };
		}

		throw new ParseError(`Expected column or aggregate, got ${describe(t)}`, t.start);
	}

	function parseColumnRef(): ColumnRef {
		const t = peek();
		if (t.kind !== 'IDENT') {
			throw new ParseError(`Expected column, got ${describe(t)}`, t.start);
		}
		advance();
		return { name: t.value, position: t.start };
	}

	function parseColumnList(): ColumnRef[] {
		const list = [parseColumnRef()];
		while (matchPunct(',')) list.push(parseColumnRef());
		return list;
	}

	function parseFromClause(): FromClause {
		const source = parseSource();
		rejectJoin();
		rejectAlias();
		const window = parseOptionalWindow();
		return window !== undefined ? { source, window } : { source };
	}

	function parseSource(): Source {
		const t = peek();
		if (t.kind === 'IDENT') {
			advance();
			return { kind: 'systemTable', name: t.value, position: t.start };
		}
		if (t.kind === 'STRING') {
			advance();
			expectPunct('.');
			const nodeT = peek();
			if (nodeT.kind !== 'STRING') {
				throw new ParseError(
					`Expected quoted node name after '.', got ${describe(nodeT)}`,
					nodeT.start,
				);
			}
			advance();
			return {
				kind: 'nodeOutput',
				workflow: t.value,
				node: nodeT.value,
				position: t.start,
			};
		}
		throw new ParseError(`Expected source after FROM, got ${describe(t)}`, t.start);
	}

	function parseOptionalWindow(): WindowClause | undefined {
		const t = peek();
		if (t.kind !== 'KEYWORD') return undefined;

		if (t.value === 'LAST') {
			advance();
			const n = peek();
			if (n.kind !== 'NUMBER') {
				throw new ParseError(`Expected number after LAST, got ${describe(n)}`, n.start);
			}
			advance();
			return { kind: 'last', n: n.value };
		}

		if (t.value === 'SINCE') {
			advance();
			const s = peek();
			if (s.kind !== 'STRING') {
				throw new ParseError(`Expected string after SINCE, got ${describe(s)}`, s.start);
			}
			advance();
			return { kind: 'since', iso: s.value };
		}

		if (t.value === 'EXECUTION') {
			advance();
			const s = peek();
			if (s.kind !== 'STRING') {
				throw new ParseError(`Expected string after EXECUTION, got ${describe(s)}`, s.start);
			}
			advance();
			return { kind: 'execution', id: s.value };
		}

		return undefined;
	}

	function parseExpr(): Expr {
		let left = parseAndExpr();
		while (matchKw('OR')) {
			const right = parseAndExpr();
			left = { kind: 'or', left, right };
		}
		return left;
	}

	function parseAndExpr(): Expr {
		let left = parseUnaryExpr();
		while (matchKw('AND')) {
			const right = parseUnaryExpr();
			left = { kind: 'and', left, right };
		}
		return left;
	}

	function parseUnaryExpr(): Expr {
		if (matchKw('NOT')) {
			return { kind: 'not', arg: parseUnaryExpr() };
		}
		return parsePrimary();
	}

	function parsePrimary(): Expr {
		if (matchPunct('(')) {
			const e = parseExpr();
			expectPunct(')');
			return e;
		}
		return parsePredicate();
	}

	function parsePredicate(): Expr {
		const t = peek();

		if (t.kind === 'KEYWORD' && AGGREGATE_FNS.has(t.value)) {
			const left = parseScalarExpr();
			return parseCompareTail(left);
		}

		if (t.kind === 'IDENT') {
			const colRef = parseColumnRef();
			const next = peek();

			if (next.kind === 'KEYWORD' && next.value === 'IS') {
				advance();
				if (matchKw('NOT')) {
					expectKw('NULL');
					return { kind: 'isNotNull', arg: colRef };
				}
				expectKw('NULL');
				return { kind: 'isNull', arg: colRef };
			}

			if (next.kind === 'KEYWORD' && next.value === 'IN') {
				advance();
				expectPunct('(');
				const values: Literal[] = [parseLiteral()];
				while (matchPunct(',')) values.push(parseLiteral());
				expectPunct(')');
				return { kind: 'in', left: colRef, values };
			}

			if (next.kind === 'KEYWORD' && next.value === 'LIKE') {
				advance();
				const s = peek();
				if (s.kind !== 'STRING') {
					throw new ParseError(`Expected pattern after LIKE, got ${describe(s)}`, s.start);
				}
				advance();
				return { kind: 'like', left: colRef, pattern: s.value };
			}

			return parseCompareTail({ kind: 'column', ref: colRef });
		}

		throw new ParseError(`Expected predicate, got ${describe(t)}`, t.start);
	}

	function parseCompareTail(left: ScalarExpr): Expr {
		const t = peek();
		if (t.kind !== 'OPERATOR') {
			throw new ParseError(`Expected comparison operator, got ${describe(t)}`, t.start);
		}
		advance();
		const right = parseLiteral();
		return { kind: 'compare', op: t.value as CompareOp, left, right };
	}

	function parseLiteral(): Literal {
		const t = peek();
		if (t.kind === 'STRING') {
			advance();
			return { value: t.value };
		}
		if (t.kind === 'NUMBER') {
			advance();
			return { value: t.value };
		}
		if (t.kind === 'KEYWORD' && t.value === 'NULL') {
			advance();
			return { value: null };
		}
		throw new ParseError(`Expected literal, got ${describe(t)}`, t.start);
	}

	function parseOrderByList(): OrderByItem[] {
		const items = [parseOrderByItem()];
		while (matchPunct(',')) items.push(parseOrderByItem());
		return items;
	}

	function parseOrderByItem(): OrderByItem {
		const expr = parseScalarExpr();
		let direction: 'asc' | 'desc' = 'asc';
		if (matchKw('DESC')) direction = 'desc';
		else if (matchKw('ASC')) direction = 'asc';
		return { expr, direction };
	}

	const stmt = parseSelectStmt();
	const trailing = peek();
	if (trailing.kind !== 'EOF') {
		throw new ParseError(`Unexpected token after statement: ${describe(trailing)}`, trailing.start);
	}
	return stmt;
}
