import type { IDataObject, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { CAL_API_VERSION, calApiRequestV2Versioned } from '../../GenericFunctions';
import type { CalApiResponse, CalSlotsByDate } from '../../helpers/interfaces';
import { eventTypeRLC } from '../common.descriptions';
import { requireResourceIdNumber, requireString } from '../helpers';
import type { CalOperation } from '../router';

const properties: INodeProperties[] = [
	eventTypeRLC,
	{
		displayName: 'Start',
		name: 'start',
		type: 'dateTime',
		default: '',
		required: true,
		description: 'The start of the range to search, in UTC',
	},
	{
		displayName: 'End',
		name: 'end',
		type: 'dateTime',
		default: '',
		required: true,
		description: 'The end of the range to search, in UTC',
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Booking UID to Reschedule',
				name: 'bookingUidToReschedule',
				type: 'string',
				default: '',
				description: 'The booking to move. Cal.com then also offers its current slot.',
			},
			{
				displayName: 'Duration (Minutes)',
				name: 'duration',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 30,
				description: 'The slot length to search for. The event type must allow it.',
			},
			{
				displayName: 'Time Zone',
				name: 'timeZone',
				type: 'string',
				default: '',
				placeholder: 'e.g. Europe/Berlin',
				description: 'The IANA time zone of the returned times. Defaults to UTC.',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['slot'],
		operation: ['getMany'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

/** `GET /v2/slots` groups its slots by date, so one item for each slot needs the date folded in. */
function flattenSlots(data: CalSlotsByDate): IDataObject[] {
	const slots: IDataObject[] = [];
	for (const [date, entries] of Object.entries(data)) {
		if (!Array.isArray(entries)) continue;
		for (const entry of entries) {
			slots.push({ date, ...entry });
		}
	}
	return slots;
}

export const execute: CalOperation = async function (this, itemIndex) {
	const eventTypeId = requireResourceIdNumber.call(this, 'eventType', itemIndex, 'Event Type');
	const start = requireString.call(this, 'start', itemIndex, 'Start');
	const end = requireString.call(this, 'end', itemIndex, 'End');
	const simple = this.getNodeParameter('simple', itemIndex, true);
	const options = this.getNodeParameter('options', itemIndex, {});

	const query: IDataObject = { eventTypeId, start, end };
	if (typeof options.timeZone === 'string' && options.timeZone) query.timeZone = options.timeZone;
	if (typeof options.duration === 'number') query.duration = options.duration;
	if (typeof options.bookingUidToReschedule === 'string' && options.bookingUidToReschedule) {
		query.bookingUidToReschedule = options.bookingUidToReschedule;
	}

	const response = await (calApiRequestV2Versioned<CalApiResponse<CalSlotsByDate>>).call(
		this,
		'GET',
		'/slots',
		CAL_API_VERSION.SLOTS,
		{},
		query,
	);

	const data = response.data ?? {};
	return simple === true ? flattenSlots(data) : data;
};
