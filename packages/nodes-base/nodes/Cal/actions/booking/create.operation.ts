import type { IDataObject, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { CAL_API_VERSION, calApiRequestV2Versioned } from '../../GenericFunctions';
import type { CalApiResponse } from '../../helpers/interfaces';
import { eventTypeRLC, timeZoneField } from '../common.descriptions';
import { getString, requireResourceIdNumber, requireString, toKeyValueRecord } from '../helpers';
import type { CalOperation } from '../router';

const properties: INodeProperties[] = [
	eventTypeRLC,
	{
		displayName: 'Start',
		name: 'start',
		type: 'dateTime',
		default: '',
		required: true,
		description: 'The start time of the booking, in UTC',
	},
	{
		displayName: 'Attendee Name',
		name: 'attendeeName',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. Jane Doe',
		description: 'The name of the person that books the event',
	},
	{
		displayName: 'Attendee Email',
		name: 'attendeeEmail',
		type: 'string',
		placeholder: 'e.g. jane@example.com',
		default: '',
		description: 'The email address of the attendee. Cal.com sends the confirmation to it.',
	},
	{
		...timeZoneField,
		displayName: 'Attendee Time Zone',
		name: 'attendeeTimeZone',
		description: 'The IANA time zone of the attendee, for example Europe/Berlin',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Booking Field Responses',
				name: 'bookingFieldsResponses',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {},
				description: 'Answers to the custom booking questions of the event type',
				options: [
					{
						displayName: 'Response',
						name: 'response',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'The slug of the booking field',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'The answer to the booking field',
							},
						],
					},
				],
			},
			{
				displayName: 'Guests',
				name: 'guests',
				type: 'string',
				default: '',
				placeholder: 'e.g. john@example.com, jane@example.com',
				description: 'Email addresses of more guests, separated by commas',
			},
			{
				displayName: 'Instant',
				name: 'instant',
				type: 'boolean',
				default: false,
				description: 'Whether to book the event as an instant meeting. Team event types only.',
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'string',
				default: '',
				placeholder: 'e.g. en',
				description: 'The preferred language of the attendee, as a two-letter code',
			},
			{
				displayName: 'Length (Minutes)',
				name: 'lengthInMinutes',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 30,
				description:
					'The duration of the booking. The event type must allow this length. Defaults to its standard length.',
			},
			{
				displayName: 'Metadata',
				name: 'metadata',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {},
				description: 'Custom key-value pairs to store with the booking, at most 50 pairs',
				options: [
					{
						displayName: 'Metadata',
						name: 'metadata',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'The key, at most 40 characters',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'The value, at most 500 characters',
							},
						],
					},
				],
			},
			{
				displayName: 'Phone Number',
				name: 'phoneNumber',
				type: 'string',
				default: '',
				placeholder: 'e.g. +4915112345678',
				description: 'The phone number of the attendee',
			},
			{
				displayName: 'Recurrence Count',
				name: 'recurrenceCount',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 32 },
				default: 1,
				description:
					'How many times a recurring event type repeats. It must not be more than the limit of the event type.',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['booking'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export const execute: CalOperation = async function (this, itemIndex) {
	const eventTypeId = requireResourceIdNumber.call(this, 'eventType', itemIndex, 'Event Type');
	const start = requireString.call(this, 'start', itemIndex, 'Start');
	const attendeeName = requireString.call(this, 'attendeeName', itemIndex, 'Attendee Name');
	const attendeeEmail = getString.call(this, 'attendeeEmail', itemIndex);
	const attendeeTimeZone = requireString.call(
		this,
		'attendeeTimeZone',
		itemIndex,
		'Attendee Time Zone',
	);
	const additionalFields = this.getNodeParameter('additionalFields', itemIndex, {});

	const attendee: IDataObject = { name: attendeeName, timeZone: attendeeTimeZone };
	if (attendeeEmail) attendee.email = attendeeEmail;
	if (typeof additionalFields.phoneNumber === 'string' && additionalFields.phoneNumber) {
		attendee.phoneNumber = additionalFields.phoneNumber;
	}
	if (typeof additionalFields.language === 'string' && additionalFields.language) {
		attendee.language = additionalFields.language;
	}

	const body: IDataObject = { eventTypeId, start, attendee };

	if (typeof additionalFields.guests === 'string' && additionalFields.guests) {
		body.guests = additionalFields.guests
			.split(',')
			.map((guest) => guest.trim())
			.filter((guest) => guest !== '');
	}
	if (additionalFields.instant === true) body.instant = true;
	if (typeof additionalFields.lengthInMinutes === 'number') {
		body.lengthInMinutes = additionalFields.lengthInMinutes;
	}
	if (typeof additionalFields.recurrenceCount === 'number') {
		body.recurrenceCount = additionalFields.recurrenceCount;
	}

	const metadata = toKeyValueRecord(additionalFields.metadata, 'metadata');
	if (metadata !== undefined) body.metadata = metadata;

	const bookingFieldsResponses = toKeyValueRecord(
		additionalFields.bookingFieldsResponses,
		'response',
	);
	if (bookingFieldsResponses !== undefined) body.bookingFieldsResponses = bookingFieldsResponses;

	// A recurring booking answers with one entry for each occurrence.
	const response = await (calApiRequestV2Versioned<
		CalApiResponse<IDataObject | IDataObject[]>
	>).call(this, 'POST', '/bookings', CAL_API_VERSION.BOOKINGS_WRITE, body);

	return response.data ?? {};
};
