import { DateTime } from 'luxon';
import { NodeOperationError } from 'n8n-workflow';
import type { IExecuteFunctions } from 'n8n-workflow';

/**
 * Parses a date input into a Luxon DateTime object.
 * Handles various formats including timestamps (seconds/milliseconds), native Date objects,
 * ISO strings, and custom formats, with robust timezone support.
 *
 * @param date The date to parse (string, number, Date, or DateTime object).
 * @param options Configuration for parsing, like timezone or a specific format.
 * @returns A Luxon DateTime object.
 * @throws An error if the date format is invalid or the type is unsupported.
 */
export function parseDate(
	this: IExecuteFunctions,
	date: string | number | Date | DateTime,
	options: Partial<{ timezone: string; fromFormat: string }> = {},
): DateTime {
	// Prioritize the user-provided timezone, but fall back to the workflow's default timezone.
	const tz = options.timezone ?? this.getTimezone();

	if (date === null || date === undefined) {
		throw new NodeOperationError(this.getNode(), 'Invalid date type');
	}

	let parsedDate: DateTime;

	// Luxon DateTime
	if (date instanceof DateTime) {
		parsedDate = tz ? date.setZone(tz) : date;
	}
	// Native Date
	else if (date instanceof Date) {
		// Default to UTC for native Date objects if no timezone is specified to ensure consistent behavior.
		parsedDate = DateTime.fromJSDate(date, tz ? { zone: tz } : { zone: 'utc' });
	}
	// Number / numeric string (timestamp)
	// Treat input as a timestamp only if it's a number or a non-empty string containing digits without a custom format.
	else if (
		typeof date === 'number' ||
		(typeof date === 'string' && /\d/.test(date) && !options.fromFormat && !isNaN(Number(date)))
	) {
		const ts = Number(date);
		if (!Number.isFinite(ts)) {
			throw new NodeOperationError(this.getNode(), 'Invalid numeric timestamp');
		}

		// Differentiate between seconds and milliseconds. Timestamps in seconds will have
		// at most 10 digits until the year 2286.
		if (ts < 1e10) {
			// seconds
			parsedDate = DateTime.fromSeconds(ts, tz ? { zone: tz } : { zone: 'utc' });
		} else {
			// milliseconds
			parsedDate = DateTime.fromMillis(ts, tz ? { zone: tz } : { zone: 'utc' });
		}
	}
	// String input
	else if (typeof date === 'string') {
		const dateStr = date.trim();
		if (!dateStr) throw new NodeOperationError(this.getNode(), 'Empty date string');

		try {
			// Custom format
			if (options.fromFormat) {
				parsedDate = DateTime.fromFormat(dateStr, options.fromFormat, {
					zone: tz ? tz : 'utc',
					setZone: true,
				});
			} else if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
				parsedDate = DateTime.fromISO(dateStr, { zone: tz ? tz : 'utc' }).startOf('day');
			}
			// General ISO string
			else {
				parsedDate = DateTime.fromISO(dateStr, { zone: tz ? tz : 'utc' });
				if (!parsedDate.isValid) throw new Error('Invalid ISO string');
			}
		} catch {
			throw new NodeOperationError(this.getNode(), 'Invalid date format');
		}
	}
	// Invalid type
	else {
		throw new NodeOperationError(this.getNode(), 'Invalid date type');
	}

	if (!parsedDate.isValid) {
		throw new NodeOperationError(
			this.getNode(),
			parsedDate.invalidExplanation || 'Invalid date format',
		);
	}

	return parsedDate;
}
