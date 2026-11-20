/**
 * Loop Over Items (Split in Batches) versions 1, 2 and 3.
 *
 * The node keeps its state in the node context across its runs, as v1 does
 * (`getContext('node')`): the items left, the processed items, `done`,
 * `noItemsLeft`, `currentRunIndex` and `maxRunIndex`. The converter declares
 * the context once for each workflow body, so expressions such as
 * `$node["Loop"].context["noItemsLeft"]` read it. The helper
 * `splitInBatches` copies the `execute` method of each version:
 *
 * - The first run (or a run with the "reset" option) takes the input items,
 *   gives the first batch and keeps the rest.
 * - A later run gives the next batch. Versions 2 and 3 add the input items of
 *   that run to the processed items.
 * - When no batch is left, version 1 gives nothing (`null`: the branch ends),
 *   version 2 gives the processed items on output 1 ("done") and version 3 on
 *   output 0 ("done").
 *
 * The loop itself comes from the graph: the last node of the loop body sends
 * its items back to this node, and the v1 run stack of the engine shape runs
 * it again (see `generator.ts`).
 */
import type { Code } from './code.ts';
import { print, str } from './code.ts';
import type { NodeContext } from './context.ts';
import { INDEX, ITEM, isExpression } from './expression.ts';
import { errorRetry } from './steps.ts';
import { isRecord } from './types.ts';

const flatCode = (code: Code) => print(code, '', 0, Number.MAX_SAFE_INTEGER);

export function lowerSplitInBatches(c: NodeContext): void {
	const p = c.parameters;
	const w = c.w;
	const opts = isRecord(p.options) ? p.options : {};
	const state = c.state();
	const version = c.version >= 3 ? 3 : c.version >= 2 ? 2 : 1;
	const size = c.compiled(p.batchSize ?? (version >= 3 ? 1 : 10), 'batchSize');
	const reset = c.compiled(opts.reset ?? false, 'options.reset');
	const usesItem = size.usage.item || reset.usage.item;
	const usesIndex = size.usage.index || reset.usage.index;
	c.helper('splitInBatches');
	const outs =
		version === 3
			? [c.output(0, 'Done'), c.output(1, 'Loop')]
			: version === 2
				? [c.output(0, 'Loop'), c.output(1, 'Done')]
				: [c.output(0)];
	// The items of the loop output keep the index of their item in the list of the first run
	// of the node, over all runs: v1 pairs them with that input (see `loopEntryOf` in the
	// generator). A fractional or reset batch size has no such indexes.
	const batch = p.batchSize === undefined ? 1 : p.batchSize;
	const step = typeof batch === 'number' && Number.isInteger(batch) && batch > 0 ? batch : null;
	const pairsOfLoop =
		version === 3 &&
		c.engine &&
		step !== null &&
		(opts.reset === undefined || opts.reset === false) &&
		c.pairsWanted === true &&
		c.setPairs !== undefined
			? outs[1]
			: null;
	const result = c.local('Outputs');
	w.line(`let ${result}: Json[][] | null = null;`);
	// v1 reads the parameters for the first item.
	w.open(`if (${c.input}.length > 0) {`);
	if (usesItem) w.line(`const ${ITEM} = ${c.input}[0];`);
	if (usesIndex) w.line(`const ${INDEX} = 0;`);
	// v1 resets only when the option is the boolean `true`.
	const resetCode = isExpression(opts.reset)
		? `${flatCode(reset.code)} === true`
		: String(opts.reset === true);
	const sizeCode =
		typeof p.batchSize === 'number' || p.batchSize === undefined
			? flatCode(size.code)
			: `Number(${flatCode(size.code)})`;
	const call = `splitInBatches(${state}, ${c.input}, ${sizeCode}, ${resetCode}, ${version})`;
	w.line(`${result} = ${call};`);
	const retry = errorRetry(c);
	if (retry) {
		// "Retry on fail" of v1 (see errorRetry): each run of this node adds the input items
		// to the processed items again.
		c.helper('retryError');
		w.open(
			`for (let tryIndex = 1; tryIndex < ${retry.tries} && retryError(${result}?.[0]?.[0]); tryIndex++) {`,
		);
		if (retry.delay > 0) {
			w.line(
				`await ctx.wait({ name: ${str(`${c.node.name} (retry)`)}, duration: ${retry.delay} });`,
			);
		}
		w.line(`${result} = ${call};`);
		w.close();
	}
	w.close();
	if (c.engine && version === 1) {
		w.comment('Version 1 gives nothing when no item is left: the branch ends.');
		w.line(`if (${c.input}.length > 0 && ${result} === null) return null;`);
	}
	outs.forEach((o, k) => w.line(`const ${o}: Json[] = ${result}?.[${k}] ?? [];`));
	if (pairsOfLoop !== null) {
		const pairs = `${pairsOfLoop}Pairs`;
		w.line(`const ${pairs}: Json = { items: ${pairsOfLoop}, paired: [] };`);
		w.line(
			`for (let k = 0; k < ${pairsOfLoop}.length; k++) ${pairs}.paired.push(${state}.currentRunIndex * ${String(step)} + k);`,
		);
		c.setPairs?.(pairs, 1, true);
	}
}
