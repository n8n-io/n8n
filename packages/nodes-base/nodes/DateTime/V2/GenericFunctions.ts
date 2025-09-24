import { DateTime } from 'luxon';
import { NodeOperationError } from 'n8n-workflow';
import type { IExecuteFunctions } from 'n8n-workflow';

export function parseDate(
	this: IExecuteFunctions,
	date: string | number | Date | DateTime,
	options: Partial<{ timezone: string; fromFormat: string }> = {},
): DateTime {
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
		parsedDate = DateTime.fromJSDate(date, tz ? { zone: tz } : { zone: 'utc' });
	}
	// Number / numeric string (timestamp)
	else if (typeof date === 'number' || (!isNaN(Number(date)) && !options.fromFormat)) {
		const ts = Number(date);
		if (!Number.isFinite(ts)) {
			throw new NodeOperationError(this.getNode(), 'Invalid numeric timestamp');
		}
		if (ts < 1e10) {
			// seconds (less than 10 billion)
			parsedDate = DateTime.fromSeconds(ts, tz ? { zone: tz } : { zone: 'utc' });
		} else {
			// milliseconds (10 billion or more)
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
			}
			// YYYY-MM-DD (date only)
			else if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
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
