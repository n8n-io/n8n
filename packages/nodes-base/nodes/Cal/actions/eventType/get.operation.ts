import type { IDataObject, INodeProperties } from 'n8n-workflow';
import { toPathSegment } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { CAL_API_VERSION, calApiRequestV2Versioned } from '../../GenericFunctions';
import type { CalApiResponse } from '../../helpers/interfaces';
import { eventTypeRLC } from '../common.descriptions';
import { requireResourceIdNumber } from '../helpers';
import type { CalOperation } from '../router';

const properties: INodeProperties[] = [eventTypeRLC];

const displayOptions = {
	show: {
		resource: ['eventType'],
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export const execute: CalOperation = async function (this, itemIndex) {
	const eventTypeId = requireResourceIdNumber.call(this, 'eventType', itemIndex, 'Event Type');

	const response = await (calApiRequestV2Versioned<CalApiResponse<IDataObject>>).call(
		this,
		'GET',
		`/event-types/${toPathSegment(eventTypeId)}`,
		CAL_API_VERSION.EVENT_TYPES,
	);

	return response.data ?? {};
};
