/* eslint-disable @typescript-eslint/naming-convention -- item keys are pinned to the legacy ScheduleTrigger emit shape */
import {
	buildScheduleTriggerItem,
	isScheduleTriggerTaskPayload,
	scheduleTriggerDeduplicationKey,
} from '../schedule-trigger-task';

describe('isScheduleTriggerTaskPayload', () => {
	test('accepts a payload with workflowId and nodeId', () => {
		expect(isScheduleTriggerTaskPayload({ workflowId: 'wf-1', nodeId: 'node-1' })).toBe(true);
	});

	test.each([
		['empty payload', {}],
		['missing nodeId', { workflowId: 'wf-1' }],
		['missing workflowId', { nodeId: 'node-1' }],
		['empty workflowId', { workflowId: '', nodeId: 'node-1' }],
		['empty nodeId', { workflowId: 'wf-1', nodeId: '' }],
		['non-string ids', { workflowId: 42, nodeId: true }],
	])('rejects %s', (_name, payload) => {
		expect(isScheduleTriggerTaskPayload(payload)).toBe(false);
	});
});

describe('scheduleTriggerDeduplicationKey', () => {
	test('derives jobId:scheduledFor in canonical UTC', () => {
		const key = scheduleTriggerDeduplicationKey({
			jobId: 7,
			scheduledFor: new Date('2026-07-06T07:30:00.000Z'),
		});

		expect(key).toBe('7:2026-07-06T07:30:00.000Z');
	});
});

describe('buildScheduleTriggerItem', () => {
	const scheduledFor = new Date('2026-07-06T07:30:00.000Z');

	test('mirrors the legacy Schedule Trigger emit shape, stamped from the occurrence', () => {
		expect(buildScheduleTriggerItem(scheduledFor, 'Asia/Kathmandu')).toEqual({
			json: {
				timestamp: '2026-07-06T13:15:00.000+05:45',
				'Readable date': 'July 6th 2026, 1:15:00 pm',
				'Readable time': '1:15:00 pm',
				'Day of week': 'Monday',
				Year: '2026',
				Month: 'July',
				'Day of month': '06',
				Hour: '13',
				Minute: '15',
				Second: '00',
				Timezone: 'Asia/Kathmandu (UTC+05:45)',
			},
		});
	});

	test('renders UTC as an explicit +00:00 offset and midnight as 12 am', () => {
		expect(buildScheduleTriggerItem(new Date('2026-01-01T00:00:30.000Z'), 'UTC')).toEqual({
			json: {
				timestamp: '2026-01-01T00:00:30.000+00:00',
				'Readable date': 'January 1st 2026, 12:00:30 am',
				'Readable time': '12:00:30 am',
				'Day of week': 'Thursday',
				Year: '2026',
				Month: 'January',
				'Day of month': '01',
				Hour: '00',
				Minute: '00',
				Second: '30',
				Timezone: 'UTC (UTC+00:00)',
			},
		});
	});

	test('renders negative offsets and noon as 12 pm', () => {
		const item = buildScheduleTriggerItem(new Date('2026-07-06T16:00:00.000Z'), 'America/New_York');
		expect(item.json.timestamp).toBe('2026-07-06T12:00:00.000-04:00');
		expect(item.json['Readable time']).toBe('12:00:00 pm');
		expect(item.json.Timezone).toBe('America/New_York (UTC-04:00)');
	});

	test.each([
		['2026-03-02', 'March 2nd 2026'],
		['2026-03-03', 'March 3rd 2026'],
		['2026-03-04', 'March 4th 2026'],
		['2026-03-11', 'March 11th 2026'],
		['2026-03-12', 'March 12th 2026'],
		['2026-03-13', 'March 13th 2026'],
		['2026-03-21', 'March 21st 2026'],
		['2026-03-22', 'March 22nd 2026'],
		['2026-03-23', 'March 23rd 2026'],
		['2026-03-31', 'March 31st 2026'],
	])('renders the ordinal day for %s', (date, expectedPrefix) => {
		const item = buildScheduleTriggerItem(new Date(`${date}T09:05:07.000Z`), 'UTC');
		expect(item.json['Readable date']).toBe(`${expectedPrefix}, 9:05:07 am`);
	});
});
