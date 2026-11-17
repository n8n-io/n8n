import ts from 'typescript';

const f = ts.factory;

const BREAK = 1;
const CONTINUE = 2;

function jumpsTo(node: ts.Node, label: string): boolean {
	if (ts.isBreakOrContinueStatement(node)) return node.label?.text === label;
	return ts.forEachChild(node, (child) => jumpsTo(child, label) || undefined) === true;
}

function holds(node: ts.Node, test: (n: ts.Node) => boolean): boolean {
	return test(node) || ts.forEachChild(node, (child) => holds(child, test) || undefined) === true;
}

function isLoop(node: ts.Node): node is ts.IterationStatement {
	return ts.isIterationStatement(node, false);
}

function crossesSwitch(node: ts.Node, label: string): boolean {
	return holds(node, (n) => ts.isSwitchStatement(n) && jumpsTo(n, label));
}

function namesOf(root: ts.Node): Set<string> {
	const names = new Set<string>();
	const walk = (n: ts.Node) => {
		if (ts.isIdentifier(n)) names.add(n.text);
		ts.forEachChild(n, walk);
	};
	walk(root);
	return names;
}

function isStatementList(node: ts.Node | undefined): boolean {
	return (
		node !== undefined &&
		(ts.isBlock(node) || ts.isSourceFile(node) || ts.isCaseOrDefaultClause(node))
	);
}

function equals(flag: string, value: number): ts.Expression {
	return f.createBinaryExpression(
		f.createIdentifier(flag),
		ts.SyntaxKind.EqualsEqualsEqualsToken,
		f.createNumericLiteral(value),
	);
}

function assign(flag: string, value: number): ts.Statement {
	return f.createExpressionStatement(
		f.createBinaryExpression(
			f.createIdentifier(flag),
			ts.SyntaxKind.EqualsToken,
			f.createNumericLiteral(value),
		),
	);
}

function nestedKinds(
	loop: ts.IterationStatement,
	label: string,
): { exits: boolean; continues: boolean } {
	const kinds = { exits: false, continues: false };
	const walk = (node: ts.Node, depth: number) => {
		if (ts.isBreakOrContinueStatement(node) && node.label?.text === label && depth > 0) {
			if (ts.isBreakStatement(node)) kinds.exits = true;
			else kinds.continues = true;
		}
		ts.forEachChild(node, (child) => walk(child, isLoop(node) ? depth + 1 : depth));
	};
	ts.forEachChild(loop, (child) => walk(child, 0));
	return kinds;
}

function lowerLoop(
	loop: ts.IterationStatement,
	label: string,
	flag: string,
): { loop: ts.Statement; flagged: boolean } {
	let flagged = false;
	const kinds = nestedKinds(loop, label);
	const lower = (node: ts.Node, depth: number): ts.Node => {
		if (ts.isFunctionLike(node) || ts.isClassLike(node)) return node;
		if (ts.isBreakOrContinueStatement(node) && node.label?.text === label) {
			const exits = ts.isBreakStatement(node);
			if (depth === 0) return exits ? f.createBreakStatement() : f.createContinueStatement();
			flagged = true;
			return f.createBlock(
				[assign(flag, exits ? BREAK : CONTINUE), f.createBreakStatement()],
				true,
			);
		}
		if (isLoop(node) && jumpsTo(node, label)) {
			const inner = ts.visitEachChild(node, (child) => lower(child, depth + 1), undefined);
			const after =
				depth === 0
					? [
							...(kinds.exits
								? [f.createIfStatement(equals(flag, BREAK), f.createBreakStatement())]
								: []),
							...(kinds.continues
								? [
										f.createIfStatement(
											equals(flag, CONTINUE),
											f.createBlock([assign(flag, 0), f.createContinueStatement()], true),
										),
									]
								: []),
						]
					: [
							f.createIfStatement(
								f.createBinaryExpression(
									f.createIdentifier(flag),
									ts.SyntaxKind.ExclamationEqualsEqualsToken,
									f.createNumericLiteral(0),
								),
								f.createBreakStatement(),
							),
						];
			return f.createBlock([inner, ...after], true);
		}
		return ts.visitEachChild(node, (child) => lower(child, depth), undefined);
	};
	const lowered = ts.visitEachChild(loop, (child) => lower(child, 0), undefined);
	return { loop: lowered, flagged };
}

export function withoutLabels(root: ts.Node): ts.Node {
	const taken = namesOf(root);
	let count = 0;
	const fresh = (): string => {
		let name = `__jump${count++}`;
		while (taken.has(name)) name = `__jump${count++}`;
		taken.add(name);
		return name;
	};
	const visit = (input: ts.Node): ts.VisitResult<ts.Node> => {
		const n = ts.visitEachChild(input, visit, undefined);
		if (!ts.isLabeledStatement(n)) return n;
		const label = n.label.text;
		const body = n.statement;
		if (!jumpsTo(body, label)) return body;
		if (!isLoop(body)) return n;
		if (crossesSwitch(body, label)) return n;
		if (holds(body, ts.isLabeledStatement)) return n;
		const flag = fresh();
		const { loop, flagged } = lowerLoop(body, label, flag);
		if (!flagged) return loop;
		const declaration = f.createVariableStatement(
			undefined,
			f.createVariableDeclarationList(
				[f.createVariableDeclaration(flag, undefined, undefined, f.createNumericLiteral(0))],
				ts.NodeFlags.Let,
			),
		);
		return input !== root && isStatementList(input.parent)
			? [declaration, loop]
			: f.createBlock([declaration, loop], true);
	};
	const out = ts.visitNode(root, visit);
	return out ?? root;
}
