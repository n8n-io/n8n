/**
 * Canvas write-back: applies a Tier 1 canvas action to the workflow source.
 *
 * Each edit is one text replacement that the syntax tree gives. Text outside
 * the replaced range does not change. The edited source must compile, else
 * the edit is rejected with the compiler diagnostics.
 */
import ts from 'typescript';

import { isEffectCall, propertyName, skipOuter, stringLiteralValue } from '../compiler/analysis.ts';
import { compile } from '../compiler/index.ts';
import { createWorkflowProgram } from '../compiler/program.ts';
import type { Diagnostic } from '../compiler/validate.ts';

/** A value for a parameter: JSON data, or TypeScript expression text. */
export type ParameterValue = { value: unknown } | { expression: string };

export type CanvasEdit =
	| { kind: 'setParameter'; nodeId: string; path: string[]; value: ParameterValue }
	| {
			kind: 'mapData';
			nodeId: string;
			path: string[];
			/** Expression text such as `order.id`. */
			expression: string;
			/** `append` adds the value to the end of a string field. */
			mode?: 'replace' | 'append';
	  }
	| { kind: 'rename'; nodeId: string; newName: string; parkedStepIds?: string[] }
	| {
			kind: 'addAfter';
			afterNodeId: string;
			node: {
				name: string;
				type: string;
				typeVersion?: number;
				parameters?: Record<string, unknown>;
				credential?: string;
			};
	  }
	| { kind: 'delete'; nodeId: string }
	| { kind: 'move'; nodeId: string; after?: string; before?: string };

export interface TextEdit {
	/** Range in the old source. */
	start: number;
	end: number;
	/** Replacement text. */
	text: string;
}

export interface EditDiagnostic extends Diagnostic {
	/** The canvas node (step id) that holds the problem, if any. */
	nodeId: string | null;
}

export type EditResult =
	| { source: string; edit: TextEdit; variable?: string }
	| { error: string; diagnostics?: EditDiagnostic[] };

interface StepCall {
	id: string;
	name: string;
	call: ts.CallExpression;
	options: ts.ObjectLiteralExpression;
}

class EditError extends Error {}

/** Finds the ctx effect calls with literal options. */
function findSteps(source: string): {
	sf: ts.SourceFile;
	checker: ts.TypeChecker;
	steps: StepCall[];
} {
	const wp = createWorkflowProgram({ source });
	const steps: StepCall[] = [];
	const visit = (node: ts.Node) => {
		if (isEffectCall(wp.checker, node)) {
			const arg = node.arguments[0] ? skipOuter(node.arguments[0]) : undefined;
			if (arg && ts.isObjectLiteralExpression(arg)) {
				const name = stringLiteralValue(prop(arg, 'name')?.initializer);
				if (name !== null) {
					const id = stringLiteralValue(prop(arg, 'id')?.initializer) ?? name;
					steps.push({ id, name, call: node, options: arg });
				}
			}
		}
		ts.forEachChild(node, visit);
	};
	visit(wp.workflowFile);
	return { sf: wp.workflowFile, checker: wp.checker, steps };
}

function prop(obj: ts.ObjectLiteralExpression, name: string) {
	return obj.properties.find(
		(p): p is ts.PropertyAssignment => ts.isPropertyAssignment(p) && propertyName(p.name) === name,
	);
}

function anyProp(obj: ts.ObjectLiteralExpression, name: string) {
	return obj.properties.find((p) => p.name !== undefined && propertyName(p.name) === name);
}

function stepOf(steps: StepCall[], id: string): StepCall {
	const s = steps.find((x) => x.id === id);
	if (!s) throw new EditError(`No node with id "${id}".`);
	return s;
}

const IDENT = /^[A-Za-z_$][\w$]*$/;

function quote(s: string): string {
	return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r')}'`;
}

/** Renders JSON data as TypeScript literal text. */
export function literalText(value: unknown): string {
	if (value === null) return 'null';
	if (value === undefined) return 'undefined';
	if (typeof value === 'string') return quote(value);
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	if (Array.isArray(value)) return `[${value.map(literalText).join(', ')}]`;
	if (typeof value === 'object') {
		const entries = Object.entries(value);
		if (entries.length === 0) return '{}';
		const body = entries.map(([k, v]) => `${IDENT.test(k) ? k : quote(k)}: ${literalText(v)}`);
		return `{ ${body.join(', ')} }`;
	}
	throw new EditError('The value is not JSON data.');
}

function valueText(v: ParameterValue): string {
	return 'expression' in v ? v.expression : literalText(v.value);
}

function keyText(k: string): string {
	return IDENT.test(k) ? k : quote(k);
}

/** Whitespace before `pos` on its line. */
function indentAt(text: string, pos: number): string {
	const lineStart = text.lastIndexOf('\n', pos - 1) + 1;
	const m = /^[ \t]*/.exec(text.slice(lineStart));
	return m ? m[0] : '';
}

/** Adds a property at the end of an object literal, in the style of the literal. */
function insertProperty(source: string, obj: ts.ObjectLiteralExpression, text: string): TextEdit {
	const props = obj.properties;
	if (props.length === 0) {
		return { start: obj.getStart(), end: obj.getEnd(), text: `{ ${text} }` };
	}
	const last = props[props.length - 1];
	const multiline = source.slice(obj.getStart(), last.getStart()).includes('\n');
	if (props.hasTrailingComma) {
		const comma = source.indexOf(',', last.getEnd());
		const sep = multiline ? `\n${indentAt(source, last.getStart())}` : ' ';
		return { start: comma + 1, end: comma + 1, text: `${sep}${text},` };
	}
	const sep = multiline ? `,\n${indentAt(source, last.getStart())}` : ', ';
	return { start: last.getEnd(), end: last.getEnd(), text: `${sep}${text}` };
}

/** The object that holds the canvas parameters of a step. */
function parameterObject(
	source: string,
	step: StepCall,
	path: string[],
): { obj: ts.ObjectLiteralExpression; rest: string[] } | TextEdit {
	const method = ts.isPropertyAccessExpression(step.call.expression)
		? step.call.expression.name.text
		: 'node';
	if (method !== 'node') return { obj: step.options, rest: path };
	const p = prop(step.options, 'parameters');
	if (!p) return insertProperty(source, step.options, `parameters: ${nested(path, '')}`);
	const init = skipOuter(p.initializer);
	if (!ts.isObjectLiteralExpression(init))
		throw new EditError('The parameters of the node are not an object literal.');
	return { obj: init, rest: path };
}

/** `{ a: { b: value } }` for the path `[a, b]`, or the value for an empty path. */
function nested(path: string[], value: string): string {
	if (path.length === 0) return value;
	return `{ ${keyText(path[0])}: ${nested(path.slice(1), value)} }`;
}

function setPath(
	source: string,
	obj: ts.ObjectLiteralExpression,
	path: string[],
	value: (current: ts.Expression | null) => string,
): TextEdit {
	if (path.length === 0) throw new EditError('The parameter path is empty.');
	const [head, ...rest] = path;
	const found = anyProp(obj, head);
	if (!found) {
		return insertProperty(
			source,
			obj,
			`${keyText(head)}: ${rest.length === 0 ? value(null) : nested(rest, value(null))}`,
		);
	}
	if (ts.isShorthandPropertyAssignment(found)) {
		if (rest.length > 0) throw new EditError(`"${head}" is not an object literal.`);
		return {
			start: found.getStart(),
			end: found.getEnd(),
			text: `${keyText(head)}: ${value(found.name)}`,
		};
	}
	if (!ts.isPropertyAssignment(found)) throw new EditError(`"${head}" is not a plain property.`);
	if (rest.length === 0) {
		return {
			start: found.initializer.getStart(),
			end: found.initializer.getEnd(),
			text: value(found.initializer),
		};
	}
	const inner = skipOuter(found.initializer);
	if (!ts.isObjectLiteralExpression(inner))
		throw new EditError(`"${head}" is not an object literal.`);
	return setPath(source, inner, rest, value);
}

/** Appends an expression to a string literal or a template string. */
function appendText(current: ts.Expression | null, expression: string): string {
	if (!current) return expression;
	const e = skipOuter(current);
	const escape = (s: string) =>
		s
			.replace(/\\/g, '\\\\')
			.replace(/`/g, '\\`')
			.replace(/\$\{/g, '\\$' + '{');
	if (ts.isStringLiteral(e)) return `\`${escape(e.text)}\${${expression}}\``;
	if (ts.isNoSubstitutionTemplateLiteral(e) || ts.isTemplateExpression(e)) {
		const text = e.getText();
		return `${text.slice(0, -1)}\${${expression}}\``;
	}
	throw new EditError('Append works only on a string field.');
}

/** The statement that holds a step, and its block. */
function statementOf(step: StepCall): {
	statement: ts.Statement;
	block: ts.Block | ts.SourceFile | ts.CaseClause | ts.DefaultClause;
} {
	let node: ts.Node = step.call;
	while (
		node.parent &&
		!ts.isBlock(node.parent) &&
		!ts.isSourceFile(node.parent) &&
		!ts.isCaseOrDefaultClause(node.parent)
	) {
		node = node.parent;
		if (ts.isFunctionLike(node)) throw new EditError('The node is not in a statement block.');
	}
	const parent = node.parent;
	if (
		!ts.isStatement(node) ||
		!(ts.isBlock(parent) || ts.isSourceFile(parent) || ts.isCaseOrDefaultClause(parent))
	) {
		throw new EditError('The node is not in a statement block.');
	}
	return { statement: node, block: parent };
}

/** True when the statement does nothing but run the step (and maybe bind its result). */
function isStepOnly(statement: ts.Statement, step: StepCall): boolean {
	const isCall = (e: ts.Expression | undefined) => {
		if (!e) return false;
		const s = skipOuter(e);
		return ts.isAwaitExpression(s) && skipOuter(s.expression) === step.call;
	};
	if (ts.isExpressionStatement(statement)) return isCall(statement.expression);
	if (ts.isVariableStatement(statement)) {
		const ds = statement.declarationList.declarations;
		return ds.length === 1 && isCall(ds[0].initializer);
	}
	return false;
}

/** The range of a statement with its line: indentation and the line break. */
function lineRange(source: string, statement: ts.Statement): { start: number; end: number } {
	let start = statement.getStart();
	const lineStart = source.lastIndexOf('\n', start - 1) + 1;
	if (/^[ \t]*$/.test(source.slice(lineStart, start))) start = lineStart;
	let end = statement.getEnd();
	const nl = source.indexOf('\n', end);
	const lineEnd = nl < 0 ? source.length : nl + 1;
	if (/^[ \t]*\r?\n?$/.test(source.slice(end, lineEnd))) end = lineEnd;
	return { start, end };
}

function apply(source: string, e: TextEdit): string {
	return source.slice(0, e.start) + e.text + source.slice(e.end);
}

/** Maps diagnostics of the edited source to the step that contains them. */
function mapDiagnostics(source: string, diagnostics: Diagnostic[]): EditDiagnostic[] {
	let steps: StepCall[] = [];
	try {
		steps = findSteps(source).steps;
	} catch {
		steps = [];
	}
	return diagnostics.map((d) => {
		const inside = steps.find((s) => d.start >= s.call.getStart() && d.start < s.call.getEnd());
		if (inside) return { ...d, nodeId: inside.id };
		// Else the step of the statement that holds the problem.
		const stmt = steps.find((s) => {
			try {
				const { statement } = statementOf(s);
				return d.start >= statement.getStart() && d.start < statement.getEnd();
			} catch {
				return false;
			}
		});
		return { ...d, nodeId: stmt?.id ?? null };
	});
}

function freshName(sf: ts.SourceFile, base: string): string {
	const words = base
		.replace(/[^A-Za-z0-9]+/g, ' ')
		.trim()
		.split(' ')
		.filter(Boolean);
	let name = words
		.map((w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()))
		.join('');
	if (!name || !/^[A-Za-z_$]/.test(name)) name = `node${name}`;
	const used = new Set<string>();
	const visit = (n: ts.Node) => {
		if (ts.isIdentifier(n)) used.add(n.text);
		ts.forEachChild(n, visit);
	};
	visit(sf);
	const reserved = new Set([
		'await',
		'const',
		'let',
		'return',
		'function',
		'ctx',
		'trigger',
		'new',
		'delete',
		'if',
		'for',
		'switch',
	]);
	let candidate = name;
	for (let i = 2; used.has(candidate) || reserved.has(candidate); i++) candidate = `${name}${i}`;
	return candidate;
}

/** Symbols that a statement reads, and symbols that it declares or assigns. */
function readsAndWrites(
	checker: ts.TypeChecker,
	statement: ts.Statement,
): { reads: Set<ts.Symbol>; writes: Set<ts.Symbol> } {
	const reads = new Set<ts.Symbol>();
	const writes = new Set<ts.Symbol>();
	const declared = new Set<ts.Symbol>();
	const visit = (n: ts.Node) => {
		if (ts.isVariableDeclaration(n) || ts.isBindingElement(n) || ts.isFunctionDeclaration(n)) {
			const nameNode = n.name;
			if (nameNode && ts.isIdentifier(nameNode)) {
				const s = checker.getSymbolAtLocation(nameNode);
				if (s) declared.add(s);
			}
		}
		if (ts.isIdentifier(n)) {
			const s = checker.getSymbolAtLocation(n);
			const parent = n.parent;
			const isDeclName =
				(ts.isVariableDeclaration(parent) ||
					ts.isBindingElement(parent) ||
					ts.isFunctionDeclaration(parent)) &&
				parent.name === n;
			const isMember = ts.isPropertyAccessExpression(parent) && parent.name === n;
			const isKey = ts.isBindingElement(parent) && parent.propertyName === n;
			if (
				s &&
				!isDeclName &&
				!isMember &&
				!isKey &&
				!(ts.isPropertyAssignment(parent) && parent.name === n)
			) {
				const target =
					(ts.isBinaryExpression(parent) &&
						parent.left === n &&
						parent.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
						parent.operatorToken.kind <= ts.SyntaxKind.LastAssignment) ||
					((ts.isPrefixUnaryExpression(parent) || ts.isPostfixUnaryExpression(parent)) &&
						(parent.operator === ts.SyntaxKind.PlusPlusToken ||
							parent.operator === ts.SyntaxKind.MinusMinusToken));
				if (target) writes.add(s);
				if (
					!target ||
					!(
						ts.isBinaryExpression(parent) && parent.operatorToken.kind === ts.SyntaxKind.EqualsToken
					)
				) {
					reads.add(s);
				}
			}
		}
		if (ts.isShorthandPropertyAssignment(n)) {
			const s = checker.getShorthandAssignmentValueSymbol(n);
			if (s) reads.add(s);
		}
		ts.forEachChild(n, visit);
	};
	visit(statement);
	for (const s of declared) {
		writes.add(s);
		reads.delete(s);
	}
	return { reads, writes };
}

function computeEdit(source: string, edit: CanvasEdit): { edit: TextEdit; variable?: string } {
	const { sf, checker, steps } = findSteps(source);
	switch (edit.kind) {
		case 'setParameter':
		case 'mapData': {
			const step = stepOf(steps, edit.nodeId);
			const target = parameterObject(source, step, edit.path);
			const value = (current: ts.Expression | null) =>
				edit.kind === 'setParameter'
					? valueText(edit.value)
					: edit.mode === 'append'
						? appendText(current, edit.expression)
						: edit.expression;
			if ('start' in target) {
				// The parameters object was missing; insertProperty built it.
				if (edit.kind === 'mapData' && edit.mode === 'append')
					throw new EditError('The field has no value to append to.');
				const text = target.text.replace(nested(edit.path, ''), nested(edit.path, value(null)));
				return { edit: { ...target, text } };
			}
			return { edit: setPath(source, target.obj, target.rest, value) };
		}
		case 'rename': {
			const step = stepOf(steps, edit.nodeId);
			const nameProp = prop(step.options, 'name');
			if (!nameProp) throw new EditError('The node has no name property.');
			const keepId = (edit.parkedStepIds ?? []).includes(step.id) && !prop(step.options, 'id');
			if (!keepId) {
				return {
					edit: {
						start: nameProp.initializer.getStart(),
						end: nameProp.initializer.getEnd(),
						text: quote(edit.newName),
					},
				};
			}
			// Keep the old step id, so that parked executions still match.
			return {
				edit: {
					start: nameProp.initializer.getStart(),
					end: nameProp.initializer.getEnd(),
					text: `${quote(edit.newName)}, id: ${quote(step.id)}`,
				},
			};
		}
		case 'addAfter': {
			const step = stepOf(steps, edit.afterNodeId);
			const { statement } = statementOf(step);
			const callee = step.call.expression;
			const ctxText = ts.isPropertyAccessExpression(callee) ? callee.expression.getText() : 'ctx';
			const variable = freshName(sf, edit.node.name);
			const options: Record<string, unknown> = { name: edit.node.name, type: edit.node.type };
			if (edit.node.typeVersion !== undefined) options.typeVersion = edit.node.typeVersion;
			options.parameters = edit.node.parameters ?? {};
			if (edit.node.credential !== undefined) options.credential = edit.node.credential;
			const indent = indentAt(source, statement.getStart());
			const text = `\n${indent}const ${variable} = await ${ctxText}.node(${literalText(options)});`;
			return { edit: { start: statement.getEnd(), end: statement.getEnd(), text }, variable };
		}
		case 'delete': {
			const step = stepOf(steps, edit.nodeId);
			const { statement } = statementOf(step);
			if (!isStepOnly(statement, step)) {
				throw new EditError('The node is part of a larger statement. Edit the code to remove it.');
			}
			const r = lineRange(source, statement);
			return { edit: { start: r.start, end: r.end, text: '' } };
		}
		case 'move': {
			const step = stepOf(steps, edit.nodeId);
			const targetId = edit.after ?? edit.before;
			if (targetId === undefined) throw new EditError('Give `after` or `before`.');
			const target = stepOf(steps, targetId);
			const a = statementOf(step);
			const b = statementOf(target);
			if (a.block !== b.block) throw new EditError('A node can move only within its block.');
			if (a.statement === b.statement) throw new EditError('The nodes are in the same statement.');
			const list = [...a.block.statements];
			const from = list.indexOf(a.statement);
			const anchor = list.indexOf(b.statement);
			const to =
				edit.after !== undefined
					? anchor < from
						? anchor + 1
						: anchor
					: anchor < from
						? anchor
						: anchor - 1;
			if (to === from) return { edit: { start: 0, end: 0, text: '' } };
			const passed = from < to ? list.slice(from + 1, to + 1) : list.slice(to, from);
			const own = readsAndWrites(checker, a.statement);
			for (const other of passed) {
				const o = readsAndWrites(checker, other);
				for (const s of own.reads) {
					if (o.writes.has(s)) {
						throw new EditError(
							from > to
								? `The move would read \`${s.name}\` before it is set.`
								: `The move would read \`${s.name}\` after a later statement changes it.`,
						);
					}
				}
				for (const s of own.writes) {
					if (o.reads.has(s) || o.writes.has(s)) {
						throw new EditError(
							from < to
								? `The move would read \`${s.name}\` before it is set.`
								: `The move would change \`${s.name}\` before an earlier statement reads it.`,
						);
					}
				}
			}
			const moving = lineRange(source, a.statement);
			const movingText = source.slice(moving.start, moving.end);
			const anchorRange = lineRange(source, list[to]);
			if (from < to) {
				// [moving][between...][anchor] -> [between...][anchor][moving]
				const between = source.slice(moving.end, anchorRange.end);
				return {
					edit: {
						start: moving.start,
						end: anchorRange.end,
						text: between + withNewline(movingText),
					},
				};
			}
			const between = source.slice(anchorRange.start, moving.start);
			// [anchor][between...][moving] -> [moving][anchor][between...]
			return {
				edit: {
					start: anchorRange.start,
					end: moving.end,
					text: withNewline(movingText) + between,
				},
			};
		}
		default:
			throw new EditError('Unknown edit.');
	}
}

function withNewline(text: string): string {
	return text.endsWith('\n') ? text : `${text}\n`;
}

/** Applies a canvas action to the source. */
export function applyCanvasEdit(source: string, edit: CanvasEdit): EditResult {
	let computed: { edit: TextEdit; variable?: string };
	try {
		computed = computeEdit(source, edit);
	} catch (e) {
		if (e instanceof EditError) return { error: e.message };
		throw e;
	}
	const next = apply(source, computed.edit);
	const result = compile(next);
	if (!result.ok) {
		const diagnostics = mapDiagnostics(next, result.diagnostics);
		const first = diagnostics[0];
		const where = first?.nodeId ? ` (node "${first.nodeId}")` : '';
		return {
			error: first
				? `${first.code} ${first.message}${where}`
				: 'The edited workflow does not compile.',
			diagnostics,
		};
	}
	return computed.variable === undefined
		? { source: next, edit: computed.edit }
		: { source: next, edit: computed.edit, variable: computed.variable };
}
