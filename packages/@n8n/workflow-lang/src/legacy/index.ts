/**
 * Legacy (v1) expressions: compiles the body of `{{ }}` expressions with the
 * workflow compiler.
 *
 * `$json` becomes a variable that holds the current item. A reference to the
 * item of another node (`$('Node').item.json`, `$node["Node"].json`) becomes
 * a variable that holds that item. `$now.toISO()`, `$now.toMillis()` and
 * `$today.toISO()` become Date forms. Other n8n variables do not fit the
 * subset, and the import reports them.
 */
import ts from 'typescript';

import type { CompileResult } from '../compiler/index.ts';
import { compile } from '../compiler/index.ts';
import type { Diagnostic } from '../compiler/validate.ts';

/** Input of a compiled expression: the current item and the items of other nodes. */
export interface LegacyInput {
	json: unknown;
	nodes: Record<string, unknown>;
}

export interface RewrittenExpression {
	/** Body text in the workflow subset. */
	code: string;
	/** Variable name for each referenced node. */
	nodes: Map<string, string>;
	/** n8n variables that have no mapping, such as `$now`. */
	unsupported: string[];
}

export interface LegacyIssue {
	/** Short category, used to rank the missing features. */
	feature: string;
	message: string;
	code: string;
}

export type LegacyCompileResult =
	| { ok: true; result: CompileResult; rewritten: RewrittenExpression }
	| { ok: false; issues: LegacyIssue[]; rewritten?: RewrittenExpression };

const NODE_REF = [
	// $('Node').item.json, $("Node").item.json
	/\$\(\s*(['"`])((?:\\.|(?!\1).)*)\1\s*\)\s*\.\s*item\s*\.\s*json/g,
	// $node["Node"].json, $node['Node'].json
	/\$node\s*\[\s*(['"])((?:\\.|(?!\1).)*)\1\s*\]\s*\.\s*json/g,
];
const NODE_DOT_REF = /\$node\s*\.\s*([A-Za-z_$][\w$]*)\s*\.\s*json/g;
const INPUT_ITEM = /\$input\s*\.\s*item\s*\.\s*json/g;

/**
 * The Luxon forms of `$now` and `$today` that have an exact Date form. With
 * the UTC policy (spec section 4.5), Luxon's `toISO()` prints `Z` and the
 * same extended years as `toISOString()`. Other Luxon methods have no mapping.
 */
const TIME_FORMS: Array<[RegExp, string]> = [
	[/\$now\s*\.\s*toISO\s*\(\s*\)/g, '(new Date().toISOString())'],
	[/\$now\s*\.\s*toMillis\s*\(\s*\)/g, 'Date.now()'],
	[
		/\$today\s*\.\s*toISO\s*\(\s*\)/g,
		'(new Date(Math.floor(Date.now() / 86400000) * 86400000).toISOString())',
	],
];

function nodeVariable(name: string, used: Map<string, string>): string {
	const found = used.get(name);
	if (found) return found;
	const base = `$node_${name.replace(/[^A-Za-z0-9_]/g, '_')}`;
	let v = base;
	const taken = new Set(used.values());
	for (let i = 2; taken.has(v); i++) v = `${base}_${i}`;
	used.set(name, v);
	return v;
}

/** Rewrites the n8n variables of an expression body to plain variables. */
export function rewriteLegacy(body: string): RewrittenExpression {
	const nodes = new Map<string, string>();
	let code = body.replace(INPUT_ITEM, '$json');
	for (const [re, form] of TIME_FORMS) code = code.replace(re, form);
	for (const re of NODE_REF) {
		code = code.replace(re, (_m, _q: string, name: string) =>
			nodeVariable(name.replace(/\\(.)/g, '$1'), nodes),
		);
	}
	code = code.replace(NODE_DOT_REF, (_m, name: string) => nodeVariable(name, nodes));
	const unsupported = new Set<string>();
	const sf = ts.createSourceFile('e.ts', `(${code})`, ts.ScriptTarget.ES2022, true);
	const declared = new Set(['$json', ...nodes.values()]);
	const visit = (n: ts.Node) => {
		if (ts.isIdentifier(n) && n.text.startsWith('$') && !declared.has(n.text)) {
			const p = n.parent;
			const isMember = ts.isPropertyAccessExpression(p) && p.name === n;
			const isKey = ts.isPropertyAssignment(p) && p.name === n;
			if (!isMember && !isKey) {
				// Name the call shape for `$('X')` uses that are not `.item.json`.
				unsupported.add(n.text === '$' ? "$('…') other than .item.json" : n.text);
			}
		}
		ts.forEachChild(n, visit);
	};
	visit(sf);
	return { code, nodes, unsupported: [...unsupported].sort() };
}

const GLOBAL_PATTERN = /^`([^`]+)` is (?:not in the workflow library|not allowed)\.$/;
const METHOD_PATTERN = /^The method `([^`]+)` is not in the workflow library\.$/;

/** Turns a compiler diagnostic into an issue with a feature name for ranking. */
export function issueOf(d: Diagnostic): LegacyIssue {
	const g = GLOBAL_PATTERN.exec(d.message);
	if (g) return { feature: g[1], message: d.message, code: d.code };
	const m = METHOD_PATTERN.exec(d.message);
	if (m) return { feature: `.${m[1]}()`, message: d.message, code: d.code };
	if (d.code === 'WL020' && d.message.startsWith('Regular expressions')) {
		return { feature: 'regular expression', message: d.message, code: d.code };
	}
	if (d.code === 'WL020' && d.message.startsWith('Spread arguments')) {
		return { feature: 'spread arguments', message: d.message, code: d.code };
	}
	if (d.code === 'WL001' && d.message.startsWith('`new`'))
		return { feature: 'new', message: d.message, code: d.code };
	if (d.code === 'WL007') return { feature: '== / !=', message: d.message, code: d.code };
	if (d.code === 'WL001' && d.message.includes('`this`'))
		return { feature: 'this', message: d.message, code: d.code };
	if (d.code === 'WL013')
		return { feature: dateFeature(d.message), message: d.message, code: d.code };
	if (d.code.startsWith('TS'))
		return { feature: `type error ${d.code}`, message: d.message, code: d.code };
	return { feature: d.code, message: d.message, code: d.code };
}

/** A short name for a Date rule (WL013), used to rank the missing features. */
function dateFeature(message: string): string {
	if (message.includes("'en-US'")) return 'Date: locale options';
	if (message.includes('object or array') || message.includes('from an array'))
		return 'Date: read from an object';
	if (message.includes('type any')) return 'Date: any value';
	if (message.includes('identity')) return 'Date: identity';
	if (message.includes('condition')) return 'Date: condition';
	return 'Date: other';
}

/** Drops type errors when a subset rule already explains the rejection. */
export function withoutTypeNoise(issues: LegacyIssue[]): LegacyIssue[] {
	const rules = issues.filter((i) => !i.code.startsWith('TS'));
	return rules.length > 0 ? rules : issues;
}

/** Builds a workflow whose `run` returns the value of each expression body. */
export function wrapExpressions(
	bodies: string[],
	nodeVars: Map<string, string>,
): { source: string; ranges: Array<[number, number]> } {
	let source = `import { webhook, workflow } from '@n8n/workflow-lang';

interface LegacyInput {
	json: any;
	nodes: Record<string, any>;
}

export default workflow({
	triggers: [webhook<LegacyInput>({ path: 'expression' })],
	async run(ctx, trigger) {
		const $json = trigger.body.json;
`;
	for (const [name, v] of nodeVars) {
		source += `\t\tconst ${v} = trigger.body.nodes[${JSON.stringify(name)}];\n`;
	}
	const ranges: Array<[number, number]> = [];
	bodies.forEach((body, i) => {
		const prefix = `\t\tconst e${i} = () => (\n`;
		source += prefix;
		const start = source.length;
		source += body;
		ranges.push([start, source.length]);
		source += '\n\t\t);\n';
	});
	if (bodies.length === 1) source += '\t\treturn e0();\n';
	else source += `\t\treturn [${bodies.map((_, i) => `e${i}()`).join(', ')}];\n`;
	source += '\t},\n});\n';
	return { source, ranges };
}

/** True when the body parses as one expression. */
export function parsesAsExpression(body: string): boolean {
	const text = `(${body}\n)`;
	const out = ts.transpileModule(text, {
		reportDiagnostics: true,
		compilerOptions: { target: ts.ScriptTarget.ES2022 },
	});
	if ((out.diagnostics ?? []).length > 0) return false;
	const sf = ts.createSourceFile('e.ts', text, ts.ScriptTarget.ES2022, true);
	return sf.statements.length === 1 && ts.isExpressionStatement(sf.statements[0]);
}

/**
 * Compiles one expression body (the text between `{{` and `}}`). The module
 * takes `{ json, nodes }` as its trigger body and returns the value.
 */
export function compileLegacyExpression(body: string): LegacyCompileResult {
	const rewritten = rewriteLegacy(body.trim());
	if (!parsesAsExpression(rewritten.code)) {
		return {
			ok: false,
			issues: [{ feature: 'syntax', message: 'The body is not one expression.', code: 'WL100' }],
			rewritten,
		};
	}
	if (rewritten.unsupported.length > 0) {
		return {
			ok: false,
			issues: rewritten.unsupported.map((v) => ({
				feature: v,
				message: `\`${v}\` has no mapping to the subset.`,
				code: 'WL101',
			})),
			rewritten,
		};
	}
	const { source } = wrapExpressions([rewritten.code], rewritten.nodes);
	const result = compile(source, { nodes: {}, looseTypes: true });
	if (!result.ok)
		return { ok: false, issues: withoutTypeNoise(result.diagnostics.map(issueOf)), rewritten };
	return { ok: true, result, rewritten };
}

/** Extracts the `{{ }}` bodies of an n8n parameter value (`=...`). */
export function extractExpressions(value: string): string[] {
	if (!value.startsWith('=')) return [];
	const out: string[] = [];
	let i = 1;
	for (;;) {
		const open = value.indexOf('{{', i);
		if (open < 0) break;
		const close = value.indexOf('}}', open + 2);
		if (close < 0) break;
		out.push(value.slice(open + 2, close).trim());
		i = close + 2;
	}
	return out.filter((b) => b.length > 0);
}

export interface ImportIssue {
	node: string;
	parameter: string;
	expression: string;
	issues: LegacyIssue[];
}

/** Checks every expression of a v1 workflow and reports the ones that do not fit. */
export function importWorkflowExpressions(workflow: {
	nodes: Array<{ name: string; parameters?: Record<string, unknown> }>;
}): { total: number; compiled: number; issues: ImportIssue[] } {
	let total = 0;
	let compiled = 0;
	const issues: ImportIssue[] = [];
	for (const node of workflow.nodes) {
		for (const [path, value] of stringParameters(node.parameters ?? {}, '')) {
			for (const body of extractExpressions(value)) {
				total++;
				const r = compileLegacyExpression(body);
				if (r.ok) compiled++;
				else issues.push({ node: node.name, parameter: path, expression: body, issues: r.issues });
			}
		}
	}
	return { total, compiled, issues };
}

/** All string values of a parameter tree with their paths. */
export function stringParameters(value: unknown, path: string): Array<[string, string]> {
	if (typeof value === 'string') return [[path, value]];
	if (Array.isArray(value)) return value.flatMap((v, i) => stringParameters(v, `${path}[${i}]`));
	if (typeof value === 'object' && value !== null) {
		return Object.entries(value).flatMap(([k, v]) =>
			stringParameters(v, path ? `${path}.${k}` : k),
		);
	}
	return [];
}
