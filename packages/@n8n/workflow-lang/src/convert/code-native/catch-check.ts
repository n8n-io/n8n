/**
 * Native code for a `catch` block that reads the error.
 *
 * The block may read the error only when the runtime gives the error that V8
 * gives. The runtime gives V8's messages for property reads and writes of
 * `undefined` and `null`, for `JSON.parse` (`json_error.zig`), for iteration
 * (`iterOf`) and for thrown values. For a method call on a value of unknown
 * kind, the translation checks the receiver first (`mcheck`): when the value
 * has no such method, it throws V8's "x.m is not a function" text, which this
 * module prints from the source as V8's CallPrinter does. Any other operation
 * in the `try` block that can throw keeps the node in the host.
 *
 * In the `catch` block, `String(e)`, `` `${e}` ``, `e.toString()` and `'…' + e`
 * become `errText(e)`, V8's `Error.prototype.toString`. Reads of properties
 * other than `stack` stay. Other uses of the error keep the node in the host.
 */
import ts from 'typescript';

export interface CatchPlan {
	/** Nodes to write as `errText(<error>)`. */
	errText: ts.Node[];
	/** Receivers of method calls to check, with V8's text of the callee. */
	checks: Array<{ receiver: ts.Expression; method: string; text: string }>;
}

/** Global functions that throw only V8's messages, or never. */
const SAFE_FUNCTIONS = new Set([
	'String',
	'Number',
	'Boolean',
	'parseInt',
	'parseFloat',
	'isNaN',
	'isFinite',
	'$',
	'$items',
]);

/** Static methods that throw only V8's messages, or never, by object. */
const SAFE_STATICS: Record<string, Set<string> | 'all'> = {
	JSON: new Set(['parse', 'stringify']),
	Math: 'all',
	Object: new Set(['keys', 'values', 'entries', 'assign']),
	Array: new Set(['isArray']),
	['Number']: new Set([
		'isNaN',
		'isInteger',
		'isFinite',
		'isSafeInteger',
		'parseFloat',
		'parseInt',
	]),
	Date: new Set(['now', 'UTC', 'parse']),
	['String']: new Set(['fromCharCode']),
	console: 'all',
};

/** Methods that call their first argument. */
const CALLBACK_METHODS = new Set([
	'map',
	'filter',
	'forEach',
	'find',
	'findIndex',
	'findLast',
	'findLastIndex',
	'some',
	'every',
	'reduce',
	'reduceRight',
	'flatMap',
]);

/** Variables of n8n whose members the translation knows. */
const N8N_ROOTS = new Set([
	'$input',
	'$json',
	'$node',
	'$execution',
	'$workflow',
	'$vars',
	'items',
	'item',
]);

const ERROR_CONSTRUCTORS = new Set([
	'Date',
	'Error',
	'TypeError',
	'RangeError',
	'SyntaxError',
	'Set',
	'Map',
]);

function strip(e: ts.Expression): ts.Expression {
	let x = e;
	while (ts.isParenthesizedExpression(x)) x = x.expression;
	return x;
}

/** V8's CallPrinter text of an expression, for the forms it prints from source; null otherwise. */
export function calleeText(e: ts.Expression): string | null {
	if (ts.isParenthesizedExpression(e)) {
		const group = groupText(strip(e));
		if (group !== null) return group;
	}
	const x = strip(e);
	if (ts.isIdentifier(x)) return x.text;
	if (x.kind === ts.SyntaxKind.ThisKeyword) return 'this';
	if (ts.isPropertyAccessExpression(x)) {
		const obj = calleeText(x.expression);
		return obj === null ? null : `${obj}${x.questionDotToken ? '?.' : '.'}${x.name.text}`;
	}
	if (ts.isElementAccessExpression(x)) {
		const obj = calleeText(x.expression);
		if (obj === null) return null;
		const dot = x.questionDotToken ? '?.' : '';
		const a = x.argumentExpression;
		if (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a))
			return `${obj}${dot || '.'}${a.text}`;
		if (ts.isNumericLiteral(a) && /^(0|[1-9]\d{0,8})$/.test(a.text))
			return `${obj}${dot}[${a.text}]`;
		if (ts.isIdentifier(a)) return `${obj}${dot}[${a.text}]`;
		return null;
	}
	if (ts.isCallExpression(x)) {
		const callee = calleeText(x.expression);
		return callee === null ? null : `${callee}${x.questionDotToken ? '?.' : ''}(...)`;
	}
	if (ts.isStringLiteral(x) || ts.isNoSubstitutionTemplateLiteral(x)) return `"${x.text}"`;
	if (ts.isNewExpression(x)) return '(intermediate value)';
	return null;
}

const PRINTED_OPERATORS = new Set([
	ts.SyntaxKind.BarBarToken,
	ts.SyntaxKind.AmpersandAmpersandToken,
	ts.SyntaxKind.QuestionQuestionToken,
	ts.SyntaxKind.PlusToken,
	ts.SyntaxKind.MinusToken,
	ts.SyntaxKind.AsteriskToken,
	ts.SyntaxKind.SlashToken,
]);

/** An operand inside parentheses, as V8 prints it; null for other forms. */
function operandText(e: ts.Expression): string | null {
	const x = strip(e);
	if (ts.isNumericLiteral(x)) return String(Number(x.text));
	if (x.kind === ts.SyntaxKind.NullKeyword) return 'null';
	if (x.kind === ts.SyntaxKind.TrueKeyword) return 'true';
	if (x.kind === ts.SyntaxKind.FalseKeyword) return 'false';
	if (ts.isObjectLiteralExpression(x) && x.properties.length === 0) return '{}';
	if (ts.isArrayLiteralExpression(x)) {
		const parts = x.elements.map((el) => (ts.isExpression(el) ? operandText(el) : null));
		return parts.every((p) => p !== null) ? `[${parts.join(',')}]` : null;
	}
	return calleeText(x);
}

/** V8's text of `(a || b)` and `(!a)`: one operator over its left-nested chain. */
function groupText(e: ts.Expression): string | null {
	if (ts.isPrefixUnaryExpression(e) && e.operator === ts.SyntaxKind.ExclamationToken) {
		const inner = operandText(e.operand);
		return inner === null ? null : `(!${inner})`;
	}
	if (!ts.isBinaryExpression(e) || !PRINTED_OPERATORS.has(e.operatorToken.kind)) return null;
	const op = e.operatorToken.kind;
	const parts: string[] = [];
	let cur: ts.Expression = e;
	while (ts.isBinaryExpression(cur) && cur.operatorToken.kind === op) {
		const right = operandText(cur.right);
		if (right === null || ts.isBinaryExpression(strip(cur.right))) return null;
		parts.unshift(right);
		cur = cur.left;
	}
	const first = ts.isBinaryExpression(cur) ? null : operandText(cur);
	if (first === null) return null;
	parts.unshift(first);
	return `(${parts.join(` ${e.operatorToken.getText()} `)})`;
}

/** Plans the native form of `t`, whose catch block reads the error; a string is the reason it has none. */
export function planCatch(
	t: ts.TryStatement,
	checker: ts.TypeChecker,
	known: { dateVars: Set<ts.Symbol> },
): CatchPlan | string {
	const clause = t.catchClause;
	const decl = clause?.variableDeclaration;
	if (!clause || !decl || !ts.isIdentifier(decl.name)) return 'a catch without a plain error name';
	const sym = checker.getSymbolAtLocation(decl.name);
	const plan: CatchPlan = { errText: [], checks: [] };

	// Uses of the error.
	let reason: string | null = null;
	const uses = (x: ts.Node): void => {
		if (reason !== null) return;
		if (
			ts.isShorthandPropertyAssignment(x) &&
			checker.getShorthandAssignmentValueSymbol(x) === sym
		) {
			reason = 'the error as a value';
			return;
		}
		if (ts.isIdentifier(x) && x !== decl.name && checker.getSymbolAtLocation(x) === sym) {
			const p = x.parent;
			if (ts.isPropertyAccessExpression(p) && p.expression === x) {
				const name = p.name.text;
				if (name === 'stack' || name === 'constructor') reason = `the error's ${name}`;
				else if (
					name === 'toString' &&
					ts.isCallExpression(p.parent) &&
					p.parent.expression === p
				) {
					plan.errText.push(p.parent);
				} else if (ts.isCallExpression(p.parent) && p.parent.expression === p) {
					reason = 'a method of the error';
				} else if (isWritten(p)) reason = 'a write to the error';
				return;
			}
			if (
				ts.isCallExpression(p) &&
				ts.isIdentifier(p.expression) &&
				p.expression.text === 'String' &&
				p.arguments.length === 1
			) {
				plan.errText.push(p);
				return;
			}
			if (
				ts.isTemplateSpan(p) ||
				(ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.PlusToken)
			) {
				plan.errText.push(x);
				return;
			}
			if (ts.isThrowStatement(p)) return;
			// Truthiness and `typeof`: an error is an object in both engines.
			if (
				(ts.isConditionalExpression(p) && p.condition === x) ||
				(ts.isIfStatement(p) && p.expression === x) ||
				(ts.isPrefixUnaryExpression(p) && p.operator === ts.SyntaxKind.ExclamationToken) ||
				ts.isTypeOfExpression(p) ||
				(ts.isBinaryExpression(p) &&
					p.left === x &&
					p.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken)
			) {
				return;
			}
			if (
				ts.isCallExpression(p) &&
				ts.isPropertyAccessExpression(p.expression) &&
				ts.isIdentifier(p.expression.expression) &&
				p.expression.expression.text === 'console'
			) {
				return;
			}
			reason = 'the error as a value';
			return;
		}
		ts.forEachChild(x, uses);
	};
	uses(clause.block);
	if (reason !== null) return reason;

	// Operations of the try block.
	const seen = new Set<ts.Node>();
	const localFunction = (id: ts.Identifier): ts.Node | null => {
		const s = checker.getSymbolAtLocation(id);
		for (const d of s?.declarations ?? []) {
			if (ts.isFunctionDeclaration(d) && d.body) return d.body;
			if (
				ts.isVariableDeclaration(d) &&
				d.initializer &&
				(ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer)) &&
				ts.isVariableDeclarationList(d.parent) &&
				(d.parent.flags & ts.NodeFlags.Const) !== 0
			) {
				return d.initializer.body;
			}
		}
		return null;
	};
	const rootName = (e: ts.Expression): string | null => {
		let x = strip(e);
		for (;;) {
			if (ts.isPropertyAccessExpression(x) || ts.isElementAccessExpression(x))
				x = strip(x.expression);
			else if (ts.isCallExpression(x)) x = strip(x.expression);
			else break;
		}
		return ts.isIdentifier(x) ? x.text : null;
	};
	/** True when the receiver has a known kind whose methods the subset types check. */
	const knownReceiver = (r: ts.Expression): boolean => {
		const x = strip(r);
		if (
			ts.isStringLiteral(x) ||
			ts.isNoSubstitutionTemplateLiteral(x) ||
			ts.isTemplateExpression(x)
		) {
			return true;
		}
		if (ts.isArrayLiteralExpression(x) || ts.isRegularExpressionLiteral(x)) return true;
		if (ts.isNewExpression(x) && ts.isIdentifier(x.expression) && x.expression.text === 'Date')
			return true;
		if (ts.isIdentifier(x)) {
			if (x.text === 'items') return true;
			const s = checker.getSymbolAtLocation(x);
			if (s && known.dateVars.has(s)) return true;
			// A variable that holds a Date has the Date type: it must not pass through `Json`.
			for (const d of s?.declarations ?? []) {
				if (ts.isVariableDeclaration(d) && d.initializer) {
					const init = strip(d.initializer);
					if (
						ts.isNewExpression(init) &&
						ts.isIdentifier(init.expression) &&
						init.expression.text === 'Date'
					) {
						return true;
					}
				}
			}
		}
		// `$input.all()`, `$('Node').all()`: arrays that the translation gives.
		if (
			ts.isCallExpression(x) &&
			ts.isPropertyAccessExpression(x.expression) &&
			x.expression.name.text === 'all'
		) {
			const r = strip(x.expression.expression);
			if (
				(ts.isIdentifier(r) && r.text === '$input') ||
				(ts.isCallExpression(r) && ts.isIdentifier(r.expression) && r.expression.text === '$')
			) {
				return true;
			}
		}
		return false;
	};
	const check = (x: ts.Node): void => {
		if (reason !== null) return;
		if (ts.isCallExpression(x)) {
			const c = strip(x.expression);
			if (ts.isIdentifier(c)) {
				if (!SAFE_FUNCTIONS.has(c.text)) {
					const body = localFunction(c);
					if (body === null) {
						reason = `a call of ${c.text}`;
						return;
					}
					if (!seen.has(body)) {
						seen.add(body);
						check(body);
					}
				}
			} else if (ts.isPropertyAccessExpression(c) || ts.isElementAccessExpression(c)) {
				const method = ts.isPropertyAccessExpression(c)
					? c.name.text
					: ts.isStringLiteral(c.argumentExpression)
						? c.argumentExpression.text
						: null;
				const recv = strip(c.expression);
				const root = rootName(recv);
				const statics = ts.isIdentifier(recv) ? SAFE_STATICS[recv.text] : undefined;
				if (method === null) {
					reason = 'a call with a computed method name';
					return;
				}
				if (statics === 'all' || statics?.has(method)) {
					// A static method of a global object.
				} else if (statics !== undefined) {
					reason = `${recv.getText()}.${method}`;
					return;
				} else if (
					root !== null &&
					(root.startsWith('$') || N8N_ROOTS.has(root)) &&
					/^(first|last|all|item|itemMatching|isExecuted)$/.test(method) &&
					(root === '$input' || ts.isCallExpression(recv))
				) {
					// `$input.all()`, `$('Node').first()`: the translation checks them.
				} else if (
					method === 'toFixed' &&
					!(
						x.arguments.length === 0 ||
						(ts.isNumericLiteral(x.arguments[0]) && Number(x.arguments[0].text) <= 100)
					)
				) {
					reason = '`toFixed` with a computed number of digits';
					return;
				} else if (!knownReceiver(recv)) {
					const text = calleeText(c);
					if (text === null) {
						reason = 'a method call whose callee V8 prints in another form';
						return;
					}
					plan.checks.push({ receiver: c.expression, method, text });
				}
				if (CALLBACK_METHODS.has(method)) {
					const fnArg = x.arguments[0];
					const fn =
						fnArg !== undefined &&
						(ts.isArrowFunction(fnArg) ||
							ts.isFunctionExpression(fnArg) ||
							(ts.isIdentifier(fnArg) &&
								(['Boolean', 'String', 'Number'].includes(fnArg.text) ||
									localFunction(fnArg) !== null)));
					if (!fn) {
						reason = `${method} with a callback that may not be a function`;
						return;
					}
				}
			} else {
				reason = 'a call of a computed function';
				return;
			}
		} else if (ts.isNewExpression(x)) {
			if (!ts.isIdentifier(x.expression) || !ERROR_CONSTRUCTORS.has(x.expression.text)) {
				reason = `new ${x.expression.getText()}`;
				return;
			}
		} else if (ts.isObjectBindingPattern(x) || ts.isArrayBindingPattern(x)) {
			reason = 'destructuring';
			return;
		} else if (
			ts.isBinaryExpression(x) &&
			(x.operatorToken.kind === ts.SyntaxKind.InKeyword ||
				x.operatorToken.kind === ts.SyntaxKind.InstanceOfKeyword ||
				((ts.isObjectLiteralExpression(x.left) || ts.isArrayLiteralExpression(x.left)) &&
					x.operatorToken.kind === ts.SyntaxKind.EqualsToken))
		) {
			reason = `the ${x.operatorToken.getText()} operator`;
			return;
		} else if (ts.isDeleteExpression(x) || ts.isAwaitExpression(x)) {
			reason = ts.isDeleteExpression(x) ? '`delete`' : '`await`';
			return;
		} else if (ts.isSpreadElement(x) && !ts.isArrayLiteralExpression(x.parent)) {
			reason = 'spread arguments';
			return;
		} else if (ts.isSpreadAssignment(x)) {
			// Object spread of null or undefined gives nothing; it never throws.
		}
		ts.forEachChild(x, check);
	};
	check(t.tryBlock);
	if (reason !== null) return reason;
	return plan;
}

function isWritten(n: ts.Node): boolean {
	const p = n.parent;
	return (
		(ts.isBinaryExpression(p) &&
			p.left === n &&
			p.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
			p.operatorToken.kind <= ts.SyntaxKind.LastAssignment) ||
		((ts.isPrefixUnaryExpression(p) || ts.isPostfixUnaryExpression(p)) &&
			(p.operator === ts.SyntaxKind.PlusPlusToken || p.operator === ts.SyntaxKind.MinusMinusToken))
	);
}
