/**
 * The helper `pathOf` splits a path as the first version of the helper did, which read
 * the path character by character. The converter splits constant paths itself
 * (`pathKeys`), with the same result.
 */
import { describe, expect, it } from 'vitest';

import { decodeModule } from '../../compiler/decode.ts';
import { compile } from '../../compiler/index.ts';
import { runReference } from '../../reference/runner.ts';
import { emptyCost, runModule } from '../../testing/vm.ts';
import {
	deletePathCode,
	helperSources,
	pathKeys,
	readPathCode,
	writePathCode,
} from '../helpers.ts';

const BEFORE = `function pathOfBefore(path: string): string[] {
	const keys: string[] = [];
	let current = '';
	for (let k = 0; k < path.length; k++) {
		const c = path.charAt(k);
		const quote = c === '[' ? path.charAt(k + 1) : '';
		if (quote === '"' || quote === "'") {
			let text = '';
			let end = -1;
			for (let j = k + 2; j < path.length; j++) {
				const d = path.charAt(j);
				if (d === '\\\\' && j + 1 < path.length) {
					text += path.charAt(j + 1);
					j++;
				} else if (d === quote && path.charAt(j + 1) === ']') {
					end = j + 1;
					break;
				} else {
					text += d;
				}
			}
			if (end !== -1) {
				if (current !== '') keys.push(current);
				current = '';
				keys.push(text);
				k = end;
				continue;
			}
		}
		if (c === '.' || c === '[' || c === ']') {
			if (current !== '') keys.push(current);
			current = '';
		} else {
			current += c;
		}
	}
	if (current !== '') keys.push(current);
	return keys;
}`;

const SOURCE = `import { webhook, workflow } from '@n8n/workflow-lang';

type Json = any;

export default workflow({
	triggers: [webhook<Json>({ path: 'paths' })],
	async run(ctx, trigger) {
		const paths: string[] = trigger.body.paths;
		return { before: paths.map((p) => pathOfBefore(p)), now: paths.map((p) => pathOf(p)) };
	},
});

${BEFORE}

${helperSources(['pathOf']).join('\n\n')}
`;

const WRITTEN = [
	'',
	'a',
	'a.b',
	'a.b[0].c',
	'a..b',
	'.a.',
	'...',
	'a[0][1]',
	'a[]b',
	'a]b',
	'[',
	']',
	'[0]',
	'a b.c d',
	"a['b.c [d]'].e",
	'a["b.c"].d',
	'["a"]["b"]',
	"['']",
	'[""].x',
	"a['b\\'c']",
	"a['b\\\\']",
	'a["b\\"]"]',
	"a['b",
	'a["b',
	"a['b'",
	"a['b']c",
	'[\'a"]',
	'["a\']',
	"['a']['b",
	'["a["b"]',
	"['a['b']",
	'[\'a["b"]\']',
	"a.['b']",
	"a['b\\",
	"['\\",
	'é.😀[ü]',
	"x['é😀'].y",
	'a.0.b',
	'0',
	'a\\.b',
	"[\"['a']",
	'[\'["a"]',
];

/** Paths from a fixed sequence of numbers: text of the characters that the split reads. */
function generated(count: number): string[] {
	const alphabet = ['a', 'b', '0', '.', '.', '[', ']', "'", '"', '\\', ' ', "['", "']", '["', '"]'];
	let state = 12345;
	const next = (n: number) => {
		state = (state * 1103515245 + 12345) % 2147483648;
		return state % n;
	};
	const out: string[] = [];
	for (let k = 0; k < count; k++) {
		let path = '';
		const size = next(14);
		for (let j = 0; j < size; j++) path += alphabet[next(alphabet.length)];
		out.push(path);
	}
	return out;
}

const PATHS = [...WRITTEN, ...generated(3000)];

describe('pathOf', () => {
	const fixture = { trigger: { body: { paths: PATHS } }, now: 0, seed: 1, effects: {} };

	it('splits each path as before, on the reference runner', async () => {
		const out = await runReference(SOURCE, fixture);
		expect(out.status).toBe('ok');
		const result = out.result as { before: string[][]; now: string[][] };
		expect(result.before).toHaveLength(PATHS.length);
		expect(result.now).toEqual(result.before);
	});

	it('splits each path as before, in bytecode', () => {
		const compiled = compile(SOURCE, { fileName: 'workflow.ts' });
		expect(compiled.diagnostics).toEqual([]);
		if (!compiled.module) throw new Error('no module');
		const out = runModule(decodeModule(compiled.module), fixture, { fuel: 500_000_000 });
		expect(out.status).toBe('ok');
		const result = out.result as { before: string[][]; now: string[][] };
		expect(result.now).toEqual(result.before);
		// The converter splits a constant path to the same keys.
		expect(PATHS.map(pathKeys)).toEqual(result.before);
	});

	it('reads a long path with open quotes in linear time', () => {
		const source = SOURCE.replace('before: paths.map((p) => pathOfBefore(p)), ', '');
		const module = compile(source, { fileName: 'workflow.ts' }).module;
		if (!module) throw new Error('no module');
		const instructions = (size: number) => {
			const paths = [`${'["'.repeat(size)}${"['".repeat(size)}`];
			const cost = emptyCost();
			const out = runModule(
				decodeModule(module),
				{ ...fixture, trigger: { body: { paths } } },
				{ cost },
			);
			expect(out.status).toBe('ok');
			return cost.ops;
		};
		expect(instructions(4000)).toBeLessThanOrEqual(instructions(1000) * 5);
	});
});

describe('code of a constant path', () => {
	const used: string[] = [];
	const helper = (name: string) => used.push(name);

	it('reads one key without a helper', () => {
		expect(readPathCode('$json', 'name', helper)).toBe("$json?.['name']");
		expect(used).toEqual([]);
	});

	it('gives the keys of a path to the helper', () => {
		expect(readPathCode('$json', 'a.b[0]', helper)).toBe(
			"getKeys($json, 'a.b[0]', ['a', 'b', '0'])",
		);
		expect(readPathCode('$json', '0', helper)).toBe("getKeys($json, '0', ['0'])");
		expect(writePathCode('item', 'a.b', '1', helper)).toBe("setKeys(item, 'a.b', ['a', 'b'], 1);");
		expect(writePathCode('item', 'a', '1', helper)).toBe("item['a'] = 1;");
		expect(deletePathCode('item', 'a.b', helper)).toBe("unsetKeys(item, ['a', 'b']);");
		expect(deletePathCode('item', 'a.', helper)).toBe("delete item['a'];");
		expect(deletePathCode('item', '', helper)).toBe('unsetKeys(item, []);');
	});
});
