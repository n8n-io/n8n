import { describe, expect, it } from 'vitest';

import { allItemsCode, eachItemCode } from '../code-node.ts';
import { hostRunners } from './behaviour/compare.ts';

/** Runs Code node code in the fallback host with the converter's prologue. */
function run(code: string, each: boolean, input: unknown[], nodes: Record<string, unknown>) {
	const body = each ? eachItemCode(code, true, false) : allItemsCode(code, true);
	return hostRunners().code({ name: 'code', code: body, items: [...input, { $nodes: nodes }] });
}

describe('$item in host code steps', () => {
	const nodes = { Src: [{ x: 'a' }, { x: 'b' }], Empty: [] };

	it('gives item k of a node and the input item k', () => {
		const code =
			'return items.map((i, k) => ({ json: { v: $item(k).$node["Src"].json.x, own: $item(k).$json.n } }));';
		expect(run(code, false, [{ n: 1 }, { n: 2 }], nodes)).toEqual([
			{ v: 'a', own: 1 },
			{ v: 'b', own: 2 },
		]);
	});

	it('works in "each item" mode with $itemIndex', () => {
		const code = 'return { json: { v: $item($itemIndex).$node["Src"].data.x } };';
		expect(run(code, true, [{}, {}], nodes)).toEqual([{ v: 'a' }, { v: 'b' }]);
	});

	it('throws v1 errors for an item past the end and for a node without items', () => {
		const past = 'return [{ json: { v: $item(2).$node["Src"].json.x } }];';
		expect(() => run(past, false, [{}], nodes)).toThrow(
			'"Src" node has 2 item(s) but you\'re trying to access item 2',
		);
		const empty = 'return [{ json: { v: $item(0).$node["Empty"].json } }];';
		expect(() => run(empty, false, [{}], nodes)).toThrow("Node 'Empty' hasn't been executed");
	});
});

/** A binary entry of an item: as in v1, it stays as the code made it. */
const BINARY = { data: 'aGk=', mimeType: 'text/plain' };

describe('binary data in host code steps', () => {
	const bin = "{ data: { data: 'aGk=', mimeType: 'text/plain' } }";
	const wire = { $binary: { data: BINARY } };

	it('takes the binary data out of the JSON in "all items" mode', () => {
		expect(run(`return [{ binary: ${bin} }];`, false, [], {})).toEqual([wire]);
		expect(run(`return [{ json: { a: 1 }, binary: ${bin} }];`, false, [], {})).toEqual([
			{ a: 1, ...wire },
		]);
	});

	it('gives an empty json and the binary data in "each item" mode', () => {
		expect(run(`return { binary: ${bin} };`, true, [{}, {}], {})).toEqual([wire, wire]);
		expect(run(`return { a: 1, binary: ${bin} };`, true, [{}, {}], {})).toEqual([wire, wire]);
		// As v1's `extractJsonData`: a result with `binary` and no `json` gives an empty `json`.
		expect(run(`return { a: $json.a, binary: ${bin} };`, true, [{ a: 1 }], {})).toEqual([wire]);
		expect(run('return { a: 1 };', true, [{}, {}], {})).toEqual([{ a: 1 }, { a: 1 }]);
	});

	it('takes each item of a mix on its own in "each item" mode', () => {
		expect(
			run(
				`if ($itemIndex === 0) return { a: 1 };\nreturn { b: 2, binary: ${bin} };`,
				true,
				[{}, {}],
				{},
			),
		).toEqual([{ a: 1 }, wire]);
	});
});
