import type { INodeProperties } from 'n8n-workflow';

export const eventTypeRLC: INodeProperties = {
	displayName: 'Event Type',
	name: 'eventType',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	description: 'The event type to use',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'searchEventTypes',
				searchable: true,
			},
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 1234',
		},
	],
};

export const scheduleRLC: INodeProperties = {
	displayName: 'Schedule',
	name: 'schedule',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	description: 'The schedule to use',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'searchSchedules',
				searchable: true,
			},
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 1234',
		},
	],
};

export const bookingUidField: INodeProperties = {
	displayName: 'Booking UID',
	name: 'bookingUid',
	type: 'string',
	default: '',
	required: true,
	placeholder: 'e.g. bkg_2k3j4h5g6f',
	description: 'The UID of the booking, as returned by Create or Get Many',
};

export const timeZoneField: INodeProperties = {
	displayName: 'Time Zone',
	name: 'timeZone',
	type: 'string',
	default: 'UTC',
	required: true,
	placeholder: 'e.g. Europe/Berlin',
	description: 'An IANA time zone name',
};
