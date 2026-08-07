import { DateTime } from 'luxon';
import moment from 'moment-timezone';
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export function parseDate(
	this: IExecuteFunctions,
	date: string | number | DateTime,
	options: Partial<{
		timezone: string;
		fromFormat: string;
	}> = {},
): DateTime {
	const timezone = options.timezone ?? 'Etc/UTC';

	// Luxon DateTime instance — e.g. produced by $now, $today, or a previous DateTime node.
	// Examples: DateTime.now(), DateTime.fromISO('2023-04-11T14:30:00+05:00')
	if (date instanceof DateTime) {
		return date.setZone(timezone);
	}

	// Numeric Unix timestamp in seconds or milliseconds.
	// Examples: 1681226400 (seconds), 1681226400000 (ms), 1681226400.5 (fractional seconds)
	if (!Number.isNaN(Number(date)) && !options.fromFormat) {
		const ts = Number(date);
		const tsMs = Number.isInteger(ts) ? ts : ts * 1000; // fractional seconds → milliseconds
		const parsedDate =
			tsMs.toString().length < 12 ? DateTime.fromSeconds(tsMs) : DateTime.fromMillis(tsMs);
		return parsedDate.setZone(timezone);
	}

	const dateStr = date as string;

	// User-supplied Luxon format token string.
	// Examples: '06/08/2014 10:00' with fromFormat 'd/M/yyyy H:mm'
	//           '11 Apr 2023'       with fromFormat 'dd LLL yyyy'
	if (options.fromFormat) {
		const parsedDate = DateTime.fromFormat(dateStr, options.fromFormat);
		if (parsedDate.invalidReason === 'unparsable') {
			throw new NodeOperationError(this.getNode(), 'Invalid date format');
		}
		return parsedDate.setZone(timezone);
	}

	// ISO string with an explicit timezone offset: the instant is unambiguous,
	// so preserve it and convert to the target zone.
	// Examples: '2023-04-11T14:30:00+05:00', '2023-04-11T14:30:00+0500', '2023-04-11T14:30:00+05',
	//           '2023-04-11T14:30:00-03:00', '2023-04-11T14:30:00Z'
	// We check the string directly rather than inspecting the parsed zone type,
	// because n8n sets Luxon's Settings.defaultZone to the workflow timezone globally,
	// which causes naive ISO strings to get zone.type === 'iana' instead of 'local'.
	const hasExplicitOffset = /T.*(?:Z|[+-]\d{2}(?::?\d{2})?)$/.test(dateStr.trim());
	const isoDate = DateTime.fromISO(dateStr);
	if (hasExplicitOffset && isoDate.isValid) {
		return isoDate.setZone(timezone);
	}

	// Non-ISO or naive date string (no timezone offset): use moment to parse the
	// wall-clock time, then stamp it into the target timezone directly so the hour
	// is not shifted by the server's system timezone.
	// Examples: '2023-04-11T14:30:00'       (ISO with T, no offset)
	//           '2023-04-11 14:30:00'        (space-separated)
	//           '2014-08-06 10:00:00 AM'     (AM/PM)
	//           'April 11, 2023 2:30 PM'     (natural language)
	//           '11 April 2023 14:30'        (D Month YYYY)
	//           '2023-04-11'                 (date only)
	const momentDate = moment(dateStr);
	if (!momentDate.isValid()) {
		throw new NodeOperationError(this.getNode(), 'Invalid date format');
	}
	const wallClock = momentDate.format('YYYY-MM-DDTHH:mm:ss.SSS');
	return DateTime.fromISO(wallClock, { zone: timezone });
}
