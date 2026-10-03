import type { IDataObject, INodeProperties } from 'n8n-workflow';
import { toPathSegment } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { CAL_API_VERSION, calApiRequestV2Versioned } from '../../GenericFunctions';
import type { CalApiResponse } from '../../helpers/interfaces';
import { bookingUidField } from '../common.descriptions';
import { requireString } from '../helpers';
import type { CalOperation } from '../router';

const properties: INodeProperties[] = [
	bookingUidField,
	{
		displayName: 'Start',
		name: 'start',
		type: 'dateTime',
		default: '',
		required: true,
		description: 'The new start time of the booking, in UTC',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Rescheduled By',
				name: 'rescheduledBy',
				type: 'string',
				placeholder: 'e.g. jane@example.com',
				default: '',
				description:
					'The email address of the person that reschedules. Cal.com confirms the booking at once when it is the host.',
			},
			{
				displayName: 'Rescheduling Reason',
				name: 'reschedulingReason',
				type: 'string',
				default: '',
				description: 'The reason that Cal.com shows to the attendee',
			},
			{
				displayName: 'Seat UID',
				name: 'seatUid',
				type: 'string',
				default: '',
				description:
					'The seat to move. Cal.com needs it for a booking of a seated event type, and ignores it otherwise.',
			},
			{
				displayName: 'Use Same Host',
				name: 'rescheduleWithSameHost',
				type: 'boolean',
				default: false,
				description: 'Whether to keep the current host instead of reassigning the booking',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['booking'],
		operation: ['reschedule'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export const execute: CalOperation = async function (this, itemIndex) {
	const bookingUid = requireString.call(this, 'bookingUid', itemIndex, 'Booking UID');
	const start = requireString.call(this, 'start', itemIndex, 'Start');
	const options = this.getNodeParameter('options', itemIndex, {});

	const body: IDataObject = { start };
	if (typeof options.reschedulingReason === 'string' && options.reschedulingReason) {
		body.reschedulingReason = options.reschedulingReason;
	}
	if (typeof options.rescheduledBy === 'string' && options.rescheduledBy) {
		body.rescheduledBy = options.rescheduledBy;
	}
	if (options.rescheduleWithSameHost === true) body.rescheduleWithSameHost = true;
	if (typeof options.seatUid === 'string' && options.seatUid) body.seatUid = options.seatUid;

	const response = await (calApiRequestV2Versioned<CalApiResponse<IDataObject>>).call(
		this,
		'POST',
		`/bookings/${toPathSegment(bookingUid)}/reschedule`,
		CAL_API_VERSION.BOOKINGS_WRITE,
		body,
	);

	return response.data ?? {};
};
