/**
 * Compares the values of run (a) and run (b) after a strict, joint
 * normalization. Both runs start from the same tenant snapshot, so seeded
 * ids and credentials are the same in both; only values that the runs make
 * can differ legitimately. The rules (and only these):
 *
 * 1. `time`: two different values that are both instants inside the time
 *    window of their own run (start minus 5 min to end plus 5 min), or that
 *    have the same offset from the start of their run within 5 s (an expiry
 *    such as "now + 1 hour"): ISO 8601 or RFC 2822 date strings, or numbers
 *    in epoch seconds or milliseconds. Also a string of digits with a dot
 *    (Slack `ts`) whose seconds part is such an instant, and ISO times inside
 *    a longer text at the same places.
 * 2. `id`: two different strings with the same id format (a UUID; hex text
 *    of 12 or more characters; 6 or more digits; or 8 or more letters and
 *    digits mixed, with the same length and the same short prefix), when
 *    neither value is in the workflow JSON or the seeded tenant snapshot
 *    (so the run made it), and when a one-to-one map between the values of
 *    (a) and (b) holds over the whole workflow (outputs and state share the
 *    map). A value of (a) that maps to two values of (b), or the other way
 *    round, is a difference.
 * 3. Rules 1 and 2 also apply to the tokens of a string (split at
 *    characters other than letters, digits, `_` and `-`), when the two
 *    strings have the same separators. So URLs and texts that hold a new id
 *    or time compare equal.
 * 4. Integer `id` numbers: two different positive integers under a key that
 *    ends in `id` or `Id` (or that is `id`) follow rule 2 with their decimal
 *    text.
 * 5. The hex value of a `signature` query parameter in a URL (resume URLs):
 *    each engine signs with its own secret.
 *
 * Nothing else is ignored: no key is dropped, and item order counts.
 */

export interface Window {
	start: number;
	end: number;
}

export interface NormalizeStats {
	time: number;
	id: number;
}

export interface Difference {
	path: string;
	a: unknown;
	b: unknown;
}

const SLACK = 5 * 60_000;

function inWindow(ms: number, w: Window): boolean {
	return ms >= w.start - SLACK && ms <= w.end + SLACK;
}

function instantOf(v: unknown): number | undefined {
	if (typeof v === 'number' && Number.isFinite(v)) {
		if (v > 1e12 && v < 1e14) return v;
		if (v > 1e9 && v < 1e11) return v * 1000;
		return undefined;
	}
	if (typeof v !== 'string') return undefined;
	if (/^\d{10}\.\d{1,9}$/.test(v)) return Number(v.split('.')[0]) * 1000;
	if (/^\d{13}$/.test(v)) return Number(v);
	if (/^\d{10}$/.test(v)) return Number(v) * 1000;
	if (!/\d{4}-\d{2}-\d{2}|\d{1,2} \w{3} \d{4}/.test(v)) return undefined;
	const ms = Date.parse(v);
	return Number.isNaN(ms) ? undefined : ms;
}

/**
 * The format of a value that a run can make: a UUID, hex text, digits, or
 * letters and digits mixed. Other text has no id format.
 */
function idFormat(s: string): string | undefined {
	if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return 'uuid';
	if (/^[0-9a-f]{12,}$/.test(s) && /[0-9]/.test(s) && /[a-f]/.test(s)) return `hex${s.length}`;
	if (/^\d{6,}$/.test(s)) return `digits${s.length}`;
	if (/^[A-Za-z0-9_-]{8,}$/.test(s) && /[0-9]/.test(s) && /[A-Za-z]/.test(s)) {
		// Same prefix up to the first digit (C0…, cus_…, rec…), same length.
		const prefix = /^[^0-9]*/.exec(s)?.[0] ?? '';
		return `alnum${s.length}:${prefix.length <= 4 ? prefix : ''}`;
	}
	return undefined;
}

export class Normalizer {
	private readonly aToB = new Map<string, string>();

	private readonly bToA = new Map<string, string>();

	readonly stats: NormalizeStats = { time: 0, id: 0 };

	private readonly wa: Window;

	private readonly wb: Window;

	/** Text that holds the values the runs start with (the workflow, the seeded snapshot). */
	private readonly known: string;

	constructor(wa: Window, wb: Window, known = '') {
		this.wa = wa;
		this.wb = wb;
		this.known = known;
	}

	/**
	 * Rule 1: inside the window of each run, or the same offset from the start
	 * of each run (an expiry such as "now + 1 hour"), within 5 seconds.
	 */
	private sameTime(ta: number, tb: number): boolean {
		if (inWindow(ta, this.wa) && inWindow(tb, this.wb)) return true;
		const shift = this.wb.start - this.wa.start;
		const runs = Math.max(this.wa.end - this.wa.start, this.wb.end - this.wb.start);
		return Math.abs(tb - ta - shift) <= Math.max(5000, runs);
	}

	/** Rule 2: both values are new (not in the workflow or the world) and have one id format. */
	private sameId(a: string, b: string): boolean {
		const f = idFormat(a);
		if (f === undefined || f !== idFormat(b)) return false;
		if (this.known.includes(a) || this.known.includes(b)) return false;
		return this.pairId(a, b);
	}

	private pairId(a: string, b: string): boolean {
		const mapped = this.aToB.get(a);
		const back = this.bToA.get(b);
		if (mapped === undefined && back === undefined) {
			this.aToB.set(a, b);
			this.bToA.set(b, a);
			return true;
		}
		return mapped === b && back === a;
	}

	/** True when two different scalars are equal under rules 1, 2 and 4. */
	private scalarsMatch(a: unknown, b: unknown, key: string): 'time' | 'id' | false {
		const ta = instantOf(a);
		const tb = instantOf(b);
		if (ta !== undefined && tb !== undefined && ta !== tb && this.sameTime(ta, tb)) return 'time';
		if (typeof a === 'string' && typeof b === 'string') {
			return this.sameId(a, b) ? 'id' : false;
		}
		if (
			typeof a === 'number' &&
			typeof b === 'number' &&
			Number.isInteger(a) &&
			Number.isInteger(b) &&
			a > 0 &&
			b > 0 &&
			/(^|_)id$|Id$/.test(key) &&
			!this.known.includes(String(a)) &&
			!this.known.includes(String(b)) &&
			this.pairId(`#${a}`, `#${b}`)
		) {
			return 'id';
		}
		return false;
	}

	/** Rule 3: the strings differ only in tokens that match under rules 1 and 2. */
	private tokensMatch(aRaw: string, bRaw: string): boolean {
		// Rule 5: resume URL signatures. Each engine signs with its own secret.
		const sig = /([?&]signature=)[0-9a-f]+/g;
		let sigs = 0;
		let aIn = aRaw;
		let bIn = bRaw;
		const hasSig = /[?&]signature=[0-9a-f]+/;
		if (hasSig.test(aRaw) && hasSig.test(bRaw)) {
			aIn = aRaw.replace(sig, '$1<signature>');
			bIn = bRaw.replace(sig, '$1<signature>');
			sigs = aIn === aRaw ? 0 : 1;
			if (aIn === bIn) {
				this.stats.id += sigs;
				return true;
			}
		}
		// ISO times inside a text first, when the two texts hold them at the same places.
		const iso = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?/g;
		const ta = aIn.match(iso) ?? [];
		const tb = bIn.match(iso) ?? [];
		let times = 0;
		let a = aIn;
		let b = bIn;
		if (ta.length > 0 && ta.length === tb.length) {
			const ok = ta.every((x, i) => x === tb[i] || this.sameTime(Date.parse(x), Date.parse(tb[i])));
			if (ok) {
				times = ta.filter((x, i) => x !== tb[i]).length;
				a = aIn.replace(iso, '<time>');
				b = bIn.replace(iso, '<time>');
				if (a === b) {
					this.stats.time += times;
					return times > 0;
				}
			}
		}
		const split = (s: string) => s.split(/([^A-Za-z0-9_-]+)/);
		const pa = split(a);
		const pb = split(b);
		if (pa.length !== pb.length) return false;
		const pending: Array<'time' | 'id'> = [];
		for (let i = 0; i < pa.length; i++) {
			if (pa[i] === pb[i]) continue;
			if (i % 2 === 1) return false;
			const m = this.scalarsMatch(pa[i], pb[i], '');
			if (!m) return false;
			pending.push(m);
		}
		for (const m of pending) this.stats[m]++;
		this.stats.time += times;
		this.stats.id += sigs;
		return pending.length > 0 || times > 0 || sigs > 0;
	}

	/** Lists the differences that remain after normalization. */
	diff(a: unknown, b: unknown, path = '$', key = '', out: Difference[] = []): Difference[] {
		if (Object.is(a, b)) return out;
		if (Array.isArray(a) && Array.isArray(b)) {
			if (a.length !== b.length) {
				out.push({ path: `${path}.length`, a: a.length, b: b.length });
			}
			const n = Math.min(a.length, b.length);
			for (let i = 0; i < n; i++) this.diff(a[i], b[i], `${path}[${i}]`, key, out);
			return out;
		}
		if (isObject(a) && isObject(b)) {
			const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
			for (const k of keys) {
				if (!(k in a) || !(k in b)) {
					out.push({ path: `${path}.${k}`, a: a[k], b: b[k] });
					continue;
				}
				this.diff(a[k], b[k], `${path}.${k}`, k, out);
			}
			return out;
		}
		const m = this.scalarsMatch(a, b, key);
		if (m) {
			this.stats[m]++;
			return out;
		}
		if (typeof a === 'string' && typeof b === 'string' && this.tokensMatch(a, b)) return out;
		out.push({ path, a, b });
		return out;
	}
}

function isObject(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Drops trailing empty outputs, so `[[a], []]` and `[[a]]` compare equal (as `compare.ts` does). */
export function trimOutputs(lists: unknown[][] | undefined): unknown[][] {
	const out = [...(lists ?? [])];
	while (out.length > 0 && (out[out.length - 1] ?? []).length === 0) out.pop();
	return out;
}

/** A short JSON text for the report. */
export function brief(v: unknown, max = 120): string {
	const text = v === undefined ? 'undefined' : JSON.stringify(v);
	return text.length > max ? `${text.slice(0, max)}…` : text;
}
