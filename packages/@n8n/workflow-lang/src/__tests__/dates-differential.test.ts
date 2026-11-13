/**
 * Randomized differential test of the Date subset (spec section 4.5). One
 * workflow formats, parses and changes thousands of random dates. The
 * reference runner (Node.js Date in UTC) and the Zig runtime (`wfrt run`)
 * must give the same JSON. The Zig part runs when the runtime binary exists.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { compile } from '../compiler/index.ts';
import type { Fixture } from '../reference/runner.ts';
import { runReference, splitmix64 } from '../reference/runner.ts';
import { PACKAGE_ROOT } from './helpers.ts';

const WFRT = join(PACKAGE_ROOT, '..', '..', '..', 'workflow-runtime', 'zig-out', 'bin', 'wfrt');

const SOURCE = `import { webhook, workflow } from '@n8n/workflow-lang';

interface Input {
	times: number[];
	texts: string[];
	parts: number[][];
	sets: number[][];
}

export default workflow({
	triggers: [webhook<Input>({ path: 'dates' })],
	async run(ctx, trigger) {
		const iso = (d: Date): string => {
			try {
				return d.toISOString();
			} catch (e) {
				return e.name;
			}
		};
		const times = trigger.body.times.map((ms) => {
			const d = new Date(ms);
			return [
				d.getTime(), iso(d), d.toString(), d.toUTCString(), d.toDateString(), d.toTimeString(),
				d.toLocaleString(), d.toLocaleDateString(), d.toLocaleTimeString(),
				d.getFullYear(), d.getMonth(), d.getDate(), d.getDay(), d.getHours(),
				d.getMinutes(), d.getSeconds(), d.getMilliseconds(), d.getTimezoneOffset(),
			];
		});
		const texts = trigger.body.texts.map((s) => [Date.parse(s), new Date(s).getTime()]);
		const parts = trigger.body.parts.map((p) => {
			const local = p.length === 2 ? new Date(p[0], p[1]) : new Date(p[0], p[1], p[2], p[3], p[4], p[5], p[6]);
			return [local.getTime(), Date.UTC(p[0], p[1], p[2], p[3], p[4], p[5], p[6])];
		});
		const sets = trigger.body.sets.map((a) => {
			const d = new Date(a[0]);
			const op = a[1];
			const r =
				op === 0 ? d.setFullYear(a[2], a[3], a[4])
				: op === 1 ? d.setMonth(a[2], a[3])
				: op === 2 ? d.setDate(a[2])
				: op === 3 ? d.setHours(a[2], a[3], a[4], a[5])
				: op === 4 ? d.setMinutes(a[2], a[3], a[4])
				: op === 5 ? d.setSeconds(a[2], a[3])
				: op === 6 ? d.setMilliseconds(a[2])
				: op === 7 ? d.setUTCFullYear(a[2])
				: op === 8 ? d.setUTCHours(a[2])
				: d.setTime(a[2]);
			return [r, d.getTime()];
		});
		return { times, texts, parts, sets };
	},
});
`;

const MONTHS = [
	'Jan',
	'feb',
	'MARCH',
	'Apr',
	'may',
	'June',
	'Jul',
	'aug',
	'Sept',
	'oct',
	'Nov',
	'December',
];
const WORDS = [
	'T',
	'Z',
	'GMT',
	'UTC',
	'UT',
	'PST',
	'edt',
	'am',
	'PM',
	'Mon',
	'Tuesday',
	'x',
	'(CET)',
	'é',
];
const SYMBOLS = ['-', ':', '.', '+', ' ', '/', ',', ')', '(', '  ', '\t', '\n'];

/** A seeded generator of random inputs. */
function generator(seed: number) {
	const rnd = splitmix64(seed);
	const int = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
	const pick = <T>(xs: readonly T[]): T => xs[int(0, xs.length - 1)];
	const pad = (n: number, w: number) => String(Math.abs(n)).padStart(w, '0');
	const time = (): number => {
		const r = rnd();
		if (r < 0.5) return int(-2208988800000, 4102444800000); // 1900..2100
		if (r < 0.8) return Math.round((rnd() * 2 - 1) * 8.64e15);
		if (r < 0.9) return pick([8.64e15, -8.64e15, 0, -1]) + int(-2, 2);
		return (rnd() * 2 - 1) * 1e16;
	};
	const isoText = (): string => {
		const t = int(-62198755200000, 253402300799999);
		const d = new Date(t);
		let s =
			rnd() < 0.2
				? `${rnd() < 0.5 ? '+' : '-'}${pad(d.getUTCFullYear(), 6)}`
				: pad(d.getUTCFullYear(), 4);
		s += `-${pad(d.getUTCMonth() + 1, 2)}`;
		if (rnd() < 0.9) s += `-${pad(d.getUTCDate() + int(-1, 2), 2)}`;
		if (rnd() < 0.7) {
			s += `${pick(['T', 't', ' '])}${pad(d.getUTCHours() + int(0, 1), 2)}:${pad(d.getUTCMinutes(), 2)}`;
			if (rnd() < 0.7) s += `:${pad(d.getUTCSeconds(), 2)}`;
			if (rnd() < 0.5) s += `.${String(int(0, 9999999)).slice(0, int(1, 7))}`;
			const z = rnd();
			if (z < 0.3) s += 'Z';
			else if (z < 0.5) s += `${pick(['+', '-'])}${pad(int(0, 25), 2)}:${pad(int(0, 61), 2)}`;
			else if (z < 0.6) s += `${pick(['+', '-'])}${pad(int(0, 2500), 4)}`;
		}
		return s;
	};
	const legacyText = (): string => {
		const n = int(1, 9);
		let s = '';
		for (let i = 0; i < n; i++) {
			const k = rnd();
			if (k < 0.35) s += String(int(0, rnd() < 0.5 ? 31 : 99999));
			else if (k < 0.5) s += pick(MONTHS);
			else if (k < 0.65) s += pick(WORDS);
			else s += pick(SYMBOLS);
		}
		return s;
	};
	const text = (): string => {
		const r = rnd();
		const d = new Date(time());
		if (r < 0.3) return isoText();
		if (r < 0.4 && !Number.isNaN(d.getTime())) return d.toString();
		if (r < 0.5 && !Number.isNaN(d.getTime())) return d.toUTCString();
		if (r < 0.55 && !Number.isNaN(d.getTime())) return d.toISOString();
		return legacyText();
	};
	const small = () => (rnd() < 0.8 ? int(-40, 140) : int(-300000, 300000));
	const parts = (): number[] =>
		rnd() < 0.1
			? [int(-300000, 300000), small()]
			: [
					rnd() < 0.3 ? int(0, 120) : int(-300000, 300000),
					small(),
					small(),
					small(),
					small(),
					small(),
					small(),
				];
	const set = (): number[] => [
		rnd() < 0.05 ? Number.NaN : int(-2208988800000, 4102444800000),
		int(0, 9),
		...Array.from({ length: 5 }, small),
	];
	return { time, text, parts, set };
}

function fixtureFor(seed: number, n: number): Fixture {
	const g = generator(seed);
	const list = <T>(f: () => T) => Array.from({ length: n }, f);
	return {
		trigger: {
			body: { times: list(g.time), texts: list(g.text), parts: list(g.parts), sets: list(g.set) },
			headers: {},
			query: {},
		},
		now: 0,
		seed: 1,
		effects: {},
	};
}

describe('Date differential', () => {
	const result = compile(SOURCE, { fileName: 'workflow.ts' });

	it('compiles', () => {
		expect(result.diagnostics).toEqual([]);
	});

	it.runIf(existsSync(WFRT)).each([1, 2, 3, 4, 5, 6])(
		'the Zig runtime matches Node.js on random dates (seed %i)',
		async (seed) => {
			const fixture = fixtureFor(seed, 600);
			const dir = mkdtempSync(join(tmpdir(), 'wfl-dates-'));
			try {
				writeFileSync(join(dir, 'm.wfm'), result.module ?? new Uint8Array());
				writeFileSync(join(dir, 'f.json'), JSON.stringify(fixture));
				const out = execFileSync(WFRT, ['run', join(dir, 'm.wfm'), join(dir, 'f.json')], {
					encoding: 'utf8',
					maxBuffer: 1 << 28,
				});
				const expected = await runReference(SOURCE, fixture);
				expect(expected.status).toBe('ok');
				expect(JSON.parse(out)).toEqual(expected);
			} finally {
				rmSync(dir, { recursive: true, force: true });
			}
		},
		60_000,
	);
});
