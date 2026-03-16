import ts from 'typescript';

import type { StaticGraph, StaticNode, StaticEdge } from './types';

interface MethodInfo {
	name: string;
	decorator: 'trigger' | 'callable';
	label: string;
	httpMethod?: string;
	httpPath?: string;
	body: ts.Block;
}

interface CallInfo {
	methodName: string;
	condition?: string;
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;

/**
 * Analyzes raw TypeScript code string to build a static graph.
 * Uses TypeScript Compiler API AST parsing — no eval or reflect-metadata needed.
 */
export function analyzeCodeString(code: string): StaticGraph {
	const sourceFile = ts.createSourceFile('input.ts', code, ts.ScriptTarget.Latest, true);
	const methods = extractMethods(sourceFile);
	const nodes = buildNodes(methods);
	const edges = buildEdges(methods);
	return { nodes, edges };
}

function extractMethods(sourceFile: ts.SourceFile): MethodInfo[] {
	const methods: MethodInfo[] = [];

	const visit = (node: ts.Node): void => {
		if (ts.isClassDeclaration(node)) {
			for (const member of node.members) {
				if (ts.isMethodDeclaration(member) && member.body) {
					const info = extractMethodInfo(member);
					if (info) methods.push(info);
				}
			}
		}
		ts.forEachChild(node, visit);
	};

	visit(sourceFile);
	return methods;
}

function extractMethodInfo(method: ts.MethodDeclaration): MethodInfo | undefined {
	if (!method.name || !ts.isIdentifier(method.name) || !method.body) return undefined;

	const methodName = method.name.text;
	const decorators = ts.canHaveDecorators(method) ? (ts.getDecorators(method) ?? []) : [];

	for (const decorator of decorators) {
		if (!ts.isCallExpression(decorator.expression)) continue;

		const callExpr = decorator.expression;
		if (!ts.isIdentifier(callExpr.expression)) continue;

		const decoratorName = callExpr.expression.text;
		const firstArg = callExpr.arguments[0];
		if (!firstArg || !ts.isStringLiteral(firstArg)) continue;

		const argValue = firstArg.text;

		if (isHttpMethod(decoratorName)) {
			return {
				name: methodName,
				decorator: 'trigger',
				label: argValue,
				httpMethod: decoratorName,
				httpPath: argValue,
				body: method.body,
			};
		}

		if (decoratorName === 'Callable') {
			return {
				name: methodName,
				decorator: 'callable',
				label: argValue,
				body: method.body,
			};
		}
	}

	return undefined;
}

function isHttpMethod(name: string): name is (typeof HTTP_METHODS)[number] {
	return (HTTP_METHODS as readonly string[]).includes(name);
}

function buildNodes(methods: MethodInfo[]): StaticNode[] {
	return methods.map((m) => {
		const node: StaticNode = {
			id: m.name,
			label: m.label,
			type: m.decorator,
		};
		if (m.httpMethod) node.method = m.httpMethod;
		if (m.httpPath) node.path = m.httpPath;
		return node;
	});
}

function buildEdges(methods: MethodInfo[]): StaticEdge[] {
	const edges: StaticEdge[] = [];
	const methodNames = new Set(methods.map((m) => m.name));

	for (const method of methods) {
		const calls = findThisCalls(method.body, methodNames);
		for (const call of calls) {
			const edge: StaticEdge = { from: method.name, to: call.methodName };
			if (call.condition) edge.condition = call.condition;
			edges.push(edge);
		}
	}

	return edges;
}

function findThisCalls(body: ts.Block, knownMethods: Set<string>): CallInfo[] {
	const calls: CallInfo[] = [];

	const visit = (node: ts.Node): void => {
		if (
			ts.isCallExpression(node) &&
			ts.isPropertyAccessExpression(node.expression) &&
			node.expression.expression.kind === ts.SyntaxKind.ThisKeyword
		) {
			const methodName = node.expression.name.text;
			if (knownMethods.has(methodName)) {
				const condition = detectBranchCondition(node);
				calls.push({ methodName, condition });
			}
		}
		ts.forEachChild(node, visit);
	};

	visit(body);
	return calls;
}

/**
 * Detects if a this.method() call is inside a branch (if/else or switch/case).
 * Walks up the AST parent chain looking for an enclosing IfStatement or SwitchStatement,
 * then determines the branch label.
 */
function detectBranchCondition(callNode: ts.Node): string | undefined {
	let current: ts.Node = callNode;

	while (current.parent) {
		const parent = current.parent;

		if (ts.isIfStatement(parent)) {
			if (isContainedIn(callNode, parent.thenStatement)) {
				return 'true';
			}
			if (parent.elseStatement && isContainedIn(callNode, parent.elseStatement)) {
				return 'false';
			}
		}

		if (ts.isCaseClause(parent) || ts.isDefaultClause(parent)) {
			if (ts.isDefaultClause(parent)) {
				return 'default';
			}
			return parent.expression.getText();
		}

		if (ts.isBlock(parent) && parent.parent && ts.isMethodDeclaration(parent.parent)) {
			break;
		}

		current = parent;
	}

	return undefined;
}

function isContainedIn(node: ts.Node, container: ts.Node): boolean {
	return node.pos >= container.pos && node.end <= container.end;
}
