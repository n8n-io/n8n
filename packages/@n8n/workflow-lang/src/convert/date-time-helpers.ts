/**
 * Helpers of the Date & Time node (version 2) for a date that is no Luxon DateTime: text or
 * a number (`date-time.ts`). They copy `parseDate` of the v1 node
 * (`nodes/DateTime/V2/GenericFunctions.ts`):
 *
 * - a number, or text that is a number, is a time in seconds (less than 12 characters) or in
 *   milliseconds; a number with a fraction is a time in seconds;
 * - other text goes through the date parser of moment.js (`moment(text)`), which is the
 *   parser of the node compiler (`node-compile/moment.ts`);
 * - the date gets the time zone that v1 gives it. Without one, v1 takes the two characters
 *   after the first "+" of the text as hours east of UTC, or UTC.
 *
 * A value without an exact form ends with the mark of `RUNS_IN_HOST`: the node has a
 * fallback-host form after its code, and the host runs the v1 node. The node sends no
 * request, so a second run changes nothing.
 */
import { MOMENT_HELPER_USES, MOMENT_HELPERS } from '../node-compile/moment.ts';

interface HelperSource {
	uses: string[];
	source: string;
}

/** The parser of moment.js and the helpers that it calls. */
const MOMENT_PARSE = ['__momentParse', ...MOMENT_HELPER_USES.__momentParse];

/**
 * The time values of the years 1 and 9999, one day inside: each date between them has a year
 * of four digits in each time zone.
 */
const FIRST = -62135510400000;
const LAST = 253402214400000;

/** The helpers. `mark` is the end of an error that hands the node over to the host. */
export function dateTimeHelpers(mark: string): Record<string, HelperSource> {
	const helpers: Record<string, HelperSource> = {};
	for (const name of new Set(MOMENT_PARSE)) {
		helpers[name] = {
			uses: MOMENT_HELPER_USES[name] ?? [],
			source: MOMENT_HELPERS[name].replace(/: any\b/g, ': Json'),
		};
	}
	const host = JSON.stringify(` ${mark}`);
	helpers.dateTimeOfValue = {
		uses: ['luxOf', 'dateTimeInZone', '__momentParse', '__momentIso'],
		source: `/**
 * The DateTime that the Date & Time node (version 2) makes from a value that is no DateTime
 * (\`parseDate\` of v1). \`zone\` is the zone that v1 gives to the date, or '' when v1 has
 * none. \`localUtc\` is true when local time of the n8n process is UTC: moment.js reads text
 * without an offset as local time. A value without an exact form goes to the fallback host.
 */
function dateTimeOfValue(value: Json, zone: string, localUtc: boolean): Json {
	const given: Json = value === null ? 0 : value;
	if (typeof given !== 'number' && typeof given !== 'string') {
		throw new Error('The date is not text and not a number.' + ${host});
	}
	let n = Number(given);
	if (!isNaN(n)) {
		if (!Number.isInteger(n)) n = n * 1000;
		if (!Number.isInteger(n) || Math.abs(n) > 100000000000000) {
			throw new Error('The date is a number without an exact form.' + ${host});
		}
		const ts = String(n).length < 12 ? n * 1000 : n;
		if (ts < ${FIRST} || ts > ${LAST}) {
			throw new Error('The date is not in the years 1 to 9999.' + ${host});
		}
		return dateTimeInZone(luxOf(ts, zone === '' ? 'UTC' : zone));
	}
	if (typeof given !== 'string') throw new Error('The date is not a number.' + ${host});
	// v1 without a zone: the two characters after the first "+" are the hours of \`Etc/GMT-<hours>\`.
	let to = zone;
	if (to === '') {
		to = 'UTC';
		if (given.includes('+')) {
			const hours = Number(given.split('+')[1].slice(0, 2));
			to = !Number.isInteger(hours) || hours < 0 || hours > 14 ? '' : hours === 0 ? 'UTC' : 'fixed:' + String(hours * 60);
		}
	}
	let ms = NaN;
	try {
		const parts: Json = __momentIso(given);
		if (!localUtc && (parts === null || parts[7] === null)) {
			throw new Error('The date has no offset, and local time of n8n is not UTC: the text has no compiled form');
		}
		ms = __momentParse(given, '');
	} catch (error) {
		throw new Error(String(error.message) + ${host});
	}
	// A zone that Luxon does not know gives an invalid DateTime. Text that is no date fails the node.
	if (to === '') return luxOf(NaN, 'system', 'unsupported zone');
	if (isNaN(ms)) throw new Error('Invalid date format');
	if (ms < ${FIRST} || ms > ${LAST}) {
		throw new Error('The date is not in the years 1 to 9999.' + ${host});
	}
	return dateTimeInZone(luxOf(ms, to));
}`,
	};
	helpers.dateTimeInZone = {
		uses: [],
		source: `/**
 * A DateTime of the Date & Time node, when the zone data of the runtime is the zone data of
 * n8n for it: a date in UTC or at a fixed offset, or a date from 1970 in a named zone.
 * Before 1970 the offsets of a named zone differ between sets of zone data, and some have
 * seconds. Each other date goes to the fallback host.
 */
function dateTimeInZone(dt: Json): Json {
	if (dt.invalid !== null || dt.zone === 'UTC' || dt.zone.startsWith('fixed:')) return dt;
	if (dt.ts < 0 || dt.ts > ${LAST}) {
		throw new Error('The date is before 1970 in a time zone.' + ${host});
	}
	return dt;
}`,
	};
	helpers.dateTimeFormatted = {
		uses: ['dateTimeOfValue', 'luxFormat'],
		source: `/** "Format a Date" of the Date & Time node: v1 gives null for a date that is null. */
function dateTimeFormatted(value: Json, zone: string, localUtc: boolean, format: string): Json {
	if (value === null) return null;
	return luxFormat(dateTimeOfValue(value, zone, localUtc), format);
}`,
	};
	helpers.dateTimeAmount = {
		uses: [],
		source: `/**
 * The amount of "Add to a Date" and "Subtract From a Date": a number, or text that is a
 * number, as Luxon reads it. Each other value goes to the fallback host.
 */
function dateTimeAmount(value: Json): number {
	const amount = typeof value === 'number' || (typeof value === 'string' && value !== '') ? Number(value) : NaN;
	if (isNaN(amount) || amount === Infinity || amount === -Infinity) {
		throw new Error('The amount is not a number.' + ${host});
	}
	return amount;
}`,
	};
	return helpers;
}
