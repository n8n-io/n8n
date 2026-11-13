/**
 * Lowers filter conditions (If version 2, Filter version 2, Switch version 3)
 * and the conditions of If version 1 to subset expressions.
 *
 * The rules follow `executeFilterCondition` in n8n-workflow. Strict type
 * validation fails in v1 when a value has the wrong type; the generated code
 * does not check types, so it can give `false` where v1 stops with an error.
 */
import ts from 'typescript';

import { checkRegex } from './code-native/regex-syntax.ts';
import { literal, print, unmarked } from './code.ts';
import { isRecord, text } from './types.ts';

export class ConditionError extends Error {
	readonly feature: string;

	constructor(message: string, feature: string) {
		super(message);
		this.feature = feature;
	}
}

export interface ConditionOptions {
	caseSensitive: boolean;
	loose: boolean;
	/** `options.version` of the filter value: version 2 parses loose booleans first. */
	version?: number;
	/** The time zone of the workflow (Luxon's default zone in v1), for dateTime conditions. */
	zone?: string;
}

/** Translates one operand value (literal or expression) to code. */
export type Operand = (
	value: unknown,
	path: string,
) => { code: string; literal: boolean; value: unknown };

const wrap = (code: string) =>
	/^[$A-Za-z_][\w$]*(\??\.[$A-Za-z_][\w$]*|\[[^\][]*\])*$/.test(unmarked(code))
		? code
		: `(${code})`;

/**
 * The nullishness of an expression by its syntax, as TypeScript reads it
 * (`getSyntacticNullishnessSemantics`). TypeScript rejects `a ?? b` when `a`
 * is never nullish (TS2869, for example a string literal) or always nullish
 * (TS2871).
 */
export function nullishness(node: ts.Expression): 'never' | 'always' | 'sometimes' {
	let e = node;
	while (
		ts.isParenthesizedExpression(e) ||
		ts.isAsExpression(e) ||
		ts.isNonNullExpression(e) ||
		ts.isSatisfiesExpression(e)
	) {
		e = e.expression;
	}
	if (
		ts.isAwaitExpression(e) ||
		ts.isCallExpression(e) ||
		ts.isTaggedTemplateExpression(e) ||
		ts.isElementAccessExpression(e) ||
		ts.isMetaProperty(e) ||
		ts.isNewExpression(e) ||
		ts.isPropertyAccessExpression(e) ||
		ts.isYieldExpression(e) ||
		e.kind === ts.SyntaxKind.ThisKeyword
	) {
		return 'sometimes';
	}
	if (ts.isBinaryExpression(e)) {
		const op = e.operatorToken.kind;
		// `a ?? b` is nullish only when `b` is, so TypeScript reads the right side.
		if (
			op === ts.SyntaxKind.CommaToken ||
			op === ts.SyntaxKind.EqualsToken ||
			op === ts.SyntaxKind.QuestionQuestionToken ||
			op === ts.SyntaxKind.QuestionQuestionEqualsToken
		) {
			return nullishness(e.right);
		}
		const sometimes = [
			ts.SyntaxKind.BarBarToken,
			ts.SyntaxKind.BarBarEqualsToken,
			ts.SyntaxKind.AmpersandAmpersandToken,
			ts.SyntaxKind.AmpersandAmpersandEqualsToken,
		];
		return sometimes.includes(op) ? 'sometimes' : 'never';
	}
	if (ts.isConditionalExpression(e)) {
		const a = nullishness(e.whenTrue);
		const b = nullishness(e.whenFalse);
		return a === b ? a : 'sometimes';
	}
	if (e.kind === ts.SyntaxKind.NullKeyword) return 'always';
	if (ts.isIdentifier(e)) return e.text === 'undefined' ? 'always' : 'sometimes';
	return 'never';
}

/** `(code ?? fallback)`, or the side that TypeScript accepts when `code` is never or always nullish. */
function orElse(code: string, fallback: string): string {
	const sf = ts.createSourceFile('o.ts', `(${unmarked(code)});`, ts.ScriptTarget.ES2022, true);
	const statement = sf.statements[0];
	const kind =
		sf.statements.length === 1 && ts.isExpressionStatement(statement)
			? nullishness(statement.expression)
			: 'sometimes';
	if (kind === 'never') return wrap(code);
	if (kind === 'always') return fallback;
	return `(${wrap(code)} ?? ${fallback})`;
}

/** parseRegexLiteral of n8n-workflow: `/source/flags`, or the whole text as the source. */
function regexLiteral(value: string, ignoreCase: boolean): { source: string; flags: string } {
	const match = /^\/(.*?)\/([gimusy]*)$/.exec(value);
	if (!match) return { source: value, flags: ignoreCase ? 'i' : '' };
	let flags = match[2] ?? '';
	if (ignoreCase && !flags.includes('i')) flags += 'i';
	return { source: match[1] ?? '', flags };
}

function numberLiteral(value: unknown): string | null {
	if (typeof value === 'number') return String(value);
	if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
		return String(Number(value));
	}
	return null;
}

/** Code of a literal value, with single-quoted strings. */
const lit = (value: unknown): string => print(literal(value), '', 0, Number.MAX_SAFE_INTEGER);

/** Options of a filter value merged with node options. */
export function filterOptions(
	filter: unknown,
	nodeOptions: Record<string, unknown>,
	looseParameter: unknown,
): ConditionOptions {
	const o = isRecord(filter) && isRecord(filter.options) ? filter.options : {};
	const caseSensitive =
		nodeOptions.ignoreCase === true
			? false
			: o.caseSensitive === undefined
				? true
				: o.caseSensitive !== false;
	const loose =
		o.typeValidation === 'loose' ||
		nodeOptions.looseTypeValidation === true ||
		looseParameter === true;
	const version = typeof o.version === 'number' ? o.version : 1;
	return { caseSensitive, loose, version };
}

/** Lowers a filter value `{ conditions, combinator, options }` to one boolean expression. */
export function filterCode(
	filter: unknown,
	options: ConditionOptions,
	operand: Operand,
	path: string,
): string {
	if (!isRecord(filter)) return 'false';
	// A filter value without a `conditions` list (old parameters on a new node version)
	// has no conditions in v1: "and" passes every item, "or" passes none.
	const conditions = Array.isArray(filter.conditions) ? filter.conditions : [];
	const parts = conditions.map((c, k) =>
		conditionCode(c, options, operand, `${path}.conditions[${k}]`),
	);
	if (parts.length === 0) return filter.combinator === 'or' ? 'false' : 'true';
	if (parts.length === 1) return parts[0];
	// Each part is one comparison, so it binds tighter than && and ||.
	return parts.join(filter.combinator === 'or' ? ' || ' : ' && ');
}

function conditionCode(
	condition: unknown,
	options: ConditionOptions,
	operand: Operand,
	path: string,
): string {
	if (!isRecord(condition)) return 'false';
	const operator = isRecord(condition.operator) ? condition.operator : {};
	const type = typeof operator.type === 'string' ? operator.type : 'string';
	const operation = typeof operator.operation === 'string' ? operator.operation : 'equals';
	const left = operand(condition.leftValue, `${path}.leftValue`);
	const L = wrap(left.code);
	if (operation === 'exists') return `${L} != null`;
	if (operation === 'notExists') return `${L} == null`;
	const rightOf = () => operand(condition.rightValue, `${path}.rightValue`);
	switch (type) {
		case 'string': {
			const ci = !options.caseSensitive;
			const lower = (code: string) => (ci ? `${code}.toLowerCase()` : code);
			const leftText = left.literal
				? lit(text(left.value))
				: options.loose
					? `String(${orElse(left.code, "''")})`
					: orElse(left.code, "''");
			const l = lower(leftText);
			const rightString = () => {
				const r = rightOf();
				if (r.literal) {
					const value = text(r.value);
					return `'${(ci ? value.toLowerCase() : value).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;
				}
				return lower(`String(${orElse(r.code, "''")})`);
			};
			switch (operation) {
				case 'empty':
					return `${l}.length === 0`;
				case 'notEmpty':
					return `${l}.length !== 0`;
				case 'equals':
					return `${l} === ${rightString()}`;
				case 'notEquals':
					return `${l} !== ${rightString()}`;
				case 'contains':
					return `${l}.includes(${rightString()})`;
				case 'notContains':
					return `!${l}.includes(${rightString()})`;
				case 'startsWith':
					return `${l}.startsWith(${rightString()})`;
				case 'notStartsWith':
					return `!${l}.startsWith(${rightString()})`;
				case 'endsWith':
					return `${l}.endsWith(${rightString()})`;
				case 'regex':
				case 'notRegex': {
					// v1: `new RegExp(source, flags).test(left)` with the pattern of a literal
					// `/source/flags` or the whole text. Version 4 adds the `i` flag when the
					// filter ignores case; before it, only the left side is lowercased.
					const r = rightOf();
					if (!r.literal) {
						throw new ConditionError(
							'A regular expression condition with a computed pattern is not supported.',
							`condition string.${operation}`,
						);
					}
					const v4 = (options.version ?? 1) >= 4;
					const pattern = regexLiteral(text(r.value), ci && v4);
					const checked = checkRegex(pattern.source, pattern.flags);
					if (!checked.ok) {
						throw new ConditionError(
							`The regular expression is not supported: ${checked.reason}.`,
							`condition string.${operation}`,
						);
					}
					const subject = ci && v4 ? leftText : l;
					const test = `RegExp.exec(${lit(pattern.source)}, ${lit(pattern.flags)}, ${subject}, 0) !== null`;
					return operation === 'regex' ? `(${test})` : `!(${test})`;
				}
				case 'notEndsWith':
					return `!${l}.endsWith(${rightString()})`;
				default:
					throw new ConditionError(
						`The string operation "${operation}" is not supported.`,
						`condition string.${operation}`,
					);
			}
		}
		case 'number': {
			const l = options.loose && !left.literal ? `Number(${left.code})` : L;
			const rightNumber = () => {
				const r = rightOf();
				if (r.literal) {
					const n = numberLiteral(r.value);
					if (n !== null) return n;
					return r.value === null || r.value === undefined ? 'null' : lit(r.value);
				}
				return options.loose ? `Number(${r.code})` : wrap(r.code);
			};
			switch (operation) {
				case 'empty':
					return `${L} == null`;
				case 'notEmpty':
					return `${L} != null`;
				case 'equals':
					return `${l} === ${rightNumber()}`;
				case 'notEquals':
					return `${l} !== ${rightNumber()}`;
				case 'gt':
					return `${l} > ${rightNumber()}`;
				case 'lt':
					return `${l} < ${rightNumber()}`;
				case 'gte':
					return `${l} >= ${rightNumber()}`;
				case 'lte':
					return `${l} <= ${rightNumber()}`;
				default:
					throw new ConditionError(
						`The number operation "${operation}" is not supported.`,
						`condition number.${operation}`,
					);
			}
		}
		case 'boolean': {
			const parse = (options.version ?? 1) >= 2;
			const l = options.loose ? `looseBoolean(${left.code}, ${parse})` : L;
			const rightBool = () => {
				const r = rightOf();
				if (r.literal) return String(r.value === true || r.value === 'true');
				return options.loose ? `looseBoolean(${r.code}, ${parse})` : wrap(r.code);
			};
			switch (operation) {
				case 'empty':
					return `${L} == null`;
				case 'notEmpty':
					return `${L} != null`;
				case 'true':
					return `${l} === true`;
				case 'false':
					// v1 gives `!left`: a missing value (null or undefined) is false too.
					return `${l} !== true`;
				case 'equals':
					return `${l} === ${rightBool()}`;
				case 'notEquals':
					return `${l} !== ${rightBool()}`;
				default:
					throw new ConditionError(
						`The boolean operation "${operation}" is not supported.`,
						`condition boolean.${operation}`,
					);
			}
		}
		case 'array': {
			const l = left.literal
				? left.value === null || left.value === undefined
					? '[]'
					: left.code
				: orElse(left.code, '[]');
			const right = () => {
				const r = rightOf();
				if (r.literal) {
					const n = numberLiteral(r.value);
					if (operation.startsWith('length') && n !== null) return n;
					return lit(r.value);
				}
				return wrap(r.code);
			};
			switch (operation) {
				case 'contains':
					return `${l}.includes(${right()})`;
				case 'notContains':
					return `!${l}.includes(${right()})`;
				case 'lengthEquals':
					return `${l}.length === ${right()}`;
				case 'lengthNotEquals':
					return `${l}.length !== ${right()}`;
				case 'lengthGt':
					return `${l}.length > ${right()}`;
				case 'lengthLt':
					return `${l}.length < ${right()}`;
				case 'lengthGte':
					return `${l}.length >= ${right()}`;
				case 'lengthLte':
					return `${l}.length <= ${right()}`;
				case 'empty':
					return `${l}.length === 0`;
				case 'notEmpty':
					return `${l}.length !== 0`;
				default:
					throw new ConditionError(
						`The array operation "${operation}" is not supported.`,
						`condition array.${operation}`,
					);
			}
		}
		case 'dateTime': {
			if (operation === 'empty') return `${L} == null`;
			if (operation === 'notEmpty') return `${L} != null`;
			const ops = ['equals', 'notEquals', 'after', 'before', 'afterOrEquals', 'beforeOrEquals'];
			if (!options.zone || !ops.includes(operation)) {
				throw new ConditionError(
					`The dateTime operation "${operation}" is not supported.`,
					`condition dateTime.${operation}`,
				);
			}
			// tryToParseDateTime of v1 on both sides (helper `filterDate`), then the comparison.
			const index = /\[(\d+)\]$/.exec(path)?.[1] ?? '0';
			const date = (code: string) =>
				`filterDate(${code}, ${lit(options.zone)}, ${String(!options.loose)}, ${index})`;
			const r = rightOf();
			const rightCode = r.literal ? lit(r.value) : wrap(r.code);
			return `filterDateCompare(${lit(operation)}, ${date(wrap(left.code))}, ${date(rightCode)})`;
		}
		case 'object': {
			const o = left.literal
				? left.value === null || left.value === undefined
					? '{}'
					: left.code
				: orElse(left.code, '{}');
			if (operation === 'empty') return `Object.keys(${o}).length === 0`;
			if (operation === 'notEmpty') return `Object.keys(${o}).length !== 0`;
			throw new ConditionError(
				`The object operation "${operation}" is not supported.`,
				`condition object.${operation}`,
			);
		}
		default:
			throw new ConditionError(
				`Conditions of type "${type}" are not supported.`,
				`condition ${type}`,
			);
	}
}

/** `(code || 0)`; a number literal stays as it is (0 for a falsy literal). */
function orZero(code: string): string {
	if (/^-?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(code)) return Number(code) ? code : '0';
	if (/^(['"]).*\1$/.test(code)) return code.length > 2 ? code : '0';
	if (code === 'true' || code === 'false' || code === 'null') return code === 'true' ? code : '0';
	return `(${code} || 0)`;
}

/**
 * One comparison of If version 1 and Switch versions 1 and 2: `type` is
 * `boolean`, `number` or `string`, and the operation names are the v1 names.
 */
export function v1Compare(
	type: string,
	op: string,
	left: ReturnType<Operand>,
	right: () => string,
): string {
	const L = wrap(left.code);
	if (type === 'dateTime') {
		throw new ConditionError(
			'Date conditions of version 1 nodes are not supported.',
			'condition dateTime',
		);
	}
	if (type === 'boolean') return op === 'notEqual' ? `${L} !== ${right()}` : `${L} === ${right()}`;
	const s = left.literal ? lit(text(left.value)) : `String(${orElse(left.code, "''")})`;
	switch (op) {
		// v1 compares `(value1 || 0)` with `(value2 || 0)`: a missing value counts as 0.
		case 'smaller':
			return `${orZero(L)} < ${orZero(right())}`;
		case 'smallerEqual':
			return `${orZero(L)} <= ${orZero(right())}`;
		case 'larger':
			return `${orZero(L)} > ${orZero(right())}`;
		case 'largerEqual':
			return `${orZero(L)} >= ${orZero(right())}`;
		case 'equal':
			return `${L} === ${right()}`;
		case 'notEqual':
			return `${L} !== ${right()}`;
		case 'isEmpty':
			return `isEmptyValue(${left.code})`;
		case 'isNotEmpty':
			return `!isEmptyValue(${left.code})`;
		case 'contains':
			return `${s}.includes(${right()})`;
		case 'notContains':
			return `!${s}.includes(${right()})`;
		case 'startsWith':
			return `${s}.startsWith(${right()})`;
		case 'notStartsWith':
			return `!${s}.startsWith(${right()})`;
		case 'endsWith':
			return `${s}.endsWith(${right()})`;
		case 'notEndsWith':
			return `!${s}.endsWith(${right()})`;
		default:
			throw new ConditionError(
				`The version 1 operation "${op}" is not supported.`,
				`condition ${type}.${op}`,
			);
	}
}

/** The code of a v1 right-hand value: literals as JSON, expressions as code. */
export function v1Right(operand: Operand, value: unknown, path: string): () => string {
	return () => {
		const v = operand(value, path);
		return v.literal ? lit(v.value) : wrap(v.code);
	};
}

/** Lowers the conditions of If version 1 (`conditions.{boolean,number,string}`). */
export function ifV1Code(parameters: Record<string, unknown>, operand: Operand): string {
	const conditions = isRecord(parameters.conditions) ? parameters.conditions : {};
	const parts: string[] = [];
	for (const type of ['boolean', 'dateTime', 'number', 'string']) {
		const list = conditions[type];
		if (!Array.isArray(list)) continue;
		list.forEach((c: unknown, k: number) => {
			if (!isRecord(c)) return;
			const path = `conditions.${type}[${k}]`;
			const op =
				typeof c.operation === 'string' ? c.operation : type === 'number' ? 'smaller' : 'equal';
			const left =
				type === 'dateTime'
					? { code: '', literal: true, value: null }
					: operand(c.value1, `${path}.value1`);
			parts.push(v1Compare(type, op, left, v1Right(operand, c.value2, `${path}.value2`)));
		});
	}
	if (parts.length === 0) return 'false';
	return parts.join(parameters.combineOperation === 'any' ? ' || ' : ' && ');
}
