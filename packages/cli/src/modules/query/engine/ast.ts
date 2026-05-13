// AST nodes produced by the parser, consumed by the validator.
//
// `position` is attached to nodes the validator may need to report on
// (column references, source identifiers). Other nodes don't need positions
// — they're never the locus of a validation error.

export type SelectStmt = {
	kind: 'Select';
	columns: SelectColumn[];
	from: FromClause;
	where?: Expr;
	groupBy?: ColumnRef[];
	having?: Expr;
	orderBy?: OrderByItem[];
	limit?: number;
};

export type SelectColumn = { kind: 'star' } | ScalarExpr;

export type ScalarExpr =
	| { kind: 'column'; ref: ColumnRef }
	| {
			kind: 'aggregate';
			fn: 'count' | 'sum' | 'avg' | 'min' | 'max';
			arg: ColumnRef | 'star';
	  };

export type ColumnRef = { name: string; position: number };

export type FromClause = { source: Source; window?: WindowClause };

export type Source =
	| { kind: 'systemTable'; name: string; position: number }
	| { kind: 'nodeOutput'; workflow: string; node: string; position: number };

export type WindowClause =
	| { kind: 'last'; n: number }
	| { kind: 'since'; iso: string }
	| { kind: 'execution'; id: string };

export type CompareOp = '=' | '!=' | '<>' | '<' | '>' | '<=' | '>=';

export type Expr =
	| { kind: 'and' | 'or'; left: Expr; right: Expr }
	| { kind: 'not'; arg: Expr }
	| { kind: 'compare'; op: CompareOp; left: ScalarExpr; right: Literal }
	| { kind: 'in'; left: ColumnRef; values: Literal[] }
	| { kind: 'like'; left: ColumnRef; pattern: string }
	| { kind: 'isNull' | 'isNotNull'; arg: ColumnRef };

export type Literal = { value: string | number | boolean | null };

export type OrderByItem = { expr: ScalarExpr; direction: 'asc' | 'desc' };
