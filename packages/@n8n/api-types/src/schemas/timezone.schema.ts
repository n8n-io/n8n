import { z } from 'zod';

export const isValidTimeZone = (tz: string): boolean => {
	try {
		// Throws if invalid timezone
		new Intl.DateTimeFormat('en-US', { timeZone: tz });
		return true;
	} catch {
		return false;
	}
};

export const StrictTimeZoneSchema = z
	.string()
	.min(1)
	.max(50)
	.regex(/^[A-Za-z0-9_/+-]+$/)
	.refine(isValidTimeZone, {
		message: 'Unknown or invalid time zone',
	});

export const TimeZoneSchema = StrictTimeZoneSchema.optional().catch(undefined);
