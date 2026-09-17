import type { IDataObject, INodeProperties } from 'n8n-workflow';

import { returnAllOrLimit } from '@utils/descriptions';
import { updateDisplayOptions } from '@utils/utilities';

import { CAL_API_VERSION, calApiRequestV2Versioned } from '../../GenericFunctions';
import type { CalApiResponse } from '../../helpers/interfaces';
import { getLimit } from '../helpers';
import type { CalOperation } from '../router';

const properties: INodeProperties[] = [
	...returnAllOrLimit,
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		options: [
			{
				displayName: 'Event Slug',
				name: 'eventSlug',
				type: 'string',
				default: '',
				description: 'Only return the event type with this slug. It needs a username.',
			},
			{
				displayName: 'Username',
				name: 'username',
				type: 'string',
				default: '',
				description: 'Only return the event types of this user',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['eventType'],
		operation: ['getMany'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export const execute: CalOperation = async function (this, itemIndex) {
	const limit = getLimit.call(this, itemIndex);
	const filters = this.getNodeParameter('filters', itemIndex, {});

	const query: IDataObject = {};
	for (const [name, value] of Object.entries(filters)) {
		if (value !== undefined && value !== '') query[name] = value;
	}

	// The endpoint answers with every event type at once, so the limit applies here.
	const response = await (calApiRequestV2Versioned<CalApiResponse<IDataObject[]>>).call(
		this,
		'GET',
		'/event-types',
		CAL_API_VERSION.EVENT_TYPES,
		{},
		query,
	);

	const eventTypes = Array.isArray(response.data) ? response.data : [];
	return eventTypes.length > limit ? eventTypes.slice(0, limit) : eventTypes;
};
