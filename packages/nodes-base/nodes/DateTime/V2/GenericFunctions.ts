import { DateTime } from 'luxon';
import moment from 'moment';

export function parseDate(date: string | DateTime, timezone: string) {
	let parsedDate;

	if (date instanceof DateTime) {
		parsedDate = date;
		console.log('here');
	} else {
		parsedDate = DateTime.fromISO(moment.tz(date, timezone).toISOString());
	}
	return parsedDate;
}
