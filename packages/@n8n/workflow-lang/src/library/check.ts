/**
 * Checks `ctx.node` calls of library nodes against the `supports` list of the
 * node (`WL060`). A library node implements only some operations and
 * parameters of the v1 node. The check rejects the others at compile time,
 * so a workflow does not silently send a different request.
 *
 * The check reads literal values only. A non-literal `resource`, `operation`
 * or `parameters` value is checked at run time by the node.
 */
import ts from 'typescript';

import {
	ctxCallMethod,
	findNodeDefinition,
	getProperty,
	isEffectCall,
	propertyName,
	skipOuter,
	stringLiteralValue,
} from '../compiler/analysis.ts';
import type { WorkflowProgram } from '../compiler/program.ts';
import type { Diagnostic } from '../compiler/validate.ts';
import { makeDiagnostic } from '../compiler/validate.ts';

export interface Support {
	resource: string;
	operation: Record<string, string>;
	operations: Record<string, string[]>;
}

/** Reads a literal object of strings and string arrays. */
function readLiteral(expr: ts.Expression | undefined): unknown {
	if (!expr) return undefined;
	const e = skipOuter(expr);
	if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return e.text;
	if (ts.isArrayLiteralExpression(e)) return e.elements.map((x) => readLiteral(x));
	if (ts.isObjectLiteralExpression(e)) {
		const out: Record<string, unknown> = {};
		for (const p of e.properties) {
			const name = p.name ? propertyName(p.name) : null;
			if (ts.isPropertyAssignment(p) && name !== null) out[name] = readLiteral(p.initializer);
		}
		return out;
	}
	return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Reads `supports` of a library node file, or undefined when the node has none. */
export function readSupport(sf: ts.SourceFile): { type: string; support: Support } | undefined {
	const def = findNodeDefinition(sf);
	if (!def) return undefined;
	const type = stringLiteralValue(getProperty(def.options, 'type')?.initializer);
	const raw = readLiteral(getProperty(def.options, 'supports')?.initializer);
	if (!type || !isRecord(raw) || !isRecord(raw.operations)) return undefined;
	const operations: Record<string, string[]> = {};
	for (const [key, list] of Object.entries(raw.operations)) {
		operations[key] = Array.isArray(list) ? list.filter((x) => typeof x === 'string') : [];
	}
	const operation: Record<string, string> = {};
	if (isRecord(raw.operation)) {
		for (const [k, v] of Object.entries(raw.operation)) if (typeof v === 'string') operation[k] = v;
	}
	return {
		type,
		support: {
			resource: typeof raw.resource === 'string' ? raw.resource : '',
			operation,
			operations,
		},
	};
}

/**
 * An accepted name can carry the values the library node supports:
 * `simple=true` accepts `simple` only as the literal `true` (the node's
 * other mode runs in the fallback host). Values are JSON texts, `|` between
 * them: `format="full"|"metadata"`.
 */
export function splitAccepts(accepts: string[]): {
	names: string[];
	values: Map<string, string[]>;
} {
	const names: string[] = [];
	const values = new Map<string, string[]>();
	for (const a of accepts) {
		const eq = a.indexOf('=');
		if (eq < 0) {
			names.push(a);
			continue;
		}
		names.push(a.slice(0, eq));
		values.set(a.slice(0, eq), a.slice(eq + 1).split('|'));
	}
	return { names, values };
}

/** The JSON text of a literal TypeScript value, or null when it is not a literal. */
function literalJson(e: ts.Expression): string | null {
	if (e.kind === ts.SyntaxKind.TrueKeyword) return 'true';
	if (e.kind === ts.SyntaxKind.FalseKeyword) return 'false';
	if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return JSON.stringify(e.text);
	if (ts.isNumericLiteral(e)) return JSON.stringify(Number(e.text));
	return null;
}

/** The operation key of spec section 4.2: `resource.operation`, `operation`, or `default`. */
export function operationKey(resource: string, operation: string): string {
	return [resource, operation].filter(Boolean).join('.') || 'default';
}

const ALWAYS_ACCEPTED = new Set(['resource', 'operation']);

/** Checks the parameters of one call. Returns messages, empty when the call is supported. */
export function checkParameters(
	support: Support,
	parameters: ts.ObjectLiteralExpression,
): Array<{ node: ts.Node; message: string; suggestion: string }> {
	const problems: Array<{ node: ts.Node; message: string; suggestion: string }> = [];
	const resourceExpr = getProperty(parameters, 'resource')?.initializer;
	const operationExpr = getProperty(parameters, 'operation')?.initializer;
	const resource = resourceExpr ? stringLiteralValue(resourceExpr) : support.resource;
	if (resource === null) return problems;
	const operation = operationExpr
		? stringLiteralValue(operationExpr)
		: (support.operation[resource] ?? '');
	if (operation === null) return problems;
	const key = operationKey(resource, operation);
	const accepts = support.operations[key];
	const supported = Object.keys(support.operations);
	if (!accepts) {
		problems.push({
			node: operationExpr ?? resourceExpr ?? parameters,
			message: `The compiled library has no operation "${key}" for this node. It supports: ${supported.join(', ') || 'none'}.`,
			suggestion: 'Use a supported operation, or call the API with ctx.http.',
		});
		return problems;
	}
	const split = splitAccepts(accepts);
	const allowed = new Set(split.names);
	for (const p of parameters.properties) {
		if (ts.isSpreadAssignment(p)) return problems;
		const name = p.name ? propertyName(p.name) : null;
		if (name === null || ALWAYS_ACCEPTED.has(name)) continue;
		if (!allowed.has(name)) {
			problems.push({
				node: p,
				message: `The compiled library does not support the parameter "${name}" of operation "${key}".`,
				suggestion: `Remove "${name}", or call the API with ctx.http. Supported: ${accepts.join(', ')}.`,
			});
			continue;
		}
		const members = split.names
			.filter((a) => a.startsWith(`${name}.`))
			.map((a) => a.slice(name.length + 1));
		const value = ts.isPropertyAssignment(p) ? skipOuter(p.initializer) : undefined;
		const only = split.values.get(name);
		if (only && value && !only.includes(literalJson(value) ?? '')) {
			problems.push({
				node: p,
				message: `The compiled library supports "${name}" of operation "${key}" only as ${only.join(' or ')}.`,
				suggestion: `Set "${name}" to ${only.join(' or ')}, or run the node in the fallback host.`,
			});
			continue;
		}
		if (members.length === 0 || !value || !ts.isObjectLiteralExpression(value)) continue;
		for (const m of value.properties) {
			if (ts.isSpreadAssignment(m)) break;
			const member = m.name ? propertyName(m.name) : null;
			const memberOnly = member === null ? undefined : split.values.get(`${name}.${member}`);
			const memberValue = ts.isPropertyAssignment(m) ? skipOuter(m.initializer) : undefined;
			if (memberOnly && memberValue && !memberOnly.includes(literalJson(memberValue) ?? '')) {
				problems.push({
					node: m,
					message: `The compiled library supports "${name}.${member}" of operation "${key}" only as ${memberOnly.join(' or ')}.`,
					suggestion: `Set "${member}" to ${memberOnly.join(' or ')}, or run the node in the fallback host.`,
				});
				continue;
			}
			if (member !== null && !members.includes(member)) {
				problems.push({
					node: m,
					message: `The compiled library does not support "${name}.${member}" of operation "${key}".`,
					suggestion: `Remove "${member}". Supported in "${name}": ${members.join(', ')}.`,
				});
			}
		}
	}
	return problems;
}

export interface LibraryCallCheck {
	/** `WL060`: a call with `host: 'library'` that the library node does not support. */
	errors: Diagnostic[];
	/** `WL061`: a call that runs in the fallback host because the library node does not support it. */
	warnings: Diagnostic[];
	/** `ctx.node` calls that the compiler must not link to the library. */
	unlinked: Set<ts.Node>;
}

/**
 * Decides for each `ctx.node` call with a library type whether it links to
 * the library node or runs the v1 node in the fallback host:
 * - `host: 'fallback'` never links,
 * - `host: 'library'` always links; unsupported parameters are errors,
 * - without `host`, a call that the `supports` list rejects runs in the
 *   fallback host, with a warning.
 */
export function checkLibraryCalls(wp: WorkflowProgram): LibraryCallCheck {
	const supports = new Map<string, Support>();
	const libraryTypes = new Set<string>();
	for (const sf of wp.nodeFiles) {
		const def = findNodeDefinition(sf);
		const type = def ? stringLiteralValue(getProperty(def.options, 'type')?.initializer) : null;
		if (type) libraryTypes.add(type);
		const found = readSupport(sf);
		if (found) supports.set(found.type, found.support);
	}
	const result: LibraryCallCheck = { errors: [], warnings: [], unlinked: new Set() };
	const visit = (node: ts.Node) => {
		if (isEffectCall(wp.checker, node) && ctxCallMethod(wp.checker, node) === 'node') {
			const opts = node.arguments[0] ? skipOuter(node.arguments[0]) : undefined;
			if (opts && ts.isObjectLiteralExpression(opts)) checkCall(node, opts);
		}
		ts.forEachChild(node, visit);
	};
	const checkCall = (call: ts.CallExpression, opts: ts.ObjectLiteralExpression) => {
		const type = stringLiteralValue(getProperty(opts, 'type')?.initializer);
		if (!type || !libraryTypes.has(type)) return;
		const hostExpr = getProperty(opts, 'host')?.initializer;
		const host = hostExpr ? stringLiteralValue(hostExpr) : null;
		if (hostExpr && host !== 'library' && host !== 'fallback') {
			result.errors.push(
				makeDiagnostic(
					hostExpr,
					'WL060',
					'`host` must be the literal "library" or "fallback".',
					"host: 'fallback'",
				),
			);
			return;
		}
		if (host === 'fallback') {
			result.unlinked.add(call);
			return;
		}
		const support = supports.get(type);
		if (!support) return;
		const params = getProperty(opts, 'parameters')?.initializer;
		const literal = params ? skipOuter(params) : ts.factory.createObjectLiteralExpression();
		if (!ts.isObjectLiteralExpression(literal)) return;
		const problems = checkParameters(support, literal);
		if (problems.length === 0) return;
		for (const p of problems) {
			const at = p.node.pos >= 0 ? p.node : call;
			if (host === 'library') {
				result.errors.push(makeDiagnostic(at, 'WL060', `${type}: ${p.message}`, p.suggestion));
			} else {
				result.warnings.push(
					makeDiagnostic(
						at,
						'WL061',
						`${type}: ${p.message} The step runs the v1 node in the fallback host.`,
						"Add host: 'fallback' to choose this, or change the parameters to run natively.",
					),
				);
			}
		}
		if (host !== 'library') result.unlinked.add(call);
	};
	visit(wp.workflowFile);
	return result;
}
