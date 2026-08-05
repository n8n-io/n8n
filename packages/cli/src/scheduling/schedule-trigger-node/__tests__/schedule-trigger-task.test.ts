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
});
