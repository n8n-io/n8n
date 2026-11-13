import ts from 'typescript';

import { isCtxSymbol, isFunctionLike, isPromiseAll } from './analysis.ts';
import { isDateSetterReceiver } from './dates.ts';

/**
 * A boundary is a node that becomes its own bytecode function: a function,
 * an arrow, a method, or an element of `Promise.all([...])`.
 */
export function isBoundary(node: ts.Node): boolean {
	if (isFunctionLike(node)) return true;
	const parent = node.parent;
	return (
		parent !== undefined &&
		ts.isArrayLiteralExpression(parent) &&
		parent.parent !== undefined &&
		isPromiseAll(parent.parent) &&
		parent.parent.arguments[0] === parent
	);
}

/**
 * Finds which variables closures capture, and which of them need a cell.
 *
 * A captured variable needs a cell when code assigns it after its
 * declaration, or when a closure that captures it is created before the
 * declaration ends. Other captured variables are copied by value.
 */
export class ScopeInfo {
	private readonly captured = new Set<ts.Symbol>();

	private readonly reassigned = new Set<ts.Symbol>();

	private readonly early = new Set<ts.Symbol>();

	private readonly checker: ts.TypeChecker;

	/** In the workflow file, module-level declarations belong to `run`. */
	private readonly moduleOwner: Map<ts.SourceFile, ts.Node>;

	constructor(
		checker: ts.TypeChecker,
		moduleOwner: Map<ts.SourceFile, ts.Node>,
		files: ts.SourceFile[],
	) {
		this.checker = checker;
		this.moduleOwner = moduleOwner;
		for (const sf of files) this.walk(sf);
	}

	/** The boundary that owns `node`, searched from the parent of `node`. */
	boundaryOf(node: ts.Node): ts.Node {
		let p: ts.Node | undefined = node.parent;
		while (p) {
			if (isBoundary(p)) return p;
			if (ts.isSourceFile(p)) return this.moduleOwner.get(p) ?? p;
			p = p.parent;
		}
		throw new Error('node has no boundary');
	}

	isCaptured(symbol: ts.Symbol): boolean {
		return this.captured.has(symbol);
	}

	needsCell(symbol: ts.Symbol): boolean {
		return this.captured.has(symbol) && (this.reassigned.has(symbol) || this.early.has(symbol));
	}

	isReassigned(symbol: ts.Symbol): boolean {
		return this.reassigned.has(symbol);
	}

	private walk(node: ts.Node) {
		if (ts.isIdentifier(node)) this.visitIdentifier(node);
		if (ts.isShorthandPropertyAssignment(node)) {
			const value = this.checker.getShorthandAssignmentValueSymbol(node);
			if (value) this.visitReference(node.name, value);
		}
		ts.forEachChild(node, (c) => this.walk(c));
	}

	private visitIdentifier(id: ts.Identifier) {
		const parent = id.parent;
		if (ts.isShorthandPropertyAssignment(parent)) return;
		if (ts.isPropertyAccessExpression(parent) && parent.name === id) return;
		const symbol = this.checker.getSymbolAtLocation(id);
		if (!symbol) return;
		const decl = symbol.valueDeclaration;
		if (!decl) return;
		if (declarationName(decl) === id) return;
		this.visitReference(id, symbol);
	}

	private visitReference(id: ts.Node, symbol: ts.Symbol) {
		const decl = symbol.valueDeclaration;
		if (!decl || !isLocalDeclaration(decl)) return;
		if (isCtxSymbol(this.checker, symbol)) return;
		// A Date setter stores the new time value back into the variable.
		if (isWrite(id) || isDateSetterReceiver(this.checker, id)) this.reassigned.add(symbol);
		const declBoundary = this.boundaryOf(decl);
		if (ts.isSourceFile(declBoundary)) return;
		let b = this.boundaryOf(id);
		if (b === declBoundary) return;
		// Find the boundary that the declaring function creates directly.
		let child = b;
		while (b !== declBoundary) {
			child = b;
			if (ts.isSourceFile(b)) return;
			b = this.boundaryOf(b);
		}
		this.captured.add(symbol);
		if (declarationEnd(decl) > creationPoint(child)) this.early.add(symbol);
	}
}

function declarationName(decl: ts.Declaration): ts.Node | undefined {
	if (
		ts.isVariableDeclaration(decl) ||
		ts.isParameter(decl) ||
		ts.isFunctionDeclaration(decl) ||
		ts.isBindingElement(decl)
	) {
		return decl.name;
	}
	return undefined;
}

function isLocalDeclaration(decl: ts.Declaration): boolean {
	return (
		ts.isVariableDeclaration(decl) ||
		ts.isParameter(decl) ||
		ts.isFunctionDeclaration(decl) ||
		ts.isBindingElement(decl)
	);
}

function declarationEnd(decl: ts.Declaration): number {
	let d: ts.Node = decl;
	while (ts.isBindingElement(d) || ts.isObjectBindingPattern(d) || ts.isArrayBindingPattern(d)) {
		d = d.parent;
	}
	return d.end;
}

/** Position where the closure for `boundary` is created in its parent. */
function creationPoint(boundary: ts.Node): number {
	if (ts.isFunctionDeclaration(boundary)) {
		// Function declarations are hoisted to the start of their block.
		return boundary.parent.pos;
	}
	return boundary.getStart();
}

/** True when the identifier is the target of an assignment. */
export function isWrite(id: ts.Node): boolean {
	let node: ts.Node = id;
	let parent = node.parent;
	while (ts.isParenthesizedExpression(parent) || ts.isNonNullExpression(parent)) {
		node = parent;
		parent = parent.parent;
	}
	if (ts.isPrefixUnaryExpression(parent) || ts.isPostfixUnaryExpression(parent)) {
		return (
			parent.operator === ts.SyntaxKind.PlusPlusToken ||
			parent.operator === ts.SyntaxKind.MinusMinusToken
		);
	}
	if (ts.isBinaryExpression(parent) && parent.left === node) {
		return isAssignmentOperator(parent.operatorToken.kind);
	}
	if (ts.isForOfStatement(parent) && parent.initializer === node) return true;
	// Destructuring assignment: walk up through the pattern literal.
	let p: ts.Node = node;
	for (;;) {
		const q = p.parent;
		if (
			ts.isArrayLiteralExpression(q) ||
			ts.isObjectLiteralExpression(q) ||
			ts.isSpreadElement(q) ||
			ts.isSpreadAssignment(q) ||
			ts.isShorthandPropertyAssignment(q) ||
			(ts.isPropertyAssignment(q) && q.initializer === p) ||
			(ts.isBinaryExpression(q) &&
				q.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
				q.left === p &&
				(ts.isArrayLiteralExpression(q.parent) ||
					ts.isObjectLiteralExpression(q.parent) ||
					ts.isPropertyAssignment(q.parent)))
		) {
			p = q;
			continue;
		}
		if (p === node) return false;
		if (
			ts.isBinaryExpression(q) &&
			q.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
			q.left === p
		) {
			return true;
		}
		if (ts.isForOfStatement(q) && q.initializer === p) return true;
		return false;
	}
}

export function isAssignmentOperator(kind: ts.SyntaxKind): boolean {
	return kind >= ts.SyntaxKind.FirstAssignment && kind <= ts.SyntaxKind.LastAssignment;
}
