import type {
	CatchClauseKind,
	ExpressionKind,
	PatternKind,
	PropertyKind,
	StatementKind,
	VariableDeclaratorKind,
} from 'ast-types/lib/gen/kinds';

export const EXEMPT_IDENTIFIER_LIST = [
	'isFinite',
	'isNaN',
	'NaN',
	'Date',
	'RegExp',
	'Math',
	'undefined',
];

export type ParentKind =
	| ExpressionKind
	| StatementKind
	| PropertyKind
	| PatternKind
	| VariableDeclaratorKind
	| CatchClauseKind;
