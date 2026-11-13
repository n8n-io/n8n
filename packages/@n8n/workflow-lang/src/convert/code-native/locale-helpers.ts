/**
 * Locale formatting helpers of native Code nodes, as subset source. They
 * format with the specs of `locale-data.generated.ts`, which
 * `scripts/locale-data.ts` derives from the ICU data of Node.js and checks
 * against it. A call with a locale and options outside the table stays in the
 * fallback host.
 *
 * A date spec is `{ p, m?, w?, ap?, hc?, dg? }`: `p` lists the parts, each
 * `[type, style]` (a literal has its text as the style); `m`, `w` and `ap`
 * are the names of the months, the weekdays (Sunday first) and the day
 * periods; `hc` is the hour cycle; `dg` the ten digits of the numbering
 * system.
 *
 * A number spec is `{ min, max, int, g, dec, grp, pre, suf, pct, dg, nan, inf }`:
 * fraction digits, minimum integer digits, grouping `[primary, secondary,
 * minimum]` or null, separators, the parts before and after the number for
 * `[positive, negative]` values, and the texts of NaN and Infinity.
 */

export interface LocaleHelperSource {
	uses: string[];
	source: string;
}

export const LOCALE_HELPERS: Record<string, LocaleHelperSource> = {
	localeDigits: {
		uses: [],
		source: `/** ASCII digits in the digits of a numbering system. */
function localeDigits(s: string, dg: Json): string {
	if (dg === undefined || dg === null) return s;
	let out = '';
	for (let k = 0; k < s.length; k++) {
		const c = s.charCodeAt(k);
		out += c >= 48 && c <= 57 ? dg[c - 48] : s.charAt(k);
	}
	return out;
}`,
	},
	dateParts: {
		uses: ['localeDigits'],
		source: `/** The parts of a date in a spec of \\\`locale-data.generated.ts\\\`, at \\\`offset\\\` minutes from UTC. */
function dateParts(spec: Json, t: number, offset: number): Json[] {
	const d = new Date(t + offset * 60000);
	const y = d.getUTCFullYear();
	const mo = d.getUTCMonth();
	const day = d.getUTCDate();
	const h = d.getUTCHours();
	const out: Json[] = [];
	const two = (n: number): string => (n < 10 ? '0' + n : String(n));
	for (const part of spec.p) {
		const type: string = part[0];
		const style: string = part[1];
		let v = '';
		if (type === 'literal') v = style;
		else if (type === 'year') v = style === '2' ? two(((y % 100) + 100) % 100) : String(y);
		else if (type === 'month') v = style === 't' ? spec.m[mo] : style === '2' ? two(mo + 1) : String(mo + 1);
		else if (type === 'day') v = style === '2' ? two(day) : String(day);
		else if (type === 'weekday') v = spec.w[d.getUTCDay()];
		else if (type === 'hour') {
			const cycle: string = spec.hc;
			const hv = cycle === 'h12' ? h % 12 || 12 : cycle === 'h11' ? h % 12 : cycle === 'h24' ? h || 24 : h;
			v = style === '2' ? two(hv) : String(hv);
		} else if (type === 'minute') {
			const m = d.getUTCMinutes();
			v = style === '2' ? two(m) : String(m);
		} else if (type === 'second') {
			const s = d.getUTCSeconds();
			v = style === '2' ? two(s) : String(s);
		} else if (type === 'fractionalSecond') {
			v = String(d.getUTCMilliseconds()).padStart(3, '0').slice(0, Number(style));
		} else if (type === 'dayPeriod') v = spec.ap[h < 12 ? 0 : 1];
		if (type !== 'literal' && type !== 'month' && type !== 'weekday' && type !== 'dayPeriod') {
			v = localeDigits(v, spec.dg);
		} else if (type === 'month' && style !== 't') v = localeDigits(v, spec.dg);
		out.push({ type, value: v });
	}
	return out;
}`,
	},
	decimalDigits: {
		uses: [],
		source: `/** The shortest decimal digits of a finite number >= 0: \\\`[integer digits, fraction digits]\\\`. */
function decimalDigits(x: number): string[] {
	const s = String(x);
	const e = s.indexOf('e');
	if (e < 0) {
		const dot = s.indexOf('.');
		return dot < 0 ? [s, ''] : [s.slice(0, dot), s.slice(dot + 1)];
	}
	const exp = Number(s.slice(e + 1));
	const mant = s.slice(0, e);
	const dot = mant.indexOf('.');
	const digits = dot < 0 ? mant : mant.slice(0, dot) + mant.slice(dot + 1);
	const point = (dot < 0 ? mant.length : dot) + exp;
	if (point <= 0) return ['0', '0'.repeat(-point) + digits];
	if (point >= digits.length) return [digits + '0'.repeat(point - digits.length), ''];
	return [digits.slice(0, point), digits.slice(point)];
}`,
	},
	numberParts: {
		uses: ['decimalDigits', 'localeDigits'],
		source: `/** The parts of a number in a spec of \\\`locale-data.generated.ts\\\`: ICU rounds the shortest decimal form, half up. */
function numberParts(spec: Json, value: Json): Json[] {
	const x = Number(value);
	const negative = x < 0 || (x === 0 && 1 / x < 0);
	const out: Json[] = [];
	const affix = (list: Json[]): void => {
		for (const p of list) out.push({ type: p[0], value: p[1] });
	};
	affix(spec.pre[negative ? 1 : 0]);
	if (isNaN(x)) out.push({ type: 'nan', value: spec.nan });
	else if (!Number.isFinite(x)) out.push({ type: 'infinity', value: spec.inf });
	else {
		const parts = decimalDigits(Math.abs(x));
		let int = parts[0];
		let frac = parts[1];
		if (spec.pct) {
			// A percent shifts the decimal digits, not the binary value.
			frac = frac.padEnd(2, '0');
			int = int + frac.slice(0, 2);
			frac = frac.slice(2);
		}
		if (frac.length > spec.max) {
			const up = frac.charCodeAt(spec.max) >= 53;
			let digits = int + frac.slice(0, spec.max);
			if (up) {
				let k = digits.length - 1;
				let carried = '';
				for (; k >= 0; k--) {
					const c = digits.charCodeAt(k);
					if (c < 57) {
						carried = digits.slice(0, k) + String(c - 47) + carried;
						break;
					}
					carried = '0' + carried;
				}
				digits = k < 0 ? '1' + carried : carried;
			}
			int = digits.slice(0, digits.length - spec.max);
			frac = digits.slice(digits.length - spec.max);
		}
		while (frac.length > spec.min && frac.charAt(frac.length - 1) === '0') frac = frac.slice(0, -1);
		frac = frac.padEnd(spec.min, '0');
		let k = 0;
		while (k < int.length - 1 && int.charAt(k) === '0') k++;
		int = int.slice(k).padStart(spec.int, '0');
		const groups: string[] = [];
		const g = spec.g;
		if (g !== null && int.length >= g[0] + g[2]) {
			let rest = int.slice(0, int.length - g[0]);
			groups.push(int.slice(int.length - g[0]));
			while (rest.length > g[1]) {
				groups.unshift(rest.slice(rest.length - g[1]));
				rest = rest.slice(0, rest.length - g[1]);
			}
			groups.unshift(rest);
		} else groups.push(int);
		for (let i = 0; i < groups.length; i++) {
			if (i > 0) out.push({ type: 'group', value: spec.grp });
			out.push({ type: 'integer', value: localeDigits(groups[i], spec.dg) });
		}
		if (frac.length > 0) {
			out.push({ type: 'decimal', value: spec.dec });
			out.push({ type: 'fraction', value: localeDigits(frac, spec.dg) });
		}
	}
	affix(spec.suf[negative ? 1 : 0]);
	return out;
}`,
	},
	partsText: {
		uses: [],
		source: `/** The text of a list of parts. */
function partsText(parts: Json[]): string {
	let out = '';
	for (const p of parts) out += p.value;
	return out;
}`,
	},
	zoneOffsetOf: {
		uses: [],
		source: `/** Minutes from UTC of a time zone at \\\`t\\\` (spec section 4.5). */
function zoneOffsetOf(zone: Json, t: number): number {
	return zone === null ? 0 : Date.zoneOffset(zone, t);
}`,
	},
	localeFormat: {
		uses: ['dateParts', 'numberParts', 'partsText', 'zoneOffsetOf'],
		source: `/**
 * \\\`x.toLocaleString(...)\\\`, \\\`toLocaleDateString\\\` and \\\`toLocaleTimeString\\\`:
 * a Date with \\\`date\\\`, a number with \\\`num\\\` (null when the method has none).
 */
function localeFormat(x: Json, date: Json, num: Json, zone: Json, isDate: boolean): Json {
	if (isDate) {
		const t = typeof x === 'number' ? x : new Date(x).getTime();
		if (isNaN(t)) return 'Invalid Date';
		return partsText(dateParts(date, t, zoneOffsetOf(zone, t)));
	}
	if (typeof x === 'number' && num !== null) return partsText(numberParts(num, x));
	if (x === undefined || x === null) {
		throw new TypeError('Cannot read properties of ' + x + " (reading 'toLocaleString')");
	}
	if (typeof x === 'string' || typeof x === 'boolean') return String(x);
	throw new TypeError('toLocaleString has no native form for this value');
}`,
	},
	intlOf: {
		uses: [],
		source: `/** \\\`new Intl.DateTimeFormat(...)\\\` and \\\`new Intl.NumberFormat(...)\\\` as plain objects. */
function intlOf(kind: string, spec: Json, zone: Json): Json {
	return { $intl: kind, spec, zone };
}`,
	},
	intlFormat: {
		uses: ['dateParts', 'numberParts', 'partsText', 'zoneOffsetOf'],
		source: `/** \\\`f.format(x)\\\` and \\\`f.formatToParts(x)\\\` of an \\\`intlOf\\\` value. */
function intlFormat(f: Json, x: Json, parts: boolean): Json {
	if (f === null || typeof f !== 'object' || f.$intl === undefined) {
		// Another value with a format function of its own.
		const fn = f === null || f === undefined ? undefined : f[parts ? 'formatToParts' : 'format'];
		if (typeof fn !== 'function') {
			throw new TypeError('value.' + (parts ? 'formatToParts' : 'format') + ' is not a function');
		}
		return fn(x);
	}
	let list: Json[] = [];
	if (f.$intl === 'number') list = numberParts(f.spec, x);
	else {
		const t = x === undefined ? Date.now() : new Date(x).getTime();
		if (isNaN(t)) throw new RangeError('Invalid time value');
		list = dateParts(f.spec, t, zoneOffsetOf(f.zone, t));
	}
	return parts ? list : partsText(list);
}`,
	},
};
