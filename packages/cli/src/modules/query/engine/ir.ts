// Intermediate representation (IR) for a validated query.
//
// The IR is the engine's internal contract — produced by the validator,
// consumed by the compiler. It carries only structures that have already
// passed permission and field-whitelist checks, so downstream code can
// trust every reference in it.

export type IRSource =
	| { kind: 'executions' }
	| { kind: 'workflows' }
	| { kind: 'nodeOutput'; workflowId: string; nodeName: string };

export type IRScalar = string | number | boolean | null;

export type IRAggregateFn = 'count' | 'sum' | 'avg' | 'min' | 'max';

export type IRSelectItem =
	| { kind: 'star' }
	| { kind: 'column'; name: string }
	| { kind: 'aggregate'; fn: IRAggregateFn; arg: 'star' | string; as: string };

export type IRCompareOp = '=' | '!=' | '<>' | '<' | '>' | '<=' | '>=';

// WHERE filter — column LHS only. Aggregates in WHERE are rejected by the
// validator.
export type IRFilter =
	| { kind: 'and' | 'or'; left: IRFilter; right: IRFilter }
	| { kind: 'not'; arg: IRFilter }
	| { kind: 'compare'; op: IRCompareOp; field: string; value: IRScalar }
	| { kind: 'in'; field: string; values: IRScalar[] }
	| { kind: 'like'; field: string; pattern: string }
	| { kind: 'isNull' | 'isNotNull'; field: string };

// HAVING filter — aggregates allowed on the comparison LHS.
export type IRHavingFilter =
	| { kind: 'and' | 'or'; left: IRHavingFilter; right: IRHavingFilter }
	| { kind: 'not'; arg: IRHavingFilter }
	| { kind: 'compare'; op: IRCompareOp; lhs: IRHavingLHS; value: IRScalar }
	| { kind: 'in'; field: string; values: IRScalar[] }
	| { kind: 'like'; field: string; pattern: string }
	| { kind: 'isNull' | 'isNotNull'; field: string };

export type IRHavingLHS =
	| { kind: 'column'; field: string }
	| { kind: 'aggregate'; fn: IRAggregateFn; arg: 'star' | string };

export type IROrderBy =
	| { kind: 'column'; field: string; direction: 'asc' | 'desc' }
	| {
			kind: 'aggregate';
			fn: IRAggregateFn;
			arg: 'star' | string;
			direction: 'asc' | 'desc';
	  };

export type IRWindow =
	| { kind: 'last'; n: number }
	| { kind: 'since'; iso: string }
	| { kind: 'execution'; id: string };

export type IRQuery = {
	source: IRSource;
	select: IRSelectItem[];
	filter?: IRFilter;
	groupBy?: string[];
	having?: IRHavingFilter;
	orderBy?: IROrderBy[];
	limit?: number;
	window?: IRWindow;
	// joins + alias intentionally omitted in v1 — added in a follow-up (LEFT only)
};
