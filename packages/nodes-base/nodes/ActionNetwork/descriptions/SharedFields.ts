import { INodeProperties } from 'n8n-workflow';

import { Operation, Resource } from '../types';

export const languageOptions: INodeProperties['options'] = [
	{
		name: 'Danish',
		value: 'da',
	},
	{
		name: 'Dutch',
		value: 'nl',
	},
	{
		name: 'English',
		value: 'en',
	},
	{
		name: 'Finnish',
		value: 'fi',
	},
	{
		name: 'French',
		value: 'fr',
	},
	{
		name: 'German',
		value: 'de',
	},
	{
		name: 'Hungarian',
		value: 'hu',
	},
	{
		name: 'Indonesian',
		value: 'id',
	},
	{
		name: 'Japanese',
		value: 'ja',
	},
	{
		name: 'Portuguese - Portugal',
		value: 'pt',
	},
	{
		name: 'Portuguese - Brazil',
		value: 'br',
	},
	{
		name: 'Rumanian',
		value: 'ru',
	},
	{
		name: 'Spanish',
		value: 'es',
	},
	{
		name: 'Swedish',
		value: 'sv',
	},
	{
		name: 'Turkish',
		value: 'tr',
	},
	{
		name: 'Welsh',
		value: 'cy',
	},
];

const postalAddressesFields: INodeProperties[] = [
	{
		displayName: 'Primary',
		name: 'primary',
		type: 'boolean',
		default: false,
		description: "Whether this is the person's primary address",
	},
	{
		displayName: 'Address Line',
		name: 'address_lines',
		type: 'string', // The Action Network API expects a string array but ignores any string beyond the first, so this input field is simplified to string.
		default: '',
		description: "Line for a person's address",
	},
	{
		displayName: 'Locality',
		name: 'locality',
		type: 'string',
		default: '',
		description:
			"City or other local administrative area. If blank, this will be filled in based on Action Network's geocoding.",
	},
	{
		displayName: 'Region',
		name: 'region',
		type: 'string',
		default: '',
		description: 'State or subdivision code per ISO 3166-2',
	},
	{
		displayName: 'Postal Code',
		name: 'postal_code',
		type: 'string',
		default: '',
		description: 'Region specific postal code, such as ZIP code',
	},
	{
		displayName: 'Country',
		name: 'country',
		type: 'string',
		default: '',
		description: 'Country code according to ISO 3166-1 Alpha-2. Defaults to US.',
	},
	{
		displayName: 'Language',
		name: 'language',
		type: 'string',
		default: '',
		description: 'Language in which the address is recorded, per ISO 639',
	},
	{
		displayName: 'Location',
		name: 'location',
		type: 'fixedCollection',
		default: {},
		options: [
			{
				displayName: 'Location Fields',
				name: 'location_fields',
				values: [
					{
						displayName: 'Latitude',
						name: 'latitude',
						type: 'string',
						default: '',
						description: 'Latitude of the location of the address',
					},
					{
						displayName: 'Longitude',
						name: 'longitude',
						type: 'string',
						default: '',
						description: 'Longitude of the location of the address',
					},
				],
			},
		],
	},
];

export const eventAdditionalFieldsOptions: INodeProperties['options'] = [
	{
		displayName: 'Browser URL',
		name: 'browser_url',
		type: 'string',
		default: '',
		description: 'URL to this event’s page on the Action Network or a third party',
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		default: '',
		description: 'Description of the event. HTML supported.',
	},
	{
		displayName: 'End Date',
		name: 'end_date',
		type: 'dateTime',
		default: '',
		description: 'End date and time of the event',
	},
	{
		displayName: 'Featured Image URL',
		name: 'featured_image_url',
		type: 'string',
		default: '',
		description: 'URL to this event’s featured image on the Action Network',
	},
	{
		displayName: 'Instructions',
		name: 'instructions',
		type: 'string',
		default: '',
		description: "Event's instructions for activists, visible after they RSVP. HTML supported.",
	},
	{
		displayName: 'Location',
		name: 'location',
		type: 'fixedCollection',
		default: {},
		placeholder: 'Add Location Field',
		typeOptions: {
			multipleValues: false,
		},
		options: [
			// different name, identical structure
			{
				displayName: 'Postal Addresses Fields',
				name: 'postal_addresses_fields',
				placeholder: 'Add Postal Address Field',
				values: postalAddressesFields,
			},
		],
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		description: 'Internal (not public) title of the event',
	},
	{
		displayName: 'Start Date',
		name: 'start_date',
		type: 'dateTime',
		default: '',
		description: 'Start date and time of the event',
	},
];

export const personAdditionalFieldsOptions: INodeProperties['options'] = [
	{
		displayName: 'Family Name',
		name: 'family_name',
		type: 'string',
		default: '',
		description: 'Person’s last name',
	},
	{
		displayName: 'Given Name',
		name: 'given_name',
		type: 'string',
		default: '',
		description: 'Person’s first name',
	},
	{
		displayName: 'Language Spoken',
		name: 'languages_spoken',
		type: 'options', // Action Network accepts a `string[]` of language codes, but supports only one language per person - sending an array of 2+ languages will result in the first valid language being set as the preferred language for the person. Therefore, the user may select only one option in the n8n UI.
		default: [],
		description: 'Language spoken by the person',
		options: languageOptions,
	},
	{
		displayName: 'Phone Number', // on create, only _one_ must be passed in
		name: 'phone_numbers',
		type: 'fixedCollection',
		default: {},
		placeholder: 'Add Phone Numbers Field',
		options: [
			{
				displayName: 'Phone Numbers Fields',
				name: 'phone_numbers_fields',
				placeholder: 'Add Phone Number Field',
				values: [
					{
						displayName: 'Number',
						name: 'number',
						type: 'string',
						default: '',
						description: "Person's mobile number, in international format without the plus sign",
					},
					{
						displayName: 'Primary',
						name: 'primary',
						type: 'hidden',
						default: true,
						description: "Whether this is the person's primary phone number",
					},
					{
						displayName: 'Status',
						name: 'status',
						type: 'options',
						default: 'subscribed',
						description: 'Subscription status of this number',
						options: [
							{
								name: 'Bouncing',
								value: 'bouncing',
							},
							{
								name: 'Previous Bounce',
								value: 'previous bounce',
							},
							{
								name: 'Subscribed',
								value: 'subscribed',
							},
							{
								name: 'Unsubscribed',
								value: 'unsubscribed',
							},
						],
					},
				],
			},
		],
	},
	{
		displayName: 'Postal Addresses',
		name: 'postal_addresses',
		type: 'fixedCollection',
		default: {},
		placeholder: 'Add Postal Addresses Field',
		typeOptions: {
			multipleValues: true,
		},
		options: [
			{
				displayName: 'Postal Addresses Fields',
				name: 'postal_addresses_fields',
				placeholder: 'Add Postal Address Field',
				values: postalAddressesFields,
			},
		],
	},
];

export const petitionAdditionalFieldsOptions: INodeProperties[] = [
	{
		displayName: 'Browser URL',
		name: 'browser_url',
		type: 'string',
		default: '',
		description: 'URL to this petition’s page on the Action Network or a third party',
	},
	{
		displayName: 'Featured Image URL',
		name: 'featured_image_url',
		type: 'string',
		default: '',
		description: 'URL to this action’s featured image on the Action Network',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		description: 'Internal (not public) title of the petition',
	},
	{
		displayName: 'Petition Text',
		name: 'petition_text',
		type: 'string',
		default: '',
		description: 'Text of the letter to the petition’s target',
	},
	{
		displayName: 'Targets',
		name: 'target',
		type: 'string',
		default: '',
		description: 'Comma-separated names of targets for this petition',
	},
];

export const makeSimpleField = (resource: Resource, operation: Operation): INodeProperties => ({
	displayName: 'Simplify',
	name: 'simple',
	type: 'boolean',
	displayOptions: {
		show: {
			resource: [resource],
			operation: [operation],
		},
	},
	default: true,
	description: 'Whether to return a simplified version of the response instead of the raw data',
});
