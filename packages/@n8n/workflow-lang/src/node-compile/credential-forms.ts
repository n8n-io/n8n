import ts from 'typescript';

const f = ts.factory;

const MAX_DEPTH = 6;

type IsMarker = (e: ts.Node) => boolean;

function isConstantValue(e: ts.Expression, isMarker: IsMarker): boolean {
	return (
		isMarker(e) ||
		ts.isStringLiteral(e) ||
		ts.isNumericLiteral(e) ||
		e.kind === ts.SyntaxKind.TrueKeyword ||
		e.kind === ts.SyntaxKind.FalseKeyword ||
		e.kind === ts.SyntaxKind.NullKeyword
	);
}

function valuesOf(e: ts.Expression, isMarker: IsMarker): ts.Expression[] | undefined {
	if (!ts.isObjectLiteralExpression(e)) return undefined;
	const values: ts.Expression[] = [];
	for (const p of e.properties) {
		if (!ts.isPropertyAssignment(p) || ts.isComputedPropertyName(p.name)) return undefined;
		if (!isConstantValue(p.initializer, isMarker)) return undefined;
		values.push(p.initializer);
	}
	return values;
}

function statementOf(n: ts.Node): ts.Statement | undefined {
	for (let cur: ts.Node = n; cur.parent; cur = cur.parent) {
		if (ts.isFunctionLike(cur) || ts.isIterationStatement(cur, false)) return undefined;
		if (ts.isStatement(cur) && ts.isBlock(cur.parent)) return cur;
	}
	return undefined;
}

function declaredBefore(use: ts.Identifier, isMarker: IsMarker): ts.Expression[] | undefined {
	const statement = statementOf(use);
	if (!statement || !ts.isBlock(statement.parent)) return undefined;
	const list = statement.parent.statements;
	const before = list[list.indexOf(statement) - 1];
	if (!before || !ts.isVariableStatement(before)) return undefined;
	if ((before.declarationList.flags & ts.NodeFlags.Const) === 0) return undefined;
	if (before.declarationList.declarations.length !== 1) return undefined;
	const [declaration] = before.declarationList.declarations;
	if (!ts.isIdentifier(declaration.name) || declaration.name.text !== use.text) return undefined;
	return declaration.initializer ? valuesOf(declaration.initializer, isMarker) : undefined;
}

function everyValueSubject(n: ts.Node): ts.Expression | undefined {
	if (!ts.isCallExpression(n) || n.arguments.length !== 1) return undefined;
	const [test] = n.arguments;
	if (!ts.isIdentifier(test) || test.text !== 'Boolean') return undefined;
	const callee = n.expression;
	if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== 'every') return undefined;
	const values = callee.expression;
	if (!ts.isCallExpression(values) || values.arguments.length !== 1) return undefined;
	const from = values.expression;
	const isObjectValues =
		ts.isPropertyAccessExpression(from) &&
		ts.isIdentifier(from.expression) &&
		from.expression.text === 'Object' &&
		from.name.text === 'values';
	return isObjectValues ? values.arguments[0] : undefined;
}

export function withValueTests(root: ts.Node, isMarker: IsMarker): ts.Node {
	const visit = (input: ts.Node): ts.Node => {
		const subject = everyValueSubject(input);
		if (subject) {
			const values = ts.isIdentifier(subject)
				? declaredBefore(subject, isMarker)
				: valuesOf(subject, isMarker);
			if (values?.some(isMarker)) {
				const tests = values.map(
					(value): ts.Expression =>
						f.createPrefixUnaryExpression(
							ts.SyntaxKind.ExclamationToken,
							f.createPrefixUnaryExpression(ts.SyntaxKind.ExclamationToken, value),
						),
				);
				return f.createParenthesizedExpression(
					tests.reduce((all, test) =>
						f.createBinaryExpression(all, ts.SyntaxKind.AmpersandAmpersandToken, test),
					),
				);
			}
		}
		return ts.visitEachChild(input, visit, undefined);
	};
	return ts.visitNode(root, visit);
}

type Units = (name: string) => ts.Node | undefined;

function definitionsOf(name: string, unit: ts.Node): ts.Expression[] | undefined {
	const values: ts.Expression[] = [];
	let known = true;
	const walk = (n: ts.Node) => {
		if ((ts.isParameter(n) || ts.isBindingElement(n)) && n.name.getText() === name) known = false;
		if (ts.isBindingElement(n) || ts.isParameter(n)) {
			const holds = (x: ts.Node): boolean =>
				(ts.isIdentifier(x) && x.text === name) || (ts.forEachChild(x, holds) ?? false);
			if (!ts.isIdentifier(n.name) && holds(n.name)) known = false;
		}
		if (ts.isFunctionDeclaration(n) && n.name?.text === name && n !== unit) known = false;
		if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === name) {
			const list = n.parent;
			const owner = list?.parent;
			if (!ts.isVariableDeclarationList(list) || !owner || !ts.isVariableStatement(owner))
				known = false;
			else if (n.initializer) values.push(n.initializer);
		}
		if (
			ts.isBinaryExpression(n) &&
			ts.isIdentifier(n.left) &&
			n.left.text === name &&
			n.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
			n.operatorToken.kind <= ts.SyntaxKind.LastAssignment
		) {
			if (n.operatorToken.kind === ts.SyntaxKind.EqualsToken) values.push(n.right);
			else known = false;
		}
		if (
			(ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) &&
			ts.isIdentifier(n.operand) &&
			n.operand.text === name &&
			(n.operator === ts.SyntaxKind.PlusPlusToken || n.operator === ts.SyntaxKind.MinusMinusToken)
		)
			known = false;
		ts.forEachChild(n, walk);
	};
	walk(unit);
	return known ? values : undefined;
}

function returnsOf(fn: ts.FunctionDeclaration): Array<ts.Expression | undefined> {
	const out: Array<ts.Expression | undefined> = [];
	const walk = (n: ts.Node) => {
		if (ts.isFunctionLike(n)) return;
		if (ts.isReturnStatement(n)) out.push(n.expression);
		ts.forEachChild(n, walk);
	};
	if (fn.body) ts.forEachChild(fn.body, walk);
	return out;
}

function isAsync(fn: ts.FunctionDeclaration): boolean {
	return fn.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) ?? false;
}

function truthIsFixed(
	e: ts.Expression,
	unit: ts.Node,
	units: Units,
	flagMarker: string,
	depth: number,
	awaited: boolean,
): boolean {
	if (depth > MAX_DEPTH) return false;
	const next = (x: ts.Expression, inUnit = unit, isAwaited = false) =>
		truthIsFixed(x, inUnit, units, flagMarker, depth + 1, isAwaited);
	if (ts.isParenthesizedExpression(e)) return next(e.expression, unit, awaited);
	if (ts.isAsExpression(e) || ts.isNonNullExpression(e)) return next(e.expression, unit, awaited);
	if (ts.isAwaitExpression(e)) return next(e.expression, unit, true);
	if (ts.isObjectLiteralExpression(e) || ts.isArrayLiteralExpression(e)) return true;
	if (
		e.kind === ts.SyntaxKind.NullKeyword ||
		e.kind === ts.SyntaxKind.TrueKeyword ||
		e.kind === ts.SyntaxKind.FalseKeyword
	)
		return true;
	if (ts.isConditionalExpression(e)) return next(e.whenTrue) && next(e.whenFalse);
	if (ts.isIdentifier(e)) {
		if (e.text === 'undefined') return true;
		const values = definitionsOf(e.text, unit);
		return values !== undefined && values.every((value) => next(value));
	}
	if (ts.isCallExpression(e) && ts.isIdentifier(e.expression)) {
		if (e.expression.text === flagMarker) return true;
		const callee = units(e.expression.text);
		if (!callee || !ts.isFunctionDeclaration(callee) || !callee.body) return false;
		if (isAsync(callee) && !awaited) return false;
		return returnsOf(callee).every((value) => value === undefined || next(value, callee));
	}
	return false;
}

export function isTruthTest(use: ts.Node): boolean {
	const p = use.parent;
	if (!p) return false;
	if (ts.isIfStatement(p) || ts.isWhileStatement(p) || ts.isDoStatement(p))
		return p.expression === use;
	if (ts.isForStatement(p)) return p.condition === use;
	if (ts.isConditionalExpression(p)) return p.condition === use;
	if (ts.isPrefixUnaryExpression(p)) return p.operator === ts.SyntaxKind.ExclamationToken;
	if (ts.isBinaryExpression(p) && p.left === use) {
		const kind = p.operatorToken.kind;
		return (
			kind === ts.SyntaxKind.AmpersandAmpersandToken ||
			kind === ts.SyntaxKind.BarBarToken ||
			kind === ts.SyntaxKind.QuestionQuestionToken
		);
	}
	return false;
}

export function truthOfVariableIsFixed(
	use: ts.Identifier,
	unit: ts.Node,
	units: Units,
	flagMarker: string,
): boolean {
	return isTruthTest(use) && truthIsFixed(use, unit, units, flagMarker, 0, false);
}

export function fallbackResult(n: ts.Node): { subject: ts.Node; parent: ts.Node } {
	let subject = n;
	let parent = n.parent;
	let passed = false;
	for (;;) {
		const logical =
			ts.isBinaryExpression(parent) &&
			parent.right === subject &&
			(parent.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
				parent.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
				parent.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken);
		if (!logical && !(passed && ts.isParenthesizedExpression(parent))) break;
		if (!parent.parent) break;
		passed = true;
		subject = parent;
		parent = parent.parent;
	}
	return { subject, parent };
}
