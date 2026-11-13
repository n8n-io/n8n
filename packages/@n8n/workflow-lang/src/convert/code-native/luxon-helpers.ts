/**
 * A subset of Luxon's DateTime and Duration (version 3) for native Code nodes
 * and parameter expressions, as subset source. A DateTime is a plain object
 * `{ $lux, ts, zone, invalid }`: `ts` is the time value, `zone` is `system`
 * (UTC, as the runtime runs in UTC), `UTC`, `fixed:<minutes>` or an IANA name
 * of META `zones`, and `invalid` is the reason of an invalid DateTime or
 * null. A Duration is `{ $dur, values, invalid }`. The argument `dz` is the
 * default zone (the workflow time zone): `local` and an absent zone resolve
 * to it. The locale is always en-US.
 *
 * The functions follow the Luxon source (`datetime.js`, `impl/conversions.js`,
 * `impl/formatter.js`, `impl/regexParser.js`) for the forms that workflows
 * use most: `$now`, `$today`, `DateTime.now/fromISO/fromMillis/fromSeconds/
 * fromJSDate/fromObject/utc`, `toFormat` with common tokens, `toISO`,
 * `toISODate`, `toISOTime`, `toMillis`, `toSeconds`, `setZone`, `toUTC`,
 * `startOf`, `endOf`, `plus`, `minus`, `set`, `diff`, the getters, and the
 * Duration methods `as`, `toMillis` and `toObject`. The translator
 * keeps other forms in the fallback host.
 */

export interface LuxonHelperSource {
	uses: string[];
	source: string;
}

const MONTHS = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
];
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const LUXON_HELPERS: Record<string, LuxonHelperSource> = {
	luxOf: {
		uses: [],
		source: `/** A DateTime at time value \\\`ts\\\` in \\\`zone\\\`; an invalid one when \\\`ts\\\` is NaN. */
function luxOf(ts: number, zone: string, invalid?: Json): Json {
	const reason = invalid !== undefined && invalid !== null ? invalid : isNaN(ts) ? 'invalid input' : null;
	return { $lux: true, ts: reason === null ? ts : NaN, zone, invalid: reason };
}`,
	},
	luxZoneOffset: {
		uses: [],
		source: `/** Minutes from UTC of a DateTime zone at \\\`ts\\\`. */
function luxZoneOffset(zone: string, ts: number): number {
	if (zone === 'system' || zone === 'UTC') return 0;
	if (zone.startsWith('fixed:')) return Number(zone.slice(6));
	return Date.zoneOffset(zone, ts);
}`,
	},
	luxZoneOf: {
		uses: [],
		source: `/** The zone of \\\`setZone\\\` and of the \\\`zone\\\` option, or null for a zone that Luxon does not know. */
function luxZoneOf(name: Json, dz: string): Json {
	if (name === undefined || name === null) return dz;
	const s = String(name);
	const lower = s.toLowerCase();
	if (lower === 'local' || lower === 'system' || lower === 'default') return dz;
	if (lower === 'utc' || lower === 'gmt' || lower === 'z') return 'UTC';
	if (lower.startsWith('utc') && s.length > 3) {
		const sign = s.charAt(3) === '-' ? -1 : 1;
		const rest = s.slice(4).split(':');
		const h = Number(rest[0]);
		const m = rest.length > 1 ? Number(rest[1]) : 0;
		if (isNaN(h) || isNaN(m)) return null;
		const off = sign * (h * 60 + m);
		return off === 0 ? 'UTC' : 'fixed:' + off;
	}
	return s;
}`,
	},
	luxFields: {
		uses: ['luxZoneOffset'],
		source: `/** The local fields of a DateTime in its zone; weekday 1 is Monday. */
function luxFields(dt: Json): Json {
	const offset = luxZoneOffset(dt.zone, dt.ts);
	const d = new Date(dt.ts + offset * 60000);
	const wd = d.getUTCDay();
	return {
		year: d.getUTCFullYear(),
		month: d.getUTCMonth() + 1,
		day: d.getUTCDate(),
		hour: d.getUTCHours(),
		minute: d.getUTCMinutes(),
		second: d.getUTCSeconds(),
		millisecond: d.getUTCMilliseconds(),
		weekday: wd === 0 ? 7 : wd,
		offset,
	};
}`,
	},
	luxLocalTs: {
		uses: [],
		source: `/** The time value of local fields as if they were UTC (Luxon objToLocalTS). */
function luxLocalTs(c: Json): number {
	const d = new Date(Date.UTC(2000, c.month - 1, c.day, c.hour, c.minute, c.second, c.millisecond));
	d.setUTCFullYear(c.year, c.month - 1, c.day);
	return d.getTime();
}`,
	},
	luxFix: {
		uses: ['luxZoneOffset'],
		source: `/** Luxon fixOffset: the time value of a local time value in a zone, from a guess of the offset. */
function luxFix(localTs: number, guess: number, zone: string): number {
	let utc = localTs - guess * 60000;
	const o2 = luxZoneOffset(zone, utc);
	if (guess === o2) return utc;
	utc -= (o2 - guess) * 60000;
	const o3 = luxZoneOffset(zone, utc);
	if (o2 === o3) return utc;
	return localTs - Math.min(o2, o3) * 60000;
}`,
	},
	luxDaysInMonth: {
		uses: [],
		source: `/** Days of a month (1 to 12) of a year. */
function luxDaysInMonth(year: number, month: number): number {
	const m = (((month - 1) % 12) + 12) % 12;
	const y = year + Math.floor((month - 1) / 12);
	if (m === 1) return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28;
	return m === 3 || m === 5 || m === 8 || m === 10 ? 30 : 31;
}`,
	},
	luxFromLocal: {
		uses: ['luxLocalTs', 'luxFix', 'luxZoneOffset', 'luxOf', 'luxDaysInMonth'],
		source: `/** A DateTime from local fields in \\\`zone\\\`, as DateTime.fromObject; checks the fields. */
function luxFromLocal(c: Json, zone: string, guessAt: number): Json {
	const bad =
		!Number.isInteger(c.year) ||
		!(c.month >= 1 && c.month <= 12) ||
		!(c.day >= 1 && c.day <= luxDaysInMonth(c.year, c.month)) ||
		!(c.hour >= 0 && c.hour <= 23) ||
		!(c.minute >= 0 && c.minute <= 59) ||
		!(c.second >= 0 && c.second <= 59) ||
		!(c.millisecond >= 0 && c.millisecond <= 999);
	if (bad) return luxOf(NaN, zone, 'unit out of range');
	const local = luxLocalTs(c);
	return luxOf(luxFix(local, luxZoneOffset(zone, guessAt), zone), zone);
}`,
	},
	luxDigits: {
		uses: [],
		source: `/** The digits of an ISO number at \\\`k\\\` of length \\\`n\\\`, or -1. */
function luxDigits(s: string, k: number, n: number): number {
	if (k + n > s.length) return -1;
	let v = 0;
	for (let j = 0; j < n; j++) {
		const c = s.charCodeAt(k + j);
		if (c < 48 || c > 57) return -1;
		v = v * 10 + (c - 48);
	}
	return v;
}`,
	},
	luxFromISO: {
		uses: [
			'luxDigits',
			'luxOf',
			'luxFromLocal',
			'luxZoneOf',
			'luxFields',
			'luxLocalTs',
			'luxDaysInMonth',
		],
		source: `/**
 * DateTime.fromISO(text, { zone?, setZone? }): calendar dates (extended and basic),
 * week dates, ordinal dates, times with fractions and offsets, and times alone.
 */
function luxFromISO(text: Json, opts: Json, now: number, dz: string): Json {
	const o = opts === undefined || opts === null ? {} : opts;
	const zone = luxZoneOf(o.zone, dz);
	if (zone === null) return luxOf(NaN, 'system', 'unsupported zone');
	const s = String(text);
	const invalid = () => luxOf(NaN, zone, 'unparsable');
	let k = 0;
	let year = 0;
	let month = 1;
	let day = 1;
	let hasDate = true;
	// The date part: YYYY, YYYY-MM, YYYY-MM-DD, YYYYMMDD, week and ordinal dates.
	const y = luxDigits(s, 0, 4);
	if (y < 0 || (s.length > 4 && s.charAt(4) === ':')) hasDate = false;
	else {
		year = y;
		k = 4;
		let run = 0;
		while (luxDigits(s, 4 + run, 1) >= 0) run++;
		const week = (at: number, ext: boolean): boolean => {
			const w = luxDigits(s, at, 2);
			if (w < 1 || w > 53) return false;
			let j = at + 2;
			if (ext && s.charAt(j) === '-') j++;
			let wd = 1;
			if (luxDigits(s, j, 1) >= 0) {
				wd = luxDigits(s, j, 1);
				j++;
			}
			if (wd < 1 || wd > 7) return false;
			// The Monday of ISO week 1 is in the week of 4 January.
			const jan4 = new Date(Date.UTC(year, 0, 4)).getUTCDay();
			const d = new Date(Date.UTC(year, 0, 4 - (jan4 === 0 ? 7 : jan4) + 1 + (w - 1) * 7 + (wd - 1)));
			year = d.getUTCFullYear();
			month = d.getUTCMonth() + 1;
			day = d.getUTCDate();
			k = j;
			return true;
		};
		const ordinal = (at: number): boolean => {
			const ord = luxDigits(s, at, 3);
			const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
			if (ord < 1 || ord > (leap ? 366 : 365)) return false;
			const d = new Date(Date.UTC(year, 0, ord));
			month = d.getUTCMonth() + 1;
			day = d.getUTCDate();
			k = at + 3;
			return true;
		};
		if (s.charAt(4) === '-') {
			let run2 = 0;
			while (luxDigits(s, 5 + run2, 1) >= 0) run2++;
			if (s.charAt(5) === 'W') {
				if (!week(6, true)) return invalid();
			} else if (run2 === 3) {
				if (!ordinal(5)) return invalid();
			} else if (run2 === 2) {
				month = luxDigits(s, 5, 2);
				k = 7;
				if (s.charAt(7) === '-') {
					day = luxDigits(s, 8, 2);
					if (day < 0 || luxDigits(s, 10, 1) >= 0) return invalid();
					k = 10;
				}
			} else return invalid();
		} else if (s.charAt(4) === 'W') {
			if (!week(5, false)) return invalid();
		} else if (run === 4) {
			month = luxDigits(s, 4, 2);
			day = luxDigits(s, 6, 2);
			k = 8;
		} else if (run === 3) {
			if (!ordinal(4)) return invalid();
		} else if (run !== 0) return invalid();
	}
	if (hasDate && k < s.length && s.charAt(k) !== 'T') return invalid();
	if (hasDate && s.charAt(k) === 'T') k++;
	// The time part.
	let hour = 0;
	let minute = 0;
	let second = 0;
	let ms = 0;
	let offset: Json = null;
	if (k < s.length) {
		const hh = luxDigits(s, k, 2);
		if (hh < 0) return invalid();
		hour = hh;
		k += 2;
		const ext = s.charAt(k) === ':';
		if (ext || luxDigits(s, k, 2) >= 0) {
			if (ext) k++;
			const mm = luxDigits(s, k, 2);
			if (mm < 0) return invalid();
			minute = mm;
			k += 2;
			if ((ext && s.charAt(k) === ':') || (!ext && luxDigits(s, k, 2) >= 0)) {
				if (ext) k++;
				const ss = luxDigits(s, k, 2);
				if (ss < 0) return invalid();
				second = ss;
				k += 2;
				if (s.charAt(k) === '.' || s.charAt(k) === ',') {
					k++;
					let frac = '';
					while (k < s.length && luxDigits(s, k, 1) >= 0 && frac.length < 30) {
						frac += s.charAt(k);
						k++;
					}
					if (frac === '') return invalid();
					ms = Math.floor(parseFloat('0.' + frac) * 1000);
				}
			}
		}
		if (k < s.length) {
			const c = s.charAt(k);
			if (c === 'Z') {
				offset = 0;
				k++;
			} else if (c === '+' || c === '-') {
				const sign = c === '-' ? -1 : 1;
				const oh = luxDigits(s, k + 1, 2);
				if (oh < 0) return invalid();
				k += 3;
				let om = 0;
				if (s.charAt(k) === ':') k++;
				if (luxDigits(s, k, 2) >= 0) {
					om = luxDigits(s, k, 2);
					k += 2;
				}
				offset = sign * (oh * 60 + om);
			}
		}
		if (k !== s.length) return invalid();
	}
	if (!hasDate && s.length === 0) return invalid();
	if (!hasDate) {
		// A time alone is on the current day in the zone.
		const today = luxFields(luxOf(now, zone));
		year = today.year;
		month = today.month;
		day = today.day;
	}
	let next = 0;
	if (hour === 24 && minute === 0 && second === 0 && ms === 0) {
		hour = 0;
		next = 86400000;
	}
	const c = { year, month, day, hour, minute, second, millisecond: ms };
	if (offset === null) {
		const dt = luxFromLocal(c, zone, now);
		return next === 0 || dt.invalid !== null ? dt : luxOf(dt.ts + next, zone);
	}
	const probe = luxFromLocal(c, 'UTC', 0);
	if (probe.invalid !== null) return luxOf(NaN, zone, probe.invalid);
	const ts = luxLocalTs(c) + next - offset * 60000;
	const resultZone = o.setZone ? (offset === 0 ? 'UTC' : 'fixed:' + offset) : zone;
	return luxOf(ts, resultZone);
}`,
	},
	luxOffsetText: {
		uses: [],
		source: `/** An offset in minutes as \\\`+HH:MM\\\` (or \\\`+HHMM\\\` and \\\`+H\\\`, as Luxon's Z, ZZ and ZZZ). */
function luxOffsetText(o: number, style: string): string {
	const sign = o < 0 ? '-' : '+';
	const a = Math.abs(o);
	const h = Math.trunc(a / 60);
	const m = a % 60;
	const hh = h < 10 ? '0' + h : String(h);
	const mm = m < 10 ? '0' + m : String(m);
	if (style === 'narrow') return sign + h + (m > 0 ? ':' + mm : '');
	if (style === 'techie') return sign + hh + mm;
	return sign + hh + ':' + mm;
}`,
	},
	luxISO: {
		uses: ['luxFields', 'luxOffsetText'],
		source: `/** \\\`toISO()\\\`, \\\`toISODate()\\\` and \\\`toISOTime()\\\`: null for an invalid DateTime. */
function luxISO(dt: Json, part: string): Json {
	if (dt.invalid !== null) return null;
	const c = luxFields(dt);
	const pad = (n: number, w: number): string => String(n).padStart(w, '0');
	const year = c.year > 9999 ? '+' + pad(c.year, 6) : c.year < 0 ? '-' + pad(-c.year, 6) : pad(c.year, 4);
	const date = year + '-' + pad(c.month, 2) + '-' + pad(c.day, 2);
	const fixed = dt.zone === 'UTC' || dt.zone.startsWith('fixed:');
	const off = fixed && c.offset === 0 ? 'Z' : luxOffsetText(c.offset, 'short');
	const time = pad(c.hour, 2) + ':' + pad(c.minute, 2) + ':' + pad(c.second, 2) + '.' + pad(c.millisecond, 3) + off;
	if (part === 'date') return date;
	if (part === 'time') return time;
	return date + 'T' + time;
}`,
	},
	luxFormat: {
		uses: ['luxFields', 'luxOffsetText', 'luxDaysInMonth'],
		source: `/** \\\`toFormat(fmt)\\\` for the tokens of \\\`LUXON_TOKENS\\\` in en-US. */
function luxFormat(dt: Json, fmt: Json): string {
	if (dt.invalid !== null) return 'Invalid DateTime';
	const c = luxFields(dt);
	const months = ${JSON.stringify(MONTHS)};
	const days = ${JSON.stringify(WEEKDAYS)};
	const f = String(fmt);
	const pad = (n: number, w: number): string => (n < 0 ? '-' + String(-n).padStart(w, '0') : String(n).padStart(w, '0'));
	let out = '';
	let k = 0;
	while (k < f.length) {
		const ch = f.charAt(k);
		if (ch === "'") {
			// A quoted literal; '' is a quote.
			let j = k + 1;
			let lit = '';
			while (j < f.length && f.charAt(j) !== "'") {
				lit += f.charAt(j);
				j++;
			}
			out += j === k + 1 ? "'" : lit;
			k = j + 1;
			continue;
		}
		let n = 1;
		while (k + n < f.length && f.charAt(k + n) === ch) n++;
		const tok = f.slice(k, k + n);
		k += n;
		let v: Json = null;
		if (tok === 'yyyy') v = pad(c.year, 4);
		else if (tok === 'yy') v = pad(((c.year % 100) + 100) % 100, 2);
		else if (tok === 'y') v = String(c.year);
		else if (tok === 'yyyyyy') v = pad(c.year, 6);
		else if (tok === 'M' || tok === 'L') v = String(c.month);
		else if (tok === 'MM' || tok === 'LL') v = pad(c.month, 2);
		else if (tok === 'MMM' || tok === 'LLL') v = months[c.month - 1].slice(0, 3);
		else if (tok === 'MMMM' || tok === 'LLLL') v = months[c.month - 1];
		else if (tok === 'MMMMM' || tok === 'LLLLL') v = months[c.month - 1].charAt(0);
		else if (tok === 'd') v = String(c.day);
		else if (tok === 'dd') v = pad(c.day, 2);
		else if (tok === 'H') v = String(c.hour);
		else if (tok === 'HH') v = pad(c.hour, 2);
		else if (tok === 'h') v = String(c.hour % 12 === 0 ? 12 : c.hour % 12);
		else if (tok === 'hh') v = pad(c.hour % 12 === 0 ? 12 : c.hour % 12, 2);
		else if (tok === 'm') v = String(c.minute);
		else if (tok === 'mm') v = pad(c.minute, 2);
		else if (tok === 's') v = String(c.second);
		else if (tok === 'ss') v = pad(c.second, 2);
		else if (tok === 'S') v = String(c.millisecond);
		else if (tok === 'SSS') v = pad(c.millisecond, 3);
		else if (tok === 'a') v = c.hour < 12 ? 'AM' : 'PM';
		else if (tok === 'c' || tok === 'E') v = String(c.weekday);
		else if (tok === 'ccc' || tok === 'EEE') v = days[c.weekday - 1].slice(0, 3);
		else if (tok === 'cccc' || tok === 'EEEE') v = days[c.weekday - 1];
		else if (tok === 'ccccc' || tok === 'EEEEE') v = days[c.weekday - 1].charAt(0);
		else if (tok === 'o' || tok === 'ooo') {
			const start = Date.UTC(c.year, 0, 1);
			const ord = Math.round((Date.UTC(c.year, c.month - 1, c.day) - start) / 86400000) + 1;
			v = tok === 'o' ? String(ord) : pad(ord, 3);
		} else if (tok === 'Z') v = luxOffsetText(c.offset, 'narrow');
		else if (tok === 'ZZ') v = luxOffsetText(c.offset, 'short');
		else if (tok === 'ZZZ') v = luxOffsetText(c.offset, 'techie');
		else if (tok === 'z') v = dt.zone === 'system' ? 'UTC' : dt.zone.startsWith('fixed:') ? 'UTC' + luxOffsetText(c.offset, 'narrow') : dt.zone;
		else if (tok === 'x') v = String(dt.ts);
		else if (tok === 'X') v = String(Math.floor(dt.ts / 1000));
		else if (tok === 'q') v = String(Math.ceil(c.month / 3));
		else if (tok === 'qq') v = pad(Math.ceil(c.month / 3), 2);
		// The translator lets only known tokens through; other text is kept.
		if (v === null) v = tok;
		out += v;
	}
	return out;
}`,
	},
	luxPlusArgs: {
		uses: [],
		source: `/**
 * The units of \`plus\` and \`minus\`. n8n's DateTime extension also takes
 * \`(value, unit)\`: the unit defaults to minutes, and "day", "hr", "ms" and the like
 * mean the Luxon units (DURATION_MAP of n8n-workflow).
 */
function luxPlusArgs(args: Json[]): Json {
	if (args.length < 2) return args[0];
	const names: Json = {
		day: 'days', month: 'months', year: 'years', week: 'weeks', hour: 'hours', minute: 'minutes',
		second: 'seconds', millisecond: 'milliseconds', ms: 'milliseconds', sec: 'seconds',
		secs: 'seconds', hr: 'hours', hrs: 'hours', min: 'minutes', mins: 'minutes',
	};
	const unit = args[1] === undefined ? 'minutes' : String(args[1]);
	const out: Json = {};
	out[names[unit] === undefined ? unit : names[unit]] = args[0] === undefined ? 0 : args[0];
	return out;
}`,
	},
	luxPlus: {
		uses: ['luxFields', 'luxLocalTs', 'luxFix', 'luxOf', 'luxDaysInMonth'],
		source: `/** \\\`plus(units)\\\` (\\\`sign\\\` 1) and \\\`minus(units)\\\` (\\\`sign\\\` -1), as Luxon adjustTime. */
function luxPlus(dt: Json, units: Json, sign: number): Json {
	if (dt.invalid !== null) return dt;
	const u: Json = {};
	const names = ['years', 'quarters', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds', 'milliseconds'];
	const one = (k: string): string => (k === 'millisecond' ? 'milliseconds' : k.endsWith('s') ? k : k + 's');
	if (typeof units === 'number') u.milliseconds = units * sign;
	else {
		for (const k of Object.keys(units)) {
			const key = one(k);
			if (!names.includes(key)) throw new Error('Invalid unit ' + k);
			// Luxon asNumber: numbers and numeric text; not booleans, '' or NaN.
			const v = units[k];
			const num = Number(v);
			if (typeof v === 'boolean' || v === '' || isNaN(num)) throw new Error('Invalid unit value ' + v);
			u[key] = num * sign;
		}
	}
	const get = (k: string): number => (u[k] === undefined ? 0 : u[k]);
	const c = luxFields(dt);
	const year = c.year + Math.trunc(get('years'));
	const month = c.month + Math.trunc(get('months')) + Math.trunc(get('quarters')) * 3;
	const local = {
		year,
		month,
		day: Math.min(c.day, luxDaysInMonth(year, month)) + Math.trunc(get('days')) + Math.trunc(get('weeks')) * 7,
		hour: c.hour,
		minute: c.minute,
		second: c.second,
		millisecond: c.millisecond,
	};
	// The fractions of calendar units, with Luxon's casual lengths.
	const millis =
		(get('years') - Math.trunc(get('years'))) * 31536000000 +
		(get('quarters') - Math.trunc(get('quarters'))) * 7862400000 +
		(get('months') - Math.trunc(get('months'))) * 2592000000 +
		(get('weeks') - Math.trunc(get('weeks'))) * 604800000 +
		(get('days') - Math.trunc(get('days'))) * 86400000 +
		get('hours') * 3600000 +
		get('minutes') * 60000 +
		get('seconds') * 1000 +
		get('milliseconds');
	let ts = luxFix(luxLocalTs(local), c.offset, dt.zone);
	if (millis !== 0) ts += millis;
	return luxOf(ts, dt.zone);
}`,
	},
	luxStartOf: {
		uses: ['luxFields', 'luxLocalTs', 'luxFix', 'luxOf'],
		source: `/** \\\`startOf(unit)\\\`: weeks start on Monday. */
function luxStartOf(dt: Json, unit: Json): Json {
	if (dt.invalid !== null) return dt;
	const order = ['year', 'quarter', 'month', 'week', 'day', 'hour', 'minute', 'second', 'millisecond'];
	let u = String(unit);
	if (u.endsWith('s') && order.includes(u.slice(0, -1))) u = u.slice(0, -1);
	if (!order.includes(u)) throw new Error('Invalid unit ' + unit);
	const c = luxFields(dt);
	const o: Json = { year: c.year, month: c.month, day: c.day, hour: c.hour, minute: c.minute, second: c.second, millisecond: c.millisecond };
	const at = order.indexOf(u);
	if (u === 'week') {
		o.day = o.day - (c.weekday - 1);
	}
	if (at <= 0) o.month = 1;
	if (u === 'quarter') o.month = Math.floor((c.month - 1) / 3) * 3 + 1;
	if (at <= 2) o.day = 1;
	if (at <= 4) o.hour = 0;
	if (at <= 5) o.minute = 0;
	if (at <= 6) o.second = 0;
	if (at <= 7) o.millisecond = 0;
	return luxOf(luxFix(luxLocalTs(o), c.offset, dt.zone), dt.zone);
}`,
	},
	luxEndOf: {
		uses: ['luxStartOf', 'luxPlus', 'luxOf'],
		source: `/** \\\`endOf(unit)\\\`: one millisecond before the start of the next unit. */
function luxEndOf(dt: Json, unit: Json): Json {
	if (dt.invalid !== null) return dt;
	let u = String(unit);
	if (u.endsWith('s')) u = u.slice(0, -1);
	const units: Json = {};
	units[u === 'millisecond' ? 'milliseconds' : u + 's'] = 1;
	const next = luxPlus(luxStartOf(dt, unit), units, 1);
	return luxOf(next.ts - 1, dt.zone);
}`,
	},
	luxSet: {
		uses: ['luxFields', 'luxFromLocal'],
		source: `/** \\\`set(values)\\\` of local fields. */
function luxSet(dt: Json, values: Json): Json {
	if (dt.invalid !== null) return dt;
	const c = luxFields(dt);
	const o: Json = { year: c.year, month: c.month, day: c.day, hour: c.hour, minute: c.minute, second: c.second, millisecond: c.millisecond };
	for (const k of Object.keys(values)) {
		const key = k.endsWith('s') ? k.slice(0, -1) : k;
		if (!Object.keys(o).includes(key)) throw new Error('Invalid unit ' + k);
		const v = values[k];
		const num = Number(v);
		if (typeof v === 'boolean' || v === '' || isNaN(num)) throw new Error('Invalid unit value ' + v);
		o[key] = num;
	}
	return luxFromLocal(o, dt.zone, dt.ts);
}`,
	},
	luxGet: {
		uses: ['luxFields', 'luxDaysInMonth'],
		source: `/** The getters of a DateTime (\\\`year\\\`, \\\`weekday\\\`, \\\`isValid\\\`, ...); another value gives its property. */
function luxGet(dt: Json, name: string): Json {
	if (dt !== null && typeof dt === 'object' && dt.$dur === true) {
		return dt.invalid !== null ? NaN : dt.values[name] || 0;
	}
	if (dt === null || typeof dt !== 'object' || dt.$lux !== true) return dt[name];
	if (name === 'isValid') return dt.invalid === null;
	if (name === 'invalidReason') return dt.invalid;
	if (name === 'zoneName') return dt.zone === 'system' ? 'UTC' : dt.zone.startsWith('fixed:') ? null : dt.zone;
	if (dt.invalid !== null) return name === 'offset' ? NaN : NaN;
	const c = luxFields(dt);
	if (name === 'daysInMonth') return luxDaysInMonth(c.year, c.month);
	if (name === 'quarter') return Math.ceil(c.month / 3);
	if (name === 'ordinal') return Math.round((Date.UTC(c.year, c.month - 1, c.day) - Date.UTC(c.year, 0, 1)) / 86400000) + 1;
	if (name === 'ts') return dt.ts;
	return c[name];
}`,
	},
	luxCall: {
		uses: [
			'luxISO',
			'luxFormat',
			'luxPlus',
			'luxPlusArgs',
			'luxStartOf',
			'luxEndOf',
			'luxSet',
			'luxOf',
			'luxZoneOf',
			'collSet',
			'luxDiff',
			'luxDurCall',
		],
		source: `/** A method of a DateTime; another value calls its own method (a Map \\\`set\\\` included). */
function luxCall(dt: Json, name: string, args: Json[], dz: string): Json {
	if (dt !== null && typeof dt === 'object' && dt.$dur === true) return luxDurCall(dt, name, args);
	if (dt === null || typeof dt !== 'object' || dt.$lux !== true) {
		if (dt !== null && typeof dt === 'object' && dt.$coll !== undefined && name === 'set') {
			return collSet(dt, args[0], args[1]);
		}
		const f = dt === undefined || dt === null ? undefined : dt[name];
		if (typeof f !== 'function') {
			throw new TypeError(
				dt === undefined || dt === null
					? 'Cannot read properties of ' + dt + " (reading '" + name + "')"
					: 'value.' + name + ' is not a function',
			);
		}
		return args.length === 0 ? f() : args.length === 1 ? f(args[0]) : f(args[0], args[1]);
	}
	if (name === 'toISO') return luxISO(dt, 'all');
	if (name === 'toISODate') return luxISO(dt, 'date');
	if (name === 'toISOTime') return luxISO(dt, 'time');
	if (name === 'toFormat') return luxFormat(dt, args[0]);
	if (name === 'toMillis' || name === 'valueOf') return dt.ts;
	if (name === 'toSeconds') return dt.ts / 1000;
	if (name === 'toUnixInteger') return Math.floor(dt.ts / 1000);
	if (name === 'toJSDate') return dt.ts;
	if (name === 'plus') return luxPlus(dt, luxPlusArgs(args), 1);
	if (name === 'minus') return luxPlus(dt, luxPlusArgs(args), -1);
	if (name === 'startOf') return luxStartOf(dt, args[0]);
	if (name === 'endOf') return luxEndOf(dt, args[0]);
	if (name === 'set') return luxSet(dt, args[0]);
	if (name === 'toUTC') return luxOf(dt.ts, 'UTC', dt.invalid);
	if (name === 'toLocal') return luxOf(dt.ts, dz, dt.invalid);
	if (name === 'setZone') {
		const zone = luxZoneOf(args[0], dz);
		return zone === null ? luxOf(NaN, 'system', 'unsupported zone') : luxOf(dt.ts, zone, dt.invalid);
	}
	if (name === 'equals') {
		const o = args[0];
		return o !== null && typeof o === 'object' && o.$lux === true && dt.invalid === null && o.invalid === null && dt.ts === o.ts && dt.zone === o.zone;
	}
	if (name === 'diff') return luxDiff(dt, args[0], args[1]);
	throw new Error('DateTime.' + name + ' has no native form');
}`,
	},
	luxStatic: {
		uses: ['luxOf', 'luxZoneOf', 'luxFromLocal', 'luxFields'],
		source: `/** DateTime.fromMillis, fromSeconds, fromJSDate, fromObject and utc. */
function luxStatic(name: string, args: Json[], now: number, dz: string): Json {
	const opts = args.length > 1 && args[1] !== null && typeof args[1] === 'object' ? args[1] : {};
	const zone = luxZoneOf(name === 'utc' ? 'UTC' : opts.zone, dz);
	if (zone === null) return luxOf(NaN, 'system', 'unsupported zone');
	if (name === 'fromMillis' || name === 'fromSeconds') {
		const v = args[0];
		if (typeof v !== 'number') throw new TypeError(name + ' requires a numerical input');
		return luxOf(name === 'fromSeconds' ? v * 1000 : v, zone);
	}
	if (name === 'fromJSDate') return luxOf(new Date(args[0]).getTime(), zone);
	const units = ['year', 'month', 'day', 'hour', 'minute', 'second', 'millisecond'];
	const given: Json = {};
	if (name === 'utc') {
		if (args.length === 0) return luxOf(now, 'UTC');
		for (let k = 0; k < args.length && k < 7; k++) given[units[k]] = args[k];
	} else {
		for (const k of Object.keys(args[0])) {
			const key = k.endsWith('s') ? k.slice(0, -1) : k;
			if (!units.includes(key)) throw new Error('Invalid unit ' + k);
			const v = args[0][k];
			const num = Number(v);
			if (typeof v === 'boolean' || v === '' || isNaN(num)) throw new Error('Invalid unit value ' + v);
			given[key] = num;
		}
	}
	// Units above the largest given one come from now; units below the smallest are their start.
	const nowFields = luxFields(luxOf(now, zone));
	const c: Json = {};
	let seen = false;
	for (const u of units) {
		if (given[u] !== undefined) seen = true;
		c[u] = given[u] !== undefined ? given[u] : seen ? (u === 'month' || u === 'day' ? 1 : 0) : nowFields[u];
	}
	return luxFromLocal(c, zone, now);
}`,
	},
	luxUnitOf: {
		uses: [],
		source: `/** Luxon Duration.normalizeUnit: the plural unit name, or an error. */
function luxUnitOf(u: Json): string {
	const names = ['years', 'quarters', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds', 'milliseconds'];
	const lower = typeof u === 'string' ? u.toLowerCase() : '';
	for (const n of names) {
		if (lower === n || lower + 's' === n) return n;
	}
	throw new Error('Invalid unit ' + u);
}`,
	},
	luxMatrix: {
		uses: [],
		source: `/** The casual conversion factor of Luxon from unit \\\`from\\\` to a smaller unit \\\`to\\\`. */
function luxMatrix(from: string, to: string): number {
	const days: Json = { years: 365, quarters: 91, months: 30, weeks: 7, days: 1 };
	const perDay: Json = { days: 1, hours: 24, minutes: 1440, seconds: 86400, milliseconds: 86400000 };
	if (from === 'years' && to === 'quarters') return 4;
	if (from === 'years' && to === 'months') return 12;
	if (from === 'years' && to === 'weeks') return 52;
	if (from === 'quarters' && to === 'months') return 3;
	if (from === 'quarters' && to === 'weeks') return 13;
	if (from === 'months' && to === 'weeks') return 4;
	if (days[from] !== undefined) return days[from] * perDay[to];
	return perDay[to] / perDay[from];
}`,
	},
	luxNormalize: {
		uses: ['luxMatrix'],
		source: `/** Luxon normalizeValues: rolls whole units up and fractions down. It changes \\\`vals\\\`. */
function luxNormalize(vals: Json): void {
	const order = ['years', 'quarters', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds', 'milliseconds'];
	let sum = vals.milliseconds ?? 0;
	for (let j = 7; j >= 0; j--) {
		const u = order[j];
		if (vals[u]) sum += vals[u] * luxMatrix(u, 'milliseconds');
	}
	const factor = sum < 0 ? -1 : 1;
	let previous = '';
	for (let j = 8; j >= 0; j--) {
		const current = order[j];
		if (vals[current] === undefined) continue;
		if (previous !== '') {
			const conv = luxMatrix(current, previous);
			const rollUp = Math.floor((vals[previous] * factor) / conv);
			vals[current] += rollUp * factor;
			vals[previous] -= rollUp * conv * factor;
		}
		previous = current;
	}
	previous = '';
	for (let j = 0; j < 9; j++) {
		const current = order[j];
		if (vals[current] === undefined) continue;
		if (previous !== '') {
			const fraction = vals[previous] % 1;
			vals[previous] -= fraction;
			vals[current] += fraction * luxMatrix(previous, current);
		}
		previous = current;
	}
}`,
	},
	luxShift: {
		uses: ['luxMatrix', 'luxNormalize'],
		source: `/** Luxon Duration.shiftTo: the values of \\\`vals\\\` in the units \\\`units\\\`. */
function luxShift(vals: Json, units: string[]): Json {
	const order = ['years', 'quarters', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds', 'milliseconds'];
	const built: Json = {};
	const acc: Json = {};
	let last = '';
	for (const k of order) {
		if (units.includes(k)) {
			last = k;
			let own = 0;
			for (const ak of Object.keys(acc)) {
				own += luxMatrix(ak, k) * acc[ak];
				acc[ak] = 0;
			}
			if (typeof vals[k] === 'number') own += vals[k];
			const i = Math.trunc(own);
			built[k] = i;
			acc[k] = (own * 1000 - i * 1000) / 1000;
		} else if (typeof vals[k] === 'number') acc[k] = vals[k];
	}
	for (const key of Object.keys(acc)) {
		if (acc[key] !== 0) built[last] += key === last ? acc[key] : acc[key] / luxMatrix(last, key);
	}
	luxNormalize(built);
	return built;
}`,
	},
	luxDiff: {
		uses: ['luxUnitOf', 'luxFields', 'luxLocalTs', 'luxPlus', 'luxShift'],
		source: `/** DateTime.diff(other, unit or units): a Duration \\\`{ $dur, values, invalid }\\\`, as Luxon impl/diff. */
function luxDiff(dt: Json, other: Json, unit: Json): Json {
	if (other === undefined || other === null) {
		throw new TypeError('Cannot read properties of ' + other + " (reading 'isValid')");
	}
	const otherValid = typeof other === 'object' && other.$lux === true && other.invalid === null;
	if (dt.invalid !== null || !otherValid) {
		return { $dur: true, values: {}, invalid: 'created by diffing an invalid DateTime' };
	}
	const list = unit === undefined ? ['milliseconds'] : Array.isArray(unit) ? unit : [unit];
	const units: string[] = [];
	for (const u of list) units.push(luxUnitOf(u));
	const otherLater = other.ts > dt.ts;
	const earlier = otherLater ? dt : other;
	const later = otherLater ? other : dt;
	const dayStart = (d: Json): number => {
		const c = luxFields(d);
		return luxLocalTs({ year: c.year, month: c.month, day: c.day, hour: 0, minute: 0, second: 0, millisecond: 0 });
	};
	const dayDiff = (a: Json, b: Json): number => Math.floor((dayStart(b) - dayStart(a)) / 86400000);
	const results: Json = {};
	let cursor = earlier;
	let highWater = earlier;
	let lowest = '';
	let same = false;
	for (const u of ['years', 'quarters', 'months', 'weeks', 'days']) {
		if (!units.includes(u)) continue;
		lowest = u;
		const fa = luxFields(cursor);
		const fb = luxFields(later);
		if (u === 'years') results[u] = fb.year - fa.year;
		else if (u === 'quarters') results[u] = Math.ceil(fb.month / 3) - Math.ceil(fa.month / 3) + (fb.year - fa.year) * 4;
		else if (u === 'months') results[u] = fb.month - fa.month + (fb.year - fa.year) * 12;
		else if (u === 'weeks') {
			const days = dayDiff(cursor, later);
			results[u] = (days - (days % 7)) / 7;
		} else results[u] = dayDiff(cursor, later);
		highWater = luxPlus(earlier, results, 1);
		if (highWater.ts > later.ts) {
			results[u]--;
			cursor = luxPlus(earlier, results, 1);
			same = false;
			if (cursor.ts > later.ts) {
				highWater = cursor;
				results[u]--;
				cursor = luxPlus(earlier, results, 1);
			}
		} else {
			cursor = highWater;
			same = true;
		}
	}
	const remaining = later.ts - cursor.ts;
	const lower = units.filter((u: string) => u === 'hours' || u === 'minutes' || u === 'seconds' || u === 'milliseconds');
	let values: Json = results;
	if (lower.length === 0) {
		if (highWater.ts < later.ts) {
			const one: Json = {};
			one[lowest] = 1;
			highWater = luxPlus(cursor, one, 1);
			same = false;
		}
		if (!same) results[lowest] = (results[lowest] || 0) + remaining / (highWater.ts - cursor.ts);
	} else {
		const shifted = luxShift({ milliseconds: remaining }, lower);
		values = {};
		for (const k of ['years', 'quarters', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds', 'milliseconds']) {
			if (shifted[k] !== undefined || results[k] !== undefined) values[k] = (shifted[k] || 0) + (results[k] || 0);
		}
	}
	if (otherLater) {
		for (const k of Object.keys(values)) values[k] = values[k] === 0 ? 0 : -values[k];
	}
	return { $dur: true, values, invalid: null };
}`,
	},
	luxDurCall: {
		uses: ['luxUnitOf', 'luxShift', 'luxMatrix'],
		source: `/** A method of a Duration: \\\`as\\\`, \\\`toMillis\\\`, \\\`toObject\\\` and \\\`get\\\`. */
function luxDurCall(d: Json, name: string, args: Json[]): Json {
	if (name === 'toObject') return d.invalid === null ? Object.assign({}, d.values) : {};
	if (d.invalid !== null) return NaN;
	if (name === 'as') {
		const u = luxUnitOf(args[0]);
		return luxShift(Object.assign({}, d.values), [u])[u];
	}
	if (name === 'get') return d.values[luxUnitOf(args[0])] || 0;
	if (name === 'toMillis' || name === 'valueOf') {
		let sum = d.values.milliseconds ?? 0;
		for (const u of ['seconds', 'minutes', 'hours', 'days', 'weeks', 'months', 'quarters', 'years']) {
			if (d.values[u]) sum += d.values[u] * luxMatrix(u, 'milliseconds');
		}
		return sum;
	}
	throw new Error('Duration.' + name + ' has no native form');
}`,
	},
	luxToString: {
		uses: ['luxText', 'toStringOf'],
		source: `/** x.toString() when the code uses Luxon. */
function luxToString(v: Json): string {
	if (v !== null && typeof v === 'object' && v.$lux === true) return luxText(v);
	return toStringOf(v);
}`,
	},
	luxText: {
		uses: ['luxISO'],
		source: `/** A DateTime as text (\\\`toString\\\`); another value stays. */
function luxText(v: Json): Json {
	if (v !== null && typeof v === 'object' && v.$lux === true) {
		return v.invalid === null ? luxISO(v, 'all') : 'Invalid DateTime';
	}
	return v;
}`,
	},
	luxNum: {
		uses: [],
		source: `/** A DateTime as its time value (\\\`valueOf\\\`), for comparisons; another value stays. */
function luxNum(v: Json): Json {
	return v !== null && typeof v === 'object' && v.$lux === true ? v.ts : v;
}`,
	},
};
