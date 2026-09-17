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
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Cancel Subsequent Bookings',
				name: 'cancelSubsequentBookings',
				type: 'boolean',
				default: false,
				description:
					'Whether to also cancel the later bookings of a recurring event. It applies to recurring bookings only.',
			},
			{
				displayName: 'Cancellation Reason',
				name: 'cancellationReason',
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
					'The seat to cancel. Cal.com needs it for a booking of a seated event type, and ignores it otherwise.',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['booking'],
		operation: ['cancel'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export const execute: CalOperation = async function (this, itemIndex) {
	const bookingUid = requireString.call(this, 'bookingUid', itemIndex, 'Booking UID');
	const options = this.getNodeParameter('options', itemIndex, {});

	const body: IDataObject = {};
	if (typeof options.cancellationReason === 'string' && options.cancellationReason) {
		body.cancellationReason = options.cancellationReason;
	}
	if (options.cancelSubsequentBookings === true) body.cancelSubsequentBookings = true;
	if (typeof options.seatUid === 'string' && options.seatUid) body.seatUid = options.seatUid;

	const response = await (calApiRequestV2Versioned<CalApiResponse<IDataObject>>).call(
		this,
		'POST',
		`/bookings/${toPathSegment(bookingUid)}/cancel`,
		CAL_API_VERSION.BOOKINGS_WRITE,
		body,
	);

	return response.data ?? {};
};
