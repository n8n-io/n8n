/**
 * The escape hatch for expressions that do not compile: the node runs whole in
 * the fallback host with its v1 parameters as they are, and with the run data
 * that its expressions may read (`runData` of the step: the outputs of the
 * nodes that it names and of the nodes before it, or of every node that ran
 * when a name is computed or `$evaluateExpression` is used). n8n's own
 * expression engine in the host then gives the v1 values: Luxon (`$now`,
 * `.toFormat()`), regular expressions, locale options, `$(…)` with a computed
 * name, `$evaluateExpression` and anything else that the translation lacks.
 *
 * Items carry no paired-item lineage: the host pairs an item with the item at
 * the same position of its parent, as the converted code does.
 */
import type { Code } from './code.ts';
import { literal, raw, str } from './code.ts';
import type { NodeContext } from './context.ts';
import { emitHostCall } from './host-node.ts';
import { settingsField } from './steps.ts';

/** Names that the parameters read with `$('…')`, `$node[…]` or `$items(…)`; null when a name is computed. */
const TEMPLATE_START = '$' + '{';

export function referencedNodes(parameters: unknown): string[] | null {
	const text = JSON.stringify(parameters ?? {});
	if (/\$evaluateExpression\b/.test(text)) return null;
	const names: string[] = [];
	const re =
		/\$\(\s*(?:\\?["'`])((?:[^"'`\\]|\\.)*?)\\?["'`]\s*\)|\$node\s*\[\s*\\?["']((?:[^"'\\]|\\.)*?)\\?["']\s*\]|\$node\.([A-Za-z_$][\w$]*)|\$items\(\s*\\?["']((?:[^"'\\]|\\.)*?)\\?["']/g;
	for (let m = re.exec(text); m !== null; m = re.exec(text)) {
		const name = m[1] ?? m[2] ?? m[3] ?? m[4] ?? '';
		// A template name such as `Branch ${i}` is computed.
		if (name.includes(TEMPLATE_START)) return null;
		if (!names.includes(name)) names.push(name);
	}
	// `$(` with a name that is not a plain string.
	if (/\$\(\s*(?!\\?["'`])/.test(text)) return null;
	return names;
}

/** Runs the node whole in the fallback host, with `runData` for its expressions. */
export function lowerWithRunData(c: NodeContext, mainCount: number, runData: Code): void {
	c.markFallback();
	const fields: Array<[string, Code]> = [
		['type', raw(str(c.node.type))],
		['typeVersion', literal(c.version)],
		['parameters', literal(c.parameters)],
	];
	const credential = c.credential();
	if (credential !== undefined) fields.push(['credential', raw(str(credential))]);
	const retry = c.retry();
	if (retry) fields.push(['retry', retry]);
	fields.push(...settingsField(c));
	fields.push(['host', raw(str('fallback'))], ['runData', runData]);
	emitHostCall(c, { fields, perItem: false, usesIndex: false }, mainCount);
}
