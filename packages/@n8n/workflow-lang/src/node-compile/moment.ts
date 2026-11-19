import ts from 'typescript';

const f = ts.factory;

export const MOMENT_PACKAGE = 'moment-timezone';

export const MOMENT_HELPERS: Record<string, string> = {
	__momentSpace: `function __momentSpace(code: number): boolean {
	return (code >= 9 && code <= 13) || code === 32 || code === 160 || code === 5760 || (code >= 8192 && code <= 8202) || code === 8232 || code === 8233 || code === 8239 || code === 8287 || code === 12288 || code === 65279;
}`,
	__momentDigits: `function __momentDigits(text: string, from: number, count: number): number {
	if (from + count > text.length) return -1;
	let value: number = 0;
	for (let k = from; k < from + count; k++) {
		const code: number = text.charCodeAt(k);
		if (code < 48 || code > 57) return -1;
		value = value * 10 + (code - 48);
	}
	return value;
}`,
	__momentIsoTime: `function __momentIsoTime(text: string, from: number, colon: boolean): any {
	if (from === text.length) return [0, 0, 0, 0, null, false];
	const lead: number = text.charCodeAt(from);
	if (lead !== 84 && lead !== 32) return null;
	let at: number = from + 1;
	const hour: number = __momentDigits(text, at, 2);
	if (hour < 0) return null;
	at += 2;
	let minute: number = 0;
	let second: number = 0;
	let milli: number = 0;
	const step: number = colon ? 1 : 0;
	if ((!colon || text.charCodeAt(at) === 58) && __momentDigits(text, at + step, 2) >= 0) {
		minute = __momentDigits(text, at + step, 2);
		at += step + 2;
		if ((!colon || text.charCodeAt(at) === 58) && __momentDigits(text, at + step, 2) >= 0) {
			second = __momentDigits(text, at + step, 2);
			at += step + 2;
			const mark: number = text.charCodeAt(at);
			if ((mark === 46 || mark === 44) && __momentDigits(text, at + 1, 1) >= 0) {
				let stop: number = at + 1;
				while (__momentDigits(text, stop, 1) >= 0) stop++;
				milli = Math.floor(Number('0.' + text.slice(at + 1, stop)) * 1000);
				at = stop;
			}
		}
	}
	if (at === text.length) return [hour, minute, second, milli, null, true];
	const sign: number = text.charCodeAt(at);
	if (sign === 43 || sign === 45) {
		const hours: number = __momentDigits(text, at + 1, 2);
		if (hours < 0) return null;
		let minutes: number = 0;
		let stop: number = at + 3;
		if (stop < text.length) {
			if (text.charCodeAt(stop) === 58) stop++;
			minutes = __momentDigits(text, stop, 2);
			if (minutes < 0) return null;
			stop += 2;
		}
		if (stop !== text.length) return null;
		const total: number = hours * 60 + minutes;
		if (minutes > 59 || total > (sign === 43 ? 840 : 720)) return [hour, minute, second, milli, NaN, true];
		return [hour, minute, second, milli, total === 0 ? 0 : sign === 43 ? total : -total, true];
	}
	let stop: number = at;
	while (stop < text.length && __momentSpace(text.charCodeAt(stop))) stop++;
	if (stop === text.length - 1 && text.charCodeAt(stop) === 90) return [hour, minute, second, milli, 0, true];
	return null;
}`,
	__momentIso: `function __momentIso(input: string): any {
	const text: string = input.trimStart();
	const lead: number = text.charCodeAt(0);
	if ((lead === 43 || lead === 45) && __momentDigits(text, 1, 6) >= 0) throw new Error('the text of a date with a year of six digits has no compiled form');
	const year: number = __momentDigits(text, 0, 4);
	if (year < 0) return null;
	const week: number = text.charCodeAt(5) === 87 ? 1 : 0;
	if (text.charCodeAt(4) === 45) {
		if (week === 0 && __momentDigits(text, 5, 2) >= 0 && text.charCodeAt(7) === 45 && __momentDigits(text, 8, 2) >= 0) {
			const time: any = __momentIsoTime(text, 10, true);
			if (time !== null) return [year, __momentDigits(text, 5, 2), __momentDigits(text, 8, 2), time[0], time[1], time[2], time[3], time[4]];
		}
		if (week === 1 && __momentDigits(text, 6, 2) >= 0) {
			if ((text.charCodeAt(8) === 45 && __momentDigits(text, 9, 1) >= 0 && __momentIsoTime(text, 10, true) !== null) || __momentIsoTime(text, 8, true) !== null) throw new Error('the text of a date with a week number has no compiled form');
			return null;
		}
		if (__momentDigits(text, 5, 3) >= 0 && __momentIsoTime(text, 8, true) !== null) throw new Error('the text of a date with a day of the year has no compiled form');
		if (__momentDigits(text, 5, 2) >= 0) {
			const time: any = __momentIsoTime(text, 7, true);
			if (time !== null && !time[5]) return [year, __momentDigits(text, 5, 2), 1, 0, 0, 0, 0, null];
		}
		return null;
	}
	if (__momentDigits(text, 4, 4) >= 0) {
		const time: any = __momentIsoTime(text, 8, false);
		if (time !== null) return [year, __momentDigits(text, 4, 2), __momentDigits(text, 6, 2), time[0], time[1], time[2], time[3], time[4]];
	}
	if (text.charCodeAt(4) === 87 && __momentDigits(text, 5, 2) >= 0) {
		if ((__momentDigits(text, 7, 1) >= 0 && __momentIsoTime(text, 8, false) !== null) || __momentIsoTime(text, 7, false) !== null) throw new Error('the text of a date with a week number has no compiled form');
		return null;
	}
	if (__momentDigits(text, 4, 3) >= 0 && __momentIsoTime(text, 7, false) !== null) throw new Error('the text of a date with a day of the year has no compiled form');
	if (__momentDigits(text, 4, 2) >= 0) {
		const time: any = __momentIsoTime(text, 6, false);
		if (time !== null && !time[5]) return [year, __momentDigits(text, 4, 2), 1, 0, 0, 0, 0, null];
	}
	const time: any = __momentIsoTime(text, 4, false);
	if (time !== null && !time[5]) return [year, 1, 1, 0, 0, 0, 0, null];
	return null;
}`,
	__momentDays: `function __momentDays(year: number, month: number): number {
	const index: number = ((month % 12) + 12) % 12;
	const full: number = year + (month - index) / 12;
	if (index === 1) return (full % 4 === 0 && full % 100 !== 0) || full % 400 === 0 ? 29 : 28;
	return 31 - ((index % 7) % 2);
}`,
	__momentZone: `function __momentZone(zone: any, known: any): string {
	for (const name of known) {
		if (name === zone) return name;
	}
	throw new Error('a time zone that is not in the parameters of the node has no compiled form');
}`,
	__momentOffset: `function __momentOffset(zone: string, t: number): number {
	if (zone === '' || zone === 'utc' || zone === 'UTC' || isNaN(t)) return 0;
	if (t < 0) throw new Error('a date before 1970 in a time zone has no compiled form');
	if (t > 253402214400000) throw new Error('a date after the year 9999 in a time zone has no compiled form');
	try {
		return Date.zoneOffset(zone, t);
	} catch (error) {
		throw new Error('a time zone of a moment that is not loaded has no compiled form');
	}
}`,
	__momentWall: `function __momentWall(zone: string, wall: number): number {
	if (zone === '' || zone === 'utc' || zone === 'UTC' || isNaN(wall)) return wall;
	const first: number = __momentOffset(zone, wall - 172800000);
	const last: number = __momentOffset(zone, wall + 172800000);
	const early: number = wall - first * 60000;
	if (first === last) {
		if (__momentOffset(zone, wall - 86400000) !== first || __momentOffset(zone, wall + 86400000) !== first || __momentOffset(zone, early) !== first) throw new Error('a date near two changes of a time zone has no compiled form');
		return early;
	}
	let low: number = wall - 172800000;
	let high: number = wall + 172800000;
	while (high - low > 1000) {
		const middle: number = low + Math.floor((high - low) / 2000) * 1000;
		const found: number = __momentOffset(zone, middle);
		if (found === first) low = middle;
		else if (found === last) high = middle;
		else throw new Error('a date near two changes of a time zone has no compiled form');
	}
	const change: number = Math.floor(high / 1000) * 1000;
	if (wall < change + first * 60000) return early;
	let before: number = first;
	for (let k = 1; k <= 800 && before === first; k++) before = __momentOffset(zone, change - 1 - k * 43200000);
	if (before === first) throw new Error('a date after the first change of a time zone in more than a year has no compiled form');
	if (before > first && wall < change + before * 60000) return early;
	return wall - last * 60000;
}`,
	__momentAt: `function __momentAt(t: number, zone: string): any {
	return { t, z: zone, o: __momentOffset(zone, t) };
}`,
	__momentKeep: `function __momentKeep(zone: string, wall: number, offset: number): any {
	const clipped: number = new Date(wall).getTime();
	const next: number = __momentOffset(zone, clipped - offset * 60000);
	return { t: clipped - next * 60000, z: zone, o: next };
}`,
	__momentParse: `function __momentParse(input: any, zone: string): number {
	if (input === undefined) return Date.now();
	if (input === null) return NaN;
	if (typeof input === 'number') return new Date(input).getTime();
	if (typeof input !== 'string') throw new Error('a moment of a value that is not text, a number or a date has no compiled form');
	const lower: string = input.toLowerCase();
	if (lower.startsWith('/date(') || lower.startsWith('date(')) throw new Error('the text of a date in the ASP.NET form has no compiled form');
	const parts: any = __momentIso(input);
	if (parts === null) {
		if (input.includes(':')) {
			for (const month of ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']) {
				if (input.includes(month)) throw new Error('the text of a date with the name of a month and a time has no compiled form');
			}
		}
		return new Date(zone === '' ? input : input + ' UTC').getTime();
	}
	const year: number = parts[0];
	const month: number = parts[1];
	const day: number = parts[2];
	const hour: number = parts[3];
	if (month < 1 || month > 12 || day < 1 || day > __momentDays(year, month - 1)) return NaN;
	if (hour > 24 || parts[4] > 59 || parts[5] > 59) return NaN;
	if (hour === 24 && (parts[4] !== 0 || parts[5] !== 0 || parts[6] !== 0)) return NaN;
	const date = new Date(Date.UTC(2000, 0, 1, hour === 24 ? 0 : hour, parts[4], parts[5], parts[6]));
	date.setUTCFullYear(year, month - 1, hour === 24 ? day + 1 : day);
	const wall: number = date.getTime();
	if (parts[7] !== null) return wall - parts[7] * 60000;
	return __momentWall(zone, wall);
}`,
	__moment: `function __moment(input: any, mode: string): any {
	return { t: __momentParse(input, mode), z: mode, o: 0 };
}`,
	__momentIn: `function __momentIn(input: any, zone: string): any {
	if (zone === null || zone === undefined || zone === '') throw new Error('a time zone of a moment that is empty has no compiled form');
	return __momentAt(__momentParse(input, zone), zone);
}`,
	__momentNowIn: `function __momentNowIn(zone: string): any {
	if (zone === null || zone === undefined || zone === '') throw new Error('a time zone of a moment that is empty has no compiled form');
	return __momentAt(Date.now(), zone);
}`,
	__momentTz: `function __momentTz(m: any, zone: string): any {
	return __momentAt(m.t, zone);
}`,
	__momentUtc: `function __momentUtc(m: any, keep: boolean): any {
	return { t: keep ? new Date(m.t + m.o * 60000).getTime() : m.t, z: 'utc', o: 0 };
}`,
	__momentAdd: `function __momentAdd(m: any, amount: any, unit: string, sign: number): any {
	if (isNaN(m.t)) return m;
	const absent: boolean = amount === null || amount === undefined;
	if (!absent && typeof amount !== 'number' && typeof amount !== 'string' && typeof amount !== 'boolean') throw new Error('a change of a moment by an object has no compiled form');
	const count: number = absent ? 0 : Number(amount);
	if (isNaN(count)) throw new Error('a change of a moment by a value that is not a number has no compiled form');
	if (unit === 'ms' || unit === 's' || unit === 'm' || unit === 'h') {
		const size: number = unit === 'ms' ? 1 : unit === 's' ? 1000 : unit === 'm' ? 60000 : 3600000;
		return __momentAt(new Date(m.t + count * size * sign).getTime(), m.z);
	}
	const scaled: number = unit === 'w' ? count * 7 : unit === 'y' ? count * 12 : unit === 'Q' ? count * 3 : count;
	const whole: number = (scaled < 0 ? -Math.round(-scaled) : Math.round(scaled)) * sign;
	if (whole === 0) return m;
	const date = new Date(m.t + m.o * 60000);
	if (unit === 'd' || unit === 'w') {
		date.setUTCDate(date.getUTCDate() + whole);
	} else {
		const target: number = date.getUTCMonth() + whole;
		const day: number = date.getUTCDate();
		date.setUTCMonth(target, day < 29 ? day : Math.min(day, __momentDays(date.getUTCFullYear(), target)));
	}
	return __momentKeep(m.z, date.getTime(), m.o);
}`,
	__momentEdge: `function __momentEdge(m: any, unit: string, end: boolean): any {
	if (isNaN(m.t)) return m;
	const wall: number = m.t + m.o * 60000;
	const date = new Date(wall);
	const year: number = date.getUTCFullYear();
	if (year < 100) throw new Error('the start or the end of a unit before the year 100 has no compiled form');
	const month: number = date.getUTCMonth();
	const day: number = date.getUTCDate();
	const more: number = end ? 1 : 0;
	let edge: number = 0;
	if (unit === 'y') edge = Date.UTC(year + more, 0, 1);
	else if (unit === 'M') edge = Date.UTC(year, month + more, 1);
	else if (unit === 'd') edge = Date.UTC(year, month, day + more);
	else {
		const size: number = unit === 'h' ? 3600000 : unit === 'm' ? 60000 : 1000;
		edge = wall - (((wall % size) + size) % size) + more * size;
	}
	return __momentKeep(m.z, edge - more, m.o);
}`,
	__momentPad: `function __momentPad(value: number, length: number): string {
	return String(value).padStart(length, '0');
}`,
	__momentFormatOf: `function __momentFormatOf(m: any, format: any, known: any): string {
	for (const entry of known) {
		if (entry[0] === format) return __momentFormat(m, entry[1]);
	}
	throw new Error('a date format that is not one of the texts of the node code has no compiled form');
}`,
	__momentFormat: `function __momentFormat(m: any, parts: any): string {
	if (isNaN(m.t)) return 'Invalid date';
	const offset: number = m.o;
	const date = new Date(m.t + offset * 60000);
	if (isNaN(date.getTime())) throw new Error('the text of a date at the limit of the range of dates has no compiled form');
	const year: number = date.getUTCFullYear();
	if (year < 0 || year > 9999) throw new Error('the text of a date with a year outside 0 to 9999 has no compiled form');
	const month: number = date.getUTCMonth();
	const day: number = date.getUTCDate();
	const weekday: number = date.getUTCDay();
	const hour: number = date.getUTCHours();
	const milli: number = date.getUTCMilliseconds();
	const months: any = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
	const weekdays: any = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
	const size: number = offset < 0 ? -offset : offset;
	const zoneHours: string = (offset < 0 ? '-' : '+') + __momentPad(Math.floor(size / 60), 2);
	const zoneMinutes: string = __momentPad(Math.floor(size) % 60, 2);
	let out: string = '';
	for (const part of parts) {
		const token: string = part;
		if (token.startsWith("'")) out += token.slice(1);
		else if (token === 'YYYY') out += __momentPad(year, 4);
		else if (token === 'yyyy') {
			if (year < 1) throw new Error('the year of an era before year 1 has no compiled form');
			out += __momentPad(year, 4);
		}
		else if (token === 'YY') out += __momentPad(year % 100, 2);
		else if (token === 'M') out += String(month + 1);
		else if (token === 'MM') out += __momentPad(month + 1, 2);
		else if (token === 'MMM') out += months[month].slice(0, 3);
		else if (token === 'MMMM') out += months[month];
		else if (token === 'D') out += String(day);
		else if (token === 'DD') out += __momentPad(day, 2);
		else if (token === 'Do') {
			const last: number = day % 10;
			out += String(day) + (Math.floor((day % 100) / 10) === 1 ? 'th' : last === 1 ? 'st' : last === 2 ? 'nd' : last === 3 ? 'rd' : 'th');
		} else if (token === 'd') out += String(weekday);
		else if (token === 'dd') out += weekdays[weekday].slice(0, 2);
		else if (token === 'ddd') out += weekdays[weekday].slice(0, 3);
		else if (token === 'dddd') out += weekdays[weekday];
		else if (token === 'H') out += String(hour);
		else if (token === 'HH') out += __momentPad(hour, 2);
		else if (token === 'h') out += String(hour % 12 === 0 ? 12 : hour % 12);
		else if (token === 'hh') out += __momentPad(hour % 12 === 0 ? 12 : hour % 12, 2);
		else if (token === 'm') out += String(date.getUTCMinutes());
		else if (token === 'mm') out += __momentPad(date.getUTCMinutes(), 2);
		else if (token === 's') out += String(date.getUTCSeconds());
		else if (token === 'ss') out += __momentPad(date.getUTCSeconds(), 2);
		else if (token === 'S') out += String(Math.floor(milli / 100));
		else if (token === 'SS') out += __momentPad(Math.floor(milli / 10), 2);
		else if (token === 'SSS') out += __momentPad(milli, 3);
		else if (token === 'A') out += hour > 11 ? 'PM' : 'AM';
		else if (token === 'a') out += hour > 11 ? 'pm' : 'am';
		else if (token === 'Q') out += String(Math.floor(month / 3) + 1);
		else if (token === 'Z') out += zoneHours + ':' + zoneMinutes;
		else if (token === 'ZZ') out += zoneHours + zoneMinutes;
		else if (token === 'X') out += String(Math.floor(m.t / 1000));
		else if (token === 'x') out += String(m.t);
		else if (token === 'ISO') out += m.z !== '' && offset === 0 ? 'Z' : zoneHours + ':' + zoneMinutes;
		else throw new Error('the token ' + token + ' of a date format has no compiled form');
	}
	return out;
}`,
	__momentUnix: `function __momentUnix(m: any): number {
	return Math.floor(m.t / 1000);
}`,
	__momentValue: `function __momentValue(m: any): number {
	return m.t;
}`,
	__momentIsoText: `function __momentIsoText(m: any): any {
	if (isNaN(m.t)) return null;
	return new Date(m.t).toISOString();
}`,
	__momentValid: `function __momentValid(m: any): boolean {
	return !isNaN(m.t);
}`,
	__momentOrder: `function __momentOrder(m: any, other: any, order: number): boolean {
	if (isNaN(m.t) || isNaN(other.t)) return false;
	return order < 0 ? m.t < other.t : order > 0 ? m.t > other.t : m.t === other.t;
}`,
};

export const MOMENT_HELPER_USES: Record<string, string[]> = {
	__momentIsoTime: ['__momentDigits', '__momentSpace'],
	__momentIso: ['__momentIsoTime', '__momentDigits', '__momentSpace'],
	__momentWall: ['__momentOffset'],
	__momentKeep: ['__momentOffset'],
	__momentParse: [
		'__momentIso',
		'__momentIsoTime',
		'__momentDigits',
		'__momentSpace',
		'__momentDays',
		'__momentWall',
		'__momentOffset',
	],
	__momentAt: ['__momentOffset'],
	__momentNowIn: ['__momentAt', '__momentOffset'],
	__momentTz: ['__momentAt', '__momentOffset'],
	__momentAdd: ['__momentOffset', '__momentAt', '__momentKeep', '__momentDays'],
	__momentEdge: ['__momentOffset', '__momentKeep'],
	__momentFormat: ['__momentPad'],
	__momentFormatOf: ['__momentFormat', '__momentPad'],
};
MOMENT_HELPER_USES.__moment = ['__momentParse', ...MOMENT_HELPER_USES.__momentParse];
MOMENT_HELPER_USES.__momentIn = ['__momentAt', ...MOMENT_HELPER_USES.__moment];

export const MOMENT_ZONE_HELPERS: Record<string, number> = {
	__momentIn: 1,
	__momentNowIn: 0,
	__momentTz: 1,
};

const MOMENT_ZONE_RUNTIME = new Set(['__momentIn', '__momentNowIn']);

const FORMAT_TOKENS =
	/(\[[^[]*\])|(\\)?([Hh]mm(ss)?|Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Qo?|N{1,5}|YYYYYY|YYYYY|YYYY|YY|y{2,4}|yo?|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|kk?|mm?|ss?|S{1,9}|x|X|zz?|ZZ?|.)/g;
const LOCAL_TOKENS = /(\[[^[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g;
const LONG_FORMATS: Record<string, string> = {
	LTS: 'h:mm:ss A',
	LT: 'h:mm A',
	L: 'MM/DD/YYYY',
	LL: 'MMMM D, YYYY',
	LLL: 'MMMM D, YYYY h:mm A',
	LLLL: 'dddd, MMMM D, YYYY h:mm A',
};
const FORMAT_NAMES = new Set([
	'YYYY',
	'yyyy',
	'YY',
	'M',
	'MM',
	'MMM',
	'MMMM',
	'D',
	'DD',
	'Do',
	'd',
	'dd',
	'ddd',
	'dddd',
	'H',
	'HH',
	'h',
	'hh',
	'm',
	'mm',
	's',
	'ss',
	'S',
	'SS',
	'SSS',
	'A',
	'a',
	'Q',
	'Z',
	'ZZ',
	'X',
	'x',
]);
const SINGLE_TOKENS = 'MYyNwWdeEDQHhkaAmsSzZXx';
const MAX_FORMAT = 256;

export function momentFormatParts(format: string | undefined): string[] | string {
	if (format === undefined)
		return ['YYYY', "'-", 'MM', "'-", 'DD', "'T", 'HH', "':", 'mm', "':", 'ss', 'ISO'];
	if (format.length > MAX_FORMAT) return 'a date format of more than 256 characters';
	let expanded = format;
	for (let round = 0; round < 5 && LOCAL_TOKENS.test(expanded); round++) {
		LOCAL_TOKENS.lastIndex = 0;
		let unknown: string | undefined;
		expanded = expanded.replace(LOCAL_TOKENS, (text: string) => {
			if (text.startsWith('[') || text.startsWith('\\')) return text;
			if (!Object.hasOwn(LONG_FORMATS, text)) unknown = text;
			return LONG_FORMATS[text] ?? text;
		});
		if (unknown !== undefined) return `the token '${unknown}' of a date format`;
	}
	LOCAL_TOKENS.lastIndex = 0;
	const parts: string[] = [];
	const literal = (text: string) => {
		const last = parts.at(-1);
		if (last?.startsWith("'")) parts[parts.length - 1] = last + text;
		else parts.push(`'${text}`);
	};
	for (const token of expanded.match(FORMAT_TOKENS) ?? []) {
		if (/^\[[\s\S]/.test(token)) literal(token.replace(/^\[|\]$/g, ''));
		else if (token.startsWith('\\') || token === '[') literal(token.replace(/\\/g, ''));
		else if (FORMAT_NAMES.has(token)) parts.push(token);
		else if (token.length > 1 || SINGLE_TOKENS.includes(token))
			return `the token '${token}' of a date format`;
		else literal(token);
	}
	return parts;
}

const UNITS: Record<string, string> = {
	ms: 'ms',
	millisecond: 'ms',
	milliseconds: 'ms',
	s: 's',
	second: 's',
	seconds: 's',
	m: 'm',
	minute: 'm',
	minutes: 'm',
	h: 'h',
	hour: 'h',
	hours: 'h',
	d: 'd',
	day: 'd',
	days: 'd',
	w: 'w',
	week: 'w',
	weeks: 'w',
	M: 'M',
	month: 'M',
	months: 'M',
	Q: 'Q',
	quarter: 'Q',
	quarters: 'Q',
	y: 'y',
	year: 'y',
	years: 'y',
};
const EDGE_UNITS: Record<string, string> = {
	year: 'y',
	years: 'y',
	y: 'y',
	month: 'M',
	months: 'M',
	M: 'M',
	day: 'd',
	days: 'd',
	d: 'd',
	date: 'd',
	dates: 'd',
	D: 'd',
	hour: 'h',
	hours: 'h',
	h: 'h',
	minute: 'm',
	minutes: 'm',
	m: 'm',
	second: 's',
	seconds: 's',
	s: 's',
};

let zoneNames: string[] | undefined;

export function momentZones(): string[] {
	if (zoneNames === undefined) {
		const supportedValuesOf: unknown = Reflect.get(Intl, 'supportedValuesOf');
		const list: unknown =
			typeof supportedValuesOf === 'function' ? supportedValuesOf.call(Intl, 'timeZone') : [];
		zoneNames = Array.isArray(list) ? list.filter((x) => typeof x === 'string') : [];
	}
	return zoneNames;
}

export interface MomentEnv {
	isMoment: (name: ts.Identifier) => boolean;
	visit: (e: ts.Expression) => ts.Expression;
	helper: (name: string, ...args: ts.Expression[]) => ts.CallExpression;
	error: (message: string) => void;
	declared?: (name: string) => ts.FunctionDeclaration | undefined;
}

function bare(e: ts.Expression): ts.Expression {
	let cur = e;
	while (ts.isParenthesizedExpression(cur) || ts.isAsExpression(cur) || ts.isNonNullExpression(cur))
		cur = cur.expression;
	return cur;
}

function text(e: ts.Expression | undefined): string | undefined {
	return e !== undefined && (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e))
		? e.text
		: undefined;
}

const MAX_FORMAT_CHOICES = 8;

function returnedTexts(body: ts.Block): string[] | undefined {
	const texts: string[] = [];
	let literal = true;
	const walk = (n: ts.Node) => {
		if (ts.isFunctionLike(n)) return;
		if (ts.isReturnStatement(n)) {
			const returned = text(n.expression);
			if (returned === undefined) literal = false;
			else if (!texts.includes(returned)) texts.push(returned);
			return;
		}
		ts.forEachChild(n, walk);
	};
	body.statements.forEach(walk);
	const last = body.statements.at(-1);
	if (!literal || !last || !ts.isReturnStatement(last) || texts.length > MAX_FORMAT_CHOICES)
		return undefined;
	return texts;
}

function formatChoices(
	arg: ts.Expression,
	declared: (name: string) => ts.FunctionDeclaration | undefined,
): string[] | undefined {
	const name = bare(arg);
	if (!ts.isIdentifier(name)) return undefined;
	let made: ts.Expression | undefined;
	for (let scope: ts.Node | undefined = name.parent; scope && !made; scope = scope.parent) {
		if (ts.isFunctionLike(scope) && scope.parameters.some((p) => p.name.getText() === name.text))
			return undefined;
		const statements =
			ts.isBlock(scope) || ts.isSourceFile(scope) || ts.isCaseClause(scope) ? scope.statements : [];
		for (const statement of statements) {
			if (!ts.isVariableStatement(statement)) continue;
			for (const declared of statement.declarationList.declarations) {
				if (!ts.isIdentifier(declared.name) || declared.name.text !== name.text) continue;
				if ((statement.declarationList.flags & ts.NodeFlags.Const) === 0) return undefined;
				made = declared.initializer;
			}
		}
	}
	const call = made ? bare(made) : undefined;
	if (!call || !ts.isCallExpression(call) || !ts.isIdentifier(call.expression)) return undefined;
	const declaration = declared(call.expression.text);
	if (!declaration?.body) return undefined;
	return returnedTexts(declaration.body);
}

function plain(args: readonly ts.Expression[]): boolean {
	return args.every((a) => !ts.isSpreadElement(a));
}

function rootOf(e: ts.Expression, env: MomentEnv): boolean {
	const cur = bare(e);
	if (!ts.isCallExpression(cur)) return false;
	const callee = cur.expression;
	if (ts.isIdentifier(callee)) return env.isMoment(callee);
	if (ts.isPropertyAccessExpression(callee)) {
		const target = bare(callee.expression);
		if (ts.isIdentifier(target) && env.isMoment(target)) return true;
		return rootOf(callee.expression, env);
	}
	return false;
}

const CHAIN = new Set(['tz', 'utc', 'add', 'subtract', 'startOf', 'endOf', 'clone']);

function value(e: ts.Expression, env: MomentEnv): ts.Expression | string | undefined {
	const cur = bare(e);
	if (!ts.isCallExpression(cur) || !plain(cur.arguments)) return undefined;
	const callee = cur.expression;
	const args = cur.arguments;
	if (ts.isIdentifier(callee)) {
		if (!env.isMoment(callee)) return undefined;
		if (args.length > 1) return 'a moment from a value and a format';
		return env.helper(
			'__moment',
			args.length === 0 ? f.createIdentifier('undefined') : env.visit(args[0]),
			f.createStringLiteral(''),
		);
	}
	if (!ts.isPropertyAccessExpression(callee)) return undefined;
	const name = callee.name.text;
	const target = bare(callee.expression);
	if (ts.isIdentifier(target) && env.isMoment(target)) {
		if (name === 'utc' && args.length <= 1)
			return env.helper(
				'__moment',
				args.length === 0 ? f.createIdentifier('undefined') : env.visit(args[0]),
				f.createStringLiteral('utc'),
			);
		if (name === 'tz' && args.length === 2)
			return env.helper('__momentIn', env.visit(args[0]), env.visit(args[1]));
		if (name === 'tz' && args.length === 1) return env.helper('__momentNowIn', env.visit(args[0]));
		return `the call 'moment.${name}' with ${args.length} arguments`;
	}
	if (!CHAIN.has(name)) return undefined;
	const receiver = value(callee.expression, env);
	if (receiver === undefined || typeof receiver === 'string') return receiver;
	if (name === 'clone' && args.length === 0) return receiver;
	if (name === 'utc' && args.length === 0)
		return env.helper('__momentUtc', receiver, f.createFalse());
	if (name === 'utc' && args.length === 1 && args[0].kind === ts.SyntaxKind.TrueKeyword)
		return env.helper('__momentUtc', receiver, f.createTrue());
	if (name === 'tz' && args.length === 1)
		return env.helper('__momentTz', receiver, env.visit(args[0]));
	if ((name === 'add' || name === 'subtract') && args.length === 2) {
		const unit = text(args[1]);
		if (unit !== undefined && Object.hasOwn(UNITS, unit))
			return env.helper(
				'__momentAdd',
				receiver,
				env.visit(args[0]),
				f.createStringLiteral(UNITS[unit]),
				name === 'add'
					? f.createNumericLiteral(1)
					: f.createPrefixUnaryExpression(ts.SyntaxKind.MinusToken, f.createNumericLiteral(1)),
			);
	}
	if ((name === 'startOf' || name === 'endOf') && args.length === 1) {
		const unit = text(args[0]);
		if (unit !== undefined && Object.hasOwn(EDGE_UNITS, unit))
			return env.helper(
				'__momentEdge',
				receiver,
				f.createStringLiteral(EDGE_UNITS[unit]),
				name === 'endOf' ? f.createTrue() : f.createFalse(),
			);
	}
	return `the moment method '${name}' with these arguments`;
}

const ORDER: Record<string, number> = { isBefore: -1, isSame: 0, isAfter: 1 };

export function bindMoment(node: ts.Expression, env: MomentEnv): ts.Expression | undefined {
	if (!ts.isCallExpression(node) || !rootOf(node, env)) return undefined;
	const fail = (what: string) => {
		env.error(`${what} has no compiled form`);
		return undefined;
	};
	const callee = node.expression;
	const whole = value(node, env);
	if (typeof whole === 'string') return fail(whole);
	if (whole !== undefined)
		return fail('a moment that is not the start of a call that gives text or a number');
	if (!ts.isPropertyAccessExpression(callee) || !plain(node.arguments)) return undefined;
	const receiver = value(callee.expression, env);
	if (receiver === undefined) return undefined;
	if (typeof receiver === 'string') return fail(receiver);
	const name = callee.name.text;
	const args = node.arguments;
	if (name === 'format' && args.length <= 1) {
		const format = args.length === 0 ? undefined : text(args[0]);
		const choices =
			args.length === 1 && format === undefined
				? formatChoices(args[0], env.declared ?? (() => undefined))
				: undefined;
		if (choices !== undefined) {
			const known: ts.Expression[] = [];
			for (const choice of choices) {
				const parts = momentFormatParts(choice === '' ? undefined : choice);
				if (typeof parts === 'string') return fail(parts);
				known.push(
					f.createArrayLiteralExpression([
						f.createStringLiteral(choice),
						f.createArrayLiteralExpression(parts.map((p) => f.createStringLiteral(p))),
					]),
				);
			}
			return env.helper(
				'__momentFormatOf',
				receiver,
				env.visit(args[0]),
				f.createArrayLiteralExpression(known),
			);
		}
		if (args.length === 1 && format === undefined)
			return fail('a date format that is not a text literal');
		const parts = momentFormatParts(format === '' ? undefined : format);
		if (typeof parts === 'string') return fail(parts);
		return env.helper(
			'__momentFormat',
			receiver,
			f.createArrayLiteralExpression(parts.map((p) => f.createStringLiteral(p))),
		);
	}
	if (args.length === 0) {
		if (name === 'unix') return env.helper('__momentUnix', receiver);
		if (name === 'valueOf') return env.helper('__momentValue', receiver);
		if (name === 'toISOString' || name === 'toJSON') return env.helper('__momentIsoText', receiver);
		if (name === 'isValid') return env.helper('__momentValid', receiver);
	}
	if (Object.hasOwn(ORDER, name) && args.length === 1) {
		const given = value(args[0], env);
		if (typeof given === 'string') return fail(given);
		const other = given ?? env.helper('__moment', env.visit(args[0]), f.createStringLiteral(''));
		const order = ORDER[name];
		return env.helper(
			'__momentOrder',
			receiver,
			other,
			order < 0
				? f.createPrefixUnaryExpression(ts.SyntaxKind.MinusToken, f.createNumericLiteral(1))
				: f.createNumericLiteral(order),
		);
	}
	return fail(`the moment method '${name}' with ${args.length} arguments`);
}

export const MOMENT_ZONE_CHOICE = '__momentZone';
export const MAX_ZONE_CHOICES = 16;

export function momentZoneArgument(node: ts.Node): ts.Expression | undefined {
	if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression)) return undefined;
	const name = node.expression.text;
	return Object.hasOwn(MOMENT_ZONE_HELPERS, name)
		? node.arguments[MOMENT_ZONE_HELPERS[name]]
		: undefined;
}

function zoneChoices(zone: ts.Expression): string[] | undefined {
	if (
		!ts.isCallExpression(zone) ||
		!ts.isIdentifier(zone.expression) ||
		zone.expression.text !== MOMENT_ZONE_CHOICE ||
		zone.arguments.length !== 2
	)
		return undefined;
	const known = zone.arguments[1];
	if (!ts.isArrayLiteralExpression(known) || !known.elements.every(ts.isStringLiteral))
		return undefined;
	return known.elements.map((element) => (ts.isStringLiteral(element) ? element.text : ''));
}

export function momentZoneUse(node: ts.Node): {
	zones?: string[];
	runtime?: boolean;
	error?: string;
} | undefined {
	if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression)) return undefined;
	const name = node.expression.text;
	if (!Object.hasOwn(MOMENT_ZONE_HELPERS, name)) return undefined;
	const zone = node.arguments[MOMENT_ZONE_HELPERS[name]];
	const choices = zone === undefined ? undefined : zoneChoices(zone);
	if (zone === undefined) return { error: 'the time zone of a moment is not known at compile time' };
	if (!ts.isStringLiteral(zone) && choices === undefined)
		return MOMENT_ZONE_RUNTIME.has(name)
			? { runtime: true }
			: { error: 'the time zone of a moment is not known at compile time' };
	const zones = (choices ?? (ts.isStringLiteral(zone) ? [zone.text] : [])).filter(
		(text) => text !== 'UTC',
	);
	for (const text of zones) {
		if (!momentZones().includes(text))
			return { error: `the time zone '${text}' of a moment has no compiled form` };
	}
	return { zones };
}
