import type { IDataObject, INodeProperties } from 'n8n-workflow';
import { toPathSegment } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { CAL_API_VERSION, calApiRequestV2Versioned } from '../../GenericFunctions';
import type { CalApiResponse } from '../../helpers/interfaces';
import { bookingUidField } from '../common.descriptions';
import { requireString } from '../helpers';
import type { CalOperation } from '../router';

const properties: INodeProperties[] = [bookingUidField];

const displayOptions = {
	show: {
		resource: ['booking'],
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export const execute: CalOperation = async function (this, itemIndex) {
	const bookingUid = requireString.call(this, 'bookingUid', itemIndex, 'Booking UID');

	const response = await (calApiRequestV2Versioned<CalApiResponse<IDataObject>>).call(
		this,
		'GET',
		`/bookings/${toPathSegment(bookingUid)}`,
		CAL_API_VERSION.BOOKINGS_WRITE,
	);

	return response.data ?? {};
};
