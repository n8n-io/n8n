import { DateTime } from 'luxon';
import moment from 'moment';
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export function parseDate(this: IExecuteFunctions, date: string | DateTime, timezone?: string) {
	let parsedDate;

	if (date instanceof DateTime) {
		parsedDate = date;
	} else {
		if (!timezone && date.includes('+')) {
			const offset = date.split('+')[1].slice(0, 2) as unknown as number;
			timezone = `Etc/GMT-${offset * 1}`;
		} else {
			timezone = timezone || 'Etc/UTC';
		}
		parsedDate = DateTime.fromISO(moment(date).toISOString()).setZone(timezone);
		if (parsedDate.invalidReason === 'unparsable') {
			throw new NodeOperationError(this.getNode(), 'Invalid date format');
		}
	}
	return parsedDate;
}
