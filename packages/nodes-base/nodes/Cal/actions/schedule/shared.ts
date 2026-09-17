import { isRecord } from '@n8n/utils/is-record';
import type { IDataObject, INodeProperties } from 'n8n-workflow';

const dayOptions = [
	{ name: 'Monday', value: 'Monday' },
	{ name: 'Tuesday', value: 'Tuesday' },
	{ name: 'Wednesday', value: 'Wednesday' },
	{ name: 'Thursday', value: 'Thursday' },
	{ name: 'Friday', value: 'Friday' },
	{ name: 'Saturday', value: 'Saturday' },
	{ name: 'Sunday', value: 'Sunday' },
];

export const availabilityField: INodeProperties = {
	displayName: 'Availability',
	name: 'availability',
	type: 'fixedCollection',
	typeOptions: { multipleValues: true },
	placeholder: 'Add Availability',
	default: {},
	description:
		'The weekly working hours. Cal.com uses Monday to Friday, 09:00 to 17:00 when you add none.',
	options: [
		{
			displayName: 'Availability',
			name: 'rule',
			values: [
				{
					// eslint-disable-next-line n8n-nodes-base/node-param-multi-options-type-unsorted-items -- weekdays read better in calendar order
					displayName: 'Days',
					name: 'days',
					type: 'multiOptions',
					options: dayOptions,
					default: [],
					description: 'The days that these hours apply to',
				},
				{
					displayName: 'Start Time',
					name: 'startTime',
					type: 'string',
					default: '09:00',
					placeholder: 'e.g. 09:00',
					description: 'The start of the working hours, as HH:MM',
				},
				{
					displayName: 'End Time',
					name: 'endTime',
					type: 'string',
					default: '17:00',
					placeholder: 'e.g. 17:00',
					description: 'The end of the working hours, as HH:MM',
				},
			],
		},
	],
};

export const overridesField: INodeProperties = {
	displayName: 'Date Overrides',
	name: 'overrides',
	type: 'fixedCollection',
	typeOptions: { multipleValues: true },
	placeholder: 'Add Date Override',
	default: {},
	description: 'Hours for single dates that differ from the weekly availability',
	options: [
		{
			displayName: 'Override',
			name: 'override',
			values: [
				{
					displayName: 'Date',
					name: 'date',
					type: 'string',
					default: '',
					placeholder: 'e.g. 2026-12-24',
					description: 'The date to override, as YYYY-MM-DD',
				},
				{
					displayName: 'Start Time',
					name: 'startTime',
					type: 'string',
					default: '09:00',
					placeholder: 'e.g. 09:00',
					description: 'The start of the working hours, as HH:MM',
				},
				{
					displayName: 'End Time',
					name: 'endTime',
					type: 'string',
					default: '17:00',
					placeholder: 'e.g. 17:00',
					description: 'The end of the working hours, as HH:MM',
				},
			],
		},
	],
};

function collectionEntries(value: unknown, name: string): Array<Record<string, unknown>> {
	if (!isRecord(value)) return [];
	const entries = value[name];
	return Array.isArray(entries) ? entries.filter(isRecord) : [];
}

function timeOf(value: unknown, fallback: string): string {
	return typeof value === 'string' && value !== '' ? value : fallback;
}

export function toAvailability(value: unknown): IDataObject[] | undefined {
	const availability: IDataObject[] = [];

	for (const entry of collectionEntries(value, 'rule')) {
		const days = Array.isArray(entry.days)
			? entry.days.filter((day): day is string => typeof day === 'string')
			: [];
		if (days.length === 0) continue;

		availability.push({
			days,
			startTime: timeOf(entry.startTime, '09:00'),
			endTime: timeOf(entry.endTime, '17:00'),
		});
	}

	return availability.length > 0 ? availability : undefined;
}

export function toOverrides(value: unknown): IDataObject[] | undefined {
	const overrides: IDataObject[] = [];

	for (const entry of collectionEntries(value, 'override')) {
		if (typeof entry.date !== 'string' || entry.date === '') continue;

		overrides.push({
			date: entry.date,
			startTime: timeOf(entry.startTime, '09:00'),
			endTime: timeOf(entry.endTime, '17:00'),
		});
	}

	return overrides.length > 0 ? overrides : undefined;
}
