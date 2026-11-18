/**
 * Native lowering of the Rename Keys core node. Each lowering copies the v1
 * node for the parameter forms that it names. A form that the lowering does
 * not prove throws `NodeFailure`, and the driver runs the node in the
 * fallback host.
 */
import { str } from './code.ts';
import type { NodeContext } from './context.ts';
import { NodeFailure } from './context.ts';
import { ITEM } from './expression.ts';
import { isRecord, text } from './types.ts';

/**
 * Rename Keys version 1: the `keys.key[]` entries `{ currentKey, newKey }`, read and written
 * as lodash paths. The regex replacement form is not proven, so it stays in the host.
 */
export function lowerRenameKeys(c: NodeContext): void {
	const p = c.parameters;
	const list = isRecord(p.keys) && Array.isArray(p.keys.key) ? p.keys.key : [];
	const specs = list.filter(isRecord).map((k) => ({
		current: text(k.currentKey, ''),
		next: text(k.newKey, ''),
	}));
	for (const s of specs) {
		if (s.current.startsWith('=') || s.next.startsWith('=')) {
			throw new NodeFailure('expression', 'A key name is an expression.', 'keys.key');
		}
	}
	const additional = isRecord(p.additionalOptions) ? p.additionalOptions : {};
	const regex = isRecord(additional.regexReplacement) ? additional.regexReplacement : {};
	const replacements = Array.isArray(regex.replacements) ? regex.replacements : [];
	if (replacements.length > 0) {
		throw new NodeFailure(
			'rename-keys-regex',
			'The regex replacement form is not proven, so the node runs in the fallback host.',
			'additionalOptions.regexReplacement',
		);
	}
	// v1 skips a key with an empty side or with equal sides, for every item.
	const active = specs.filter((s) => s.current !== '' && s.next !== '' && s.current !== s.next);
	const out = c.output(0);
	const w = c.w;
	c.helper('copyJson');
	c.helper('getPath');
	c.helper('setPath');
	c.helper('unsetPath');
	w.open(`const ${out}: Json[] = ${c.input}.map((${ITEM}: Json) => {`);
	w.line(`const item: Json = copyJson(${ITEM});`);
	for (const s of active) {
		w.open('{');
		// v1 reads the value from the original item, then writes and deletes on the copy.
		w.line(`const value: Json = getPath(${ITEM}, ${str(s.current)});`);
		w.line('if (value !== undefined) {');
		w.line(`setPath(item, ${str(s.next)}, value);`);
		w.line(`unsetPath(item, ${str(s.current)});`);
		w.line('}');
		w.close('}');
	}
	w.line('return item;');
	w.close('});');
}
