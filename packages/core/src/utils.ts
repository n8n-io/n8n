import { DateTime } from 'luxon';

export function toUtcDate(datetime: Date, tz: string) {
	return DateTime.fromISO(datetime.toISOString().slice(0, -1), { zone: tz }).toUTC().toJSDate();
}
