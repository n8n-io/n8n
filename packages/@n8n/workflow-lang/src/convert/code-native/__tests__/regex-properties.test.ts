/**
 * Unicode property escapes of regular expressions (`\p{…}`, `\P{…}` with the `u` flag).
 *
 * The runtime has the tables of each name of `regex-properties.generated.ts`
 * (`workflow-runtime/src/core/uniprop_tables.zig`). The test of `uniprop.zig` proves the
 * tables against Node.js for every code point. These tests prove the other side: the
 * converter accepts exactly the names of the tables, each name is a name of this Node.js,
 * and a Code node with such a pattern gives the result of n8n's task runner.
 */
import { beforeAll, describe, expect, it } from 'vitest';

import { useUtc } from '../../../reference/runner.ts';
import { processIdentity, setTargetNode } from '../../node-identity.ts';
import {
	REGEX_BINARY_PROPERTIES,
	REGEX_GENERAL_CATEGORIES,
	REGEX_PROPERTY_UNICODE,
	REGEX_SCRIPTS,
} from '../regex-properties.generated.ts';
import { checkRegex, regexPropertySupported } from '../regex-syntax.ts';
import { nativeCode, runnerCode, startRunner, taskRunnerAvailable } from './runner-oracle.ts';

useUtc();

/** Every text between the braces that the converter accepts. */
function expressions(): string[] {
	const out: string[] = [];
	for (const name of REGEX_GENERAL_CATEGORIES) {
		out.push(name, `gc=${name}`, `General_Category=${name}`);
	}
	for (const name of REGEX_BINARY_PROPERTIES) out.push(name);
	for (const name of REGEX_SCRIPTS) {
		out.push(`sc=${name}`, `Script=${name}`, `scx=${name}`, `Script_Extensions=${name}`);
	}
	return out;
}

describe('names of Unicode properties', () => {
	it('has the tables of the Unicode version of this Node.js', () => {
		expect(REGEX_PROPERTY_UNICODE).toBe(processIdentity().unicode);
	});

	it('accepts each name of the tables, and each is a name of this Node.js', () => {
		const all = expressions();
		expect(all.length).toBeGreaterThan(1500);
		for (const text of all) {
			expect(() => new RegExp(`\\p{${text}}`, 'u'), text).not.toThrow();
			expect(regexPropertySupported(text), text).toBe(true);
			expect(checkRegex(`[\\p{${text}}x]\\P{${text}}`, 'u').ok, text).toBe(true);
		}
	});

	it('refuses each other text', () => {
		const bad = [
			'Latin',
			'Latn',
			'l',
			'letter',
			'sc=latin',
			'Alphabetic=Yes',
			'gc=Alphabetic',
			'sc=L',
			'Block=Basic_Latin',
			'',
			'=',
			'gc=',
			'L=L',
			'RGI_Emoji',
		];
		for (const text of bad) {
			expect(regexPropertySupported(text), text).toBe(false);
			expect(checkRegex(`\\p{${text}}`, 'u').ok, text).toBe(false);
		}
		// Forms that the engine does not have: the `v` flag, `i` with `u`, a range with a class.
		expect(checkRegex('\\p{L}', 'v').ok).toBe(false);
		expect(checkRegex('\\p{L}', 'iu').ok).toBe(false);
		expect(checkRegex('[\\p{L}-z]', 'u').ok).toBe(false);
		expect(checkRegex('\\p{L', 'u').ok).toBe(false);
	});

	it('reads `\\p` without the `u` flag as the letter', () => {
		expect(checkRegex('\\p{L}', '').ok).toBe(true);
		expect(checkRegex('[\\p{Nope}]', 'g').ok).toBe(true);
	});

	it('refuses the names when the target Node.js has another Unicode version', () => {
		setTargetNode({ ...processIdentity(), unicode: '15.1' });
		try {
			expect(regexPropertySupported('L')).toBe(false);
			expect(checkRegex('\\p{L}', 'u')).toEqual({
				ok: false,
				reason: 'a Unicode property escape',
			});
		} finally {
			setTargetNode(undefined);
		}
	});
});

interface Case {
	name: string;
	code: string;
	items?: unknown[];
}

const TEXTS = [
	{ t: 'Héllo wörld 123, ÉCOLE normale!' },
	{ t: '漢字かなカナ and привет 😀🎉 #1' },
	{ t: "Jean-Luc O'Neil  éä   x" },
	{ t: '' },
];

const CASES: Case[] = [
	{
		name: 'letters and numbers: match, test and replace',
		code: 'return items.map((i) => ({ json: { words: i.json.t.match(/[\\p{L}\\p{N}_]+/gu), has: /\\p{Lu}/u.test(i.json.t), bare: i.json.t.replace(/[^\\p{L}\\p{N}\\s]/gu, "") } }));',
	},
	{
		name: 'negated property and marks',
		code: 'return items.map((i) => ({ json: { parts: i.json.t.split(/\\P{L}+/u), marks: i.json.t.replace(/\\p{Mn}/gu, "").length, upper: i.json.t.replace(/\\p{Ll}/gu, (c) => c.toUpperCase()) } }));',
	},
	{
		name: 'scripts with long names and codes',
		code: 'return items.map((i) => ({ json: { han: i.json.t.match(/\\p{Script=Han}+/u), cyrl: i.json.t.match(/\\p{sc=Cyrl}+/gu), kana: i.json.t.match(/[\\p{scx=Hira}\\p{Script_Extensions=Katakana}]+/gu) } }));',
	},
	{
		name: 'emoji and symbols',
		code: 'return items.map((i) => ({ json: { emoji: i.json.t.match(/\\p{Emoji_Presentation}/gu), clean: i.json.t.replace(/\\p{Extended_Pictographic}/gu, "").trim(), punct: i.json.t.match(/\\p{P}/gu), space: i.json.t.split(/\\p{White_Space}+/u).length } }));',
	},
	{
		name: 'a pattern from a RegExp constructor',
		code: 'const re = new RegExp("^[\\\\p{L}\\\\p{M}\\\\p{Zs}\\\\p{Pd}\'.]+$", "u");\nreturn items.map((i) => ({ json: { name: re.test(i.json.t) } }));',
	},
	{
		name: 'without the u flag the escape is the letter p',
		code: 'return items.map((i) => ({ json: { v: "p{L} x".replace(/\\p{L}/, "!"), w: /[\\p{L}]/.test(i.json.t) } }));',
	},
];

describe.skipIf(!taskRunnerAvailable())('Unicode property escapes against the task runner', () => {
	beforeAll(async () => {
		await startRunner();
	}, 60_000);

	it.each(CASES)('$name', async ({ code, items }) => {
		const input = items ?? TEXTS;
		const native = nativeCode(code, 'all', input);
		const runner = await runnerCode(code, 'all', input);
		expect(native).toEqual(runner);
		expect(runner.ok).toBe(true);
	});
});
