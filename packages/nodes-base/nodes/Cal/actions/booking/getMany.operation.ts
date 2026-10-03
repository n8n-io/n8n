import type { IDataObject, INodeProperties } from 'n8n-workflow';

import { returnAllOrLimit } from '@utils/descriptions';
import { updateDisplayOptions } from '@utils/utilities';

import { CAL_API_VERSION, calApiRequestV2AllItems } from '../../GenericFunctions';
import { getLimit, toQuery } from '../helpers';
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
				displayName: 'After Start',
				name: 'afterStart',
				type: 'dateTime',
				default: '',
				description: 'Only return bookings that start after this time',
			},
			{
				displayName: 'Attendee Email',
				name: 'attendeeEmail',
				type: 'string',
				placeholder: 'e.g. jane@example.com',
				default: '',
				description: 'Only return bookings of this attendee',
			},
			{
				displayName: 'Attendee Name',
				name: 'attendeeName',
				type: 'string',
				default: '',
				description: 'Only return bookings of this attendee',
			},
			{
				displayName: 'Before End',
				name: 'beforeEnd',
				type: 'dateTime',
				default: '',
				description: 'Only return bookings that end before this time',
			},
			{
				displayName: 'Event Type ID',
				name: 'eventTypeId',
				type: 'string',
				default: '',
				description: 'Only return bookings of this event type',
			},
			{
				displayName: 'Sort Start',
				name: 'sortStart',
				type: 'options',
				options: [
					{
						name: 'Ascending',
						value: 'asc',
					},
					{
						name: 'Descending',
						value: 'desc',
					},
				],
				default: 'asc',
				description: 'The order of the start time',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Cancelled',
						value: 'cancelled',
					},
					{
						name: 'Past',
						value: 'past',
					},
					{
						name: 'Recurring',
						value: 'recurring',
					},
					{
						name: 'Unconfirmed',
						value: 'unconfirmed',
					},
					{
						name: 'Upcoming',
						value: 'upcoming',
					},
				],
				default: 'upcoming',
				description: 'Only return bookings with this status',
			},
			{
				displayName: 'Team ID',
				name: 'teamId',
				type: 'string',
				default: '',
				description: 'Only return bookings of this team',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['booking'],
		operation: ['getMany'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export const execute: CalOperation = async function (this, itemIndex) {
	const limit = getLimit.call(this, itemIndex);
	const query = toQuery(this.getNodeParameter('filters', itemIndex, {}));

	return await (calApiRequestV2AllItems<IDataObject>).call(
		this,
		'/bookings',
		CAL_API_VERSION.BOOKINGS_LIST,
		query,
		limit,
	);
};
