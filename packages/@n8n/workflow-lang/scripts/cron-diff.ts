/**
 * Differential test of schedule slots: the Zig `nextSlot` (through
 * `wfrt cron-next`) against the `cron` npm package that n8n uses.
 *
 * Usage: node scripts/cron-diff.ts [--cases 400] [--seed 1] [--wfrt path]
 *
 * It makes random cron expressions and time zones, asks both sides for the
 * next 50 slots, and compares them. A difference inside three hours of a
 * DST change is reported as a DST difference; any other difference fails.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

interface LuxonDateTime {
	toMillis(): number;
	offset: number;
	plus(d: { hours: number }): LuxonDateTime;
	minus(d: { hours: number }): LuxonDateTime;
}
interface Luxon {
	DateTime: {
		fromMillis(ms: number, o: { zone: string }): LuxonDateTime;
		fromObject(o: Record<string, number>, z: { zone: string }): LuxonDateTime;
	};
	Settings: { now: () => number };
}
interface CronTimeClass {
	new (source: string, timeZone: string): { getNextDateFrom(d: LuxonDateTime): LuxonDateTime };
}

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..', '..');
// `cron` is a dependency of n8n-core, not of this package.
const coreRequire = createRequire(join(repo, 'packages', 'core', 'package.json'));
const cronPath = coreRequire.resolve('cron');
// The two packages are CommonJS without types here; the interfaces above
// name the few members this script uses.
const { CronTime } = coreRequire(cronPath) as { CronTime: CronTimeClass };
const luxon = createRequire(cronPath)('luxon') as Luxon;

const args = process.argv.slice(2);
const arg = (name: string, def: string) => {
	const i = args.indexOf(name);
	return i >= 0 ? args[i + 1] : def;
};
const ncases = Number(arg('--cases', '400'));
let seed = Number(arg('--seed', '1'));
const wfrt = arg('--wfrt', join(repo, 'workflow-runtime', 'zig-out', 'bin', 'wfrt'));
const SLOTS = 50;

function rand(): number {
	// mulberry32: a small seeded PRNG, so a run can be repeated.
	seed = (seed + 0x6d2b79f5) | 0;
	let t = seed;
	t = Math.imul(t ^ (t >>> 15), t | 1);
	t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
const pick = <T>(xs: T[]): T => xs[Math.floor(rand() * xs.length)];

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function field(lo: number, hi: number, names?: string[]): string {
	const value = (v: number) => (names && rand() < 0.3 ? names[v - (lo === 0 ? 0 : 1)] : String(v));
	const r = rand();
	if (r < 0.3) return '*';
	if (r < 0.45) return `*/${int(1, Math.max(1, Math.floor((hi - lo) / 2)))}`;
	if (r < 0.6) {
		const a = int(lo, hi);
		return `${value(a)}-${value(int(a, hi))}`;
	}
	if (r < 0.7) {
		const a = int(lo, hi);
		return `${a}-${int(a, hi)}/${int(1, 5)}`;
	}
	if (r < 0.75) return `${int(lo, hi)}/${int(1, 10)}`;
	const n = int(1, 3);
	const vals = new Set<number>();
	for (let i = 0; i < n; i++) vals.add(int(lo, hi));
	return [...vals].map(value).join(',');
}

function randomCron(): string {
	const sec = rand() < 0.5;
	const parts = [
		field(0, 59),
		field(0, 23),
		rand() < 0.7 ? '*' : field(1, 28),
		rand() < 0.7 ? '*' : field(1, 12, MONTHS),
		rand() < 0.7 ? '*' : field(0, 6, DAYS),
	];
	// Hour-level schedules hit DST changes more often.
	if (rand() < 0.3) parts[1] = pick(['1', '2', '1,2', '0-3', '*/2', '2-3', '*']);
	return (sec ? [pick(['0', '30', '*/20', '*/7', '15,45']), ...parts] : parts).join(' ');
}

const ZONES = [
	'UTC',
	'America/New_York',
	'Europe/Berlin',
	'Australia/Sydney',
	'America/Los_Angeles',
	'Europe/London',
	'Europe/Dublin',
	'America/Sao_Paulo',
	'Asia/Kolkata',
	'Asia/Tokyo',
	'Pacific/Auckland',
	'America/St_Johns',
	'Asia/Kathmandu',
	'Australia/Lord_Howe',
	'America/Santiago',
];

interface Case {
	expr: string;
	tz: string;
	after: number;
	n: number;
}

function startMs(tz: string): number {
	const year = int(2026, 2029);
	// Half of the starts fall in the weeks around common DST changes.
	const month = rand() < 0.5 ? pick([3, 4, 9, 10, 11]) : int(1, 12);
	return luxon.DateTime.fromObject(
		{ year, month, day: int(1, 28), hour: int(0, 23), minute: int(0, 59), second: int(0, 59) },
		{ zone: tz },
	).toMillis();
}

/** The package resolves ambiguous local times with the zone offset of
 * "now" (luxon). Standard time gives its intended result, so pin "now" to
 * a standard-time date of the same year. */
function pinNow(tz: string, after: number) {
	const year = new Date(after).getUTCFullYear();
	const jan = luxon.DateTime.fromObject({ year, month: 1, day: 15 }, { zone: tz });
	const jul = luxon.DateTime.fromObject({ year, month: 7, day: 15 }, { zone: tz });
	const std = jan.offset <= jul.offset ? jan : jul;
	luxon.Settings.now = () => std.toMillis();
}

function npmSlots(c: Case): number[] | null {
	pinNow(c.tz, c.after);
	let ct: InstanceType<CronTimeClass>;
	try {
		ct = new CronTime(c.expr, c.tz);
	} catch {
		return null;
	}
	const out: number[] = [];
	let d = luxon.DateTime.fromMillis(c.after, { zone: c.tz });
	for (let i = 0; i < c.n; i++) {
		try {
			d = ct.getNextDateFrom(d);
		} catch {
			break;
		}
		out.push(d.toMillis());
	}
	return out;
}

function nearDst(tz: string, ms: number): boolean {
	const t = luxon.DateTime.fromMillis(ms, { zone: tz });
	const o = t.offset;
	return t.minus({ hours: 3 }).offset !== o || t.plus({ hours: 3 }).offset !== o;
}

const cases: Case[] = [];
for (let i = 0; i < ncases; i++) {
	const tz = pick(ZONES);
	cases.push({ expr: randomCron(), tz, after: startMs(tz), n: SLOTS });
}
const file = join(tmpdir(), `cron-diff-${process.pid}.json`);
writeFileSync(file, JSON.stringify(cases));
const zig: Array<number[] | null> = JSON.parse(
	execFileSync(wfrt, ['cron-next', file], { encoding: 'utf8', maxBuffer: 1 << 28 }),
);

let same = 0;
let dst = 0;
let failed = 0;
let slots = 0;
let horizon = 0;
const dstExamples: string[] = [];
for (const [i, c] of cases.entries()) {
	const want = npmSlots(c);
	const got = zig[i];
	if (want === null || got === null) {
		if (want === null && got === null) same++;
		else {
			failed++;
			console.log(
				`PARSE ${c.expr} npm=${want === null ? 'error' : 'ok'} zig=${got === null ? 'error' : 'ok'}`,
			);
		}
		continue;
	}
	slots += want.length;
	const k = want.findIndex((w, j) => got[j] !== w);
	if (k < 0 && want.length === got.length) {
		same++;
		continue;
	}
	const at = k < 0 ? Math.min(want.length, got.length) : k;
	// The package searches eight years from "now"; Zig searches eight years
	// from each start. A list that ends early there is not a difference.
	if (want[at] === undefined && got[at] > luxon.Settings.now() + 7.5 * 365 * 86_400_000) {
		horizon++;
		same++;
		continue;
	}
	const near = [want[at], got[at]].some((ms) => ms !== undefined && nearDst(c.tz, ms));
	const line = `${c.expr} | ${c.tz} | after ${new Date(c.after).toISOString()} | slot ${at}: npm ${want[at] === undefined ? '-' : new Date(want[at]).toISOString()} zig ${got[at] === undefined ? '-' : new Date(got[at]).toISOString()}`;
	if (near) {
		dst++;
		if (dstExamples.length < 10) dstExamples.push(line);
	} else {
		failed++;
		console.log(`DIFF ${line}`);
	}
}
console.log(
	`cron-diff: ${cases.length} cases, ${slots} slots; ${same} identical, ${dst} differ only at a DST change, ${failed} differ elsewhere (${horizon} identical up to the npm search horizon)`,
);
for (const l of dstExamples) console.log(`  DST ${l}`);
process.exit(failed > 0 ? 1 : 0);
