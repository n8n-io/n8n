import { mockInstance } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import type RudderStack from '@rudderstack/rudder-sdk-node';
import { mock } from 'jest-mock-extended';
import { InstanceSettings } from 'n8n-core';

import config from '@/config';
import { PostHogClient } from '@/posthog';
import { Telemetry } from '@/telemetry';

jest.unmock('@/telemetry');
jest.mock('@/posthog');

describe('Telemetry', () => {
	let startPulseSpy: jest.SpyInstance;
	const spyTrack = jest.spyOn(Telemetry.prototype, 'track').mockName('track');

	const mockRudderStack = mock<RudderStack>();

	let telemetry: Telemetry;
	const instanceId = 'Telemetry unit test';
	const testDateTime = new Date('2022-01-01 00:00:00');
	const instanceSettings = mockInstance(InstanceSettings, { instanceId });
	const globalConfig = mock<GlobalConfig>({
		diagnostics: { enabled: true },
		logging: { level: 'info', outputs: ['console'] },
	});

	beforeAll(() => {
		// @ts-expect-error Spying on private method
		startPulseSpy = jest.spyOn(Telemetry.prototype, 'startPulse').mockImplementation(() => {});

		jest.useFakeTimers();
		jest.setSystemTime(testDateTime);
		config.set('deployment.type', 'n8n-testing');
	});

	afterAll(async () => {
		jest.clearAllTimers();
		jest.useRealTimers();
		startPulseSpy.mockRestore();
		await telemetry.stopTracking();
	});

	beforeEach(async () => {
		spyTrack.mockClear();

		const postHog = new PostHogClient(instanceSettings, mock());
		await postHog.init();

		telemetry = new Telemetry(mock(), postHog, mock(), instanceSettings, mock(), globalConfig);
		// @ts-expect-error Assigning to private property
		telemetry.rudderStack = mockRudderStack;
	});

	afterEach(async () => {
		await telemetry.stopTracking();
	});

	describe('trackWorkflowExecution', () => {
		beforeEach(() => {
			jest.setSystemTime(testDateTime);
		});

		test('should count executions correctly', async () => {
			const payload = {
				workflow_id: '1',
				is_manual: true,
				success: true,
				error_node_type: 'custom-nodes-base.node-type',
			};

			payload.is_manual = true;
			payload.success = true;
			const execTime1 = fakeJestSystemTime('2022-01-01 12:00:00');
			telemetry.trackWorkflowExecution(payload);
			fakeJestSystemTime('2022-01-01 12:30:00');
			telemetry.trackWorkflowExecution(payload);

			payload.is_manual = false;
			payload.success = true;
			const execTime2 = fakeJestSystemTime('2022-01-01 13:00:00');
			telemetry.trackWorkflowExecution(payload);
			fakeJestSystemTime('2022-01-01 12:30:00');
			telemetry.trackWorkflowExecution(payload);

			payload.is_manual = true;
			payload.success = false;
			const execTime3 = fakeJestSystemTime('2022-01-01 14:00:00');
			telemetry.trackWorkflowExecution(payload);
			fakeJestSystemTime('2022-01-01 12:30:00');
			telemetry.trackWorkflowExecution(payload);

			payload.is_manual = false;
			payload.success = false;
			const execTime4 = fakeJestSystemTime('2022-01-01 15:00:00');
			telemetry.trackWorkflowExecution(payload);
			fakeJestSystemTime('2022-01-01 12:30:00');
			telemetry.trackWorkflowExecution(payload);

			expect(spyTrack).toHaveBeenCalledTimes(0);

			const execBuffer = telemetry.getCountsBuffer();

			expect(execBuffer['1'].manual_success?.count).toBe(2);
			expect(execBuffer['1'].manual_success?.first).toEqual(execTime1);
			expect(execBuffer['1'].prod_success?.count).toBe(2);
			expect(execBuffer['1'].prod_success?.first).toEqual(execTime2);
			expect(execBuffer['1'].manual_error?.count).toBe(2);
			expect(execBuffer['1'].manual_error?.first).toEqual(execTime3);
			expect(execBuffer['1'].prod_error?.count).toBe(2);
			expect(execBuffer['1'].prod_error?.first).toEqual(execTime4);
		});

		test('should fire "Workflow execution errored" event for failed executions', async () => {
			const payload = {
				workflow_id: '1',
				is_manual: true,
				success: false,
				error_node_type: 'custom-nodes-base.node-type',
			};

			const execTime1 = fakeJestSystemTime('2022-01-01 12:00:00');
			telemetry.trackWorkflowExecution(payload);
			fakeJestSystemTime('2022-01-01 12:30:00');
			telemetry.trackWorkflowExecution(payload);

			let execBuffer = telemetry.getCountsBuffer();

			// should not fire event for custom nodes
			expect(spyTrack).toHaveBeenCalledTimes(0);
			expect(execBuffer['1'].manual_error?.count).toBe(2);
			expect(execBuffer['1'].manual_error?.first).toEqual(execTime1);

			payload.error_node_type = 'n8n-nodes-base.node-type';
			fakeJestSystemTime('2022-01-01 13:00:00');
			telemetry.trackWorkflowExecution(payload);
			fakeJestSystemTime('2022-01-01 12:30:00');
			telemetry.trackWorkflowExecution(payload);

			execBuffer = telemetry.getCountsBuffer();

			// should fire event for custom nodes
			expect(spyTrack).toHaveBeenCalledTimes(2);
			expect(spyTrack).toHaveBeenCalledWith('Workflow execution errored', payload);
			expect(execBuffer['1'].manual_error?.count).toBe(4);
			expect(execBuffer['1'].manual_error?.first).toEqual(execTime1);
		});

		test('should track production executions count correctly', async () => {
			const payload = {
				workflow_id: '1',
				is_manual: false,
				success: true,
				error_node_type: 'node_type',
			};

			// successful execution
			const execTime1 = fakeJestSystemTime('2022-01-01 12:00:00');
			telemetry.trackWorkflowExecution(payload);

			expect(spyTrack).toHaveBeenCalledTimes(0);

			let execBuffer = telemetry.getCountsBuffer();
			expect(execBuffer['1'].manual_error).toBeUndefined();
			expect(execBuffer['1'].manual_success).toBeUndefined();
			expect(execBuffer['1'].prod_error).toBeUndefined();

			expect(execBuffer['1'].prod_success?.count).toBe(1);
			expect(execBuffer['1'].prod_success?.first).toEqual(execTime1);

			// successful execution n8n node
			payload.error_node_type = 'n8n-nodes-base.merge';
			payload.workflow_id = '2';

			telemetry.trackWorkflowExecution(payload);

			expect(spyTrack).toHaveBeenCalledTimes(0);

			execBuffer = telemetry.getCountsBuffer();
			expect(execBuffer['1'].manual_error).toBeUndefined();
			expect(execBuffer['1'].manual_success).toBeUndefined();
			expect(execBuffer['1'].prod_error).toBeUndefined();

			expect(execBuffer['1'].prod_success?.count).toBe(1);
			expect(execBuffer['2'].prod_success?.count).toBe(1);

			expect(execBuffer['1'].prod_success?.first).toEqual(execTime1);
			expect(execBuffer['2'].prod_success?.first).toEqual(execTime1);

			// additional successful execution
			payload.error_node_type = 'n8n-nodes-base.merge';
			payload.workflow_id = '2';

			telemetry.trackWorkflowExecution(payload);

			payload.error_node_type = 'n8n-nodes-base.merge';
			payload.workflow_id = '1';

			telemetry.trackWorkflowExecution(payload);

			expect(spyTrack).toHaveBeenCalledTimes(0);
			execBuffer = telemetry.getCountsBuffer();

			expect(execBuffer['1'].manual_error).toBeUndefined();
			expect(execBuffer['1'].manual_success).toBeUndefined();
			expect(execBuffer['1'].prod_error).toBeUndefined();
			expect(execBuffer['2'].manual_error).toBeUndefined();
			expect(execBuffer['2'].manual_success).toBeUndefined();
			expect(execBuffer['2'].prod_error).toBeUndefined();

			expect(execBuffer['1'].prod_success?.count).toBe(2);
			expect(execBuffer['2'].prod_success?.count).toBe(2);

			expect(execBuffer['1'].prod_success?.first).toEqual(execTime1);
			expect(execBuffer['2'].prod_success?.first).toEqual(execTime1);

			// failed execution
			const execTime2 = fakeJestSystemTime('2022-01-01 12:00:00');
			payload.error_node_type = 'custom-package.custom-node';
			payload.success = false;
			telemetry.trackWorkflowExecution(payload);

			expect(spyTrack).toHaveBeenCalledTimes(0);

			execBuffer = telemetry.getCountsBuffer();

			expect(execBuffer['1'].manual_error).toBeUndefined();
			expect(execBuffer['1'].manual_success).toBeUndefined();
			expect(execBuffer['2'].manual_error).toBeUndefined();
			expect(execBuffer['2'].manual_success).toBeUndefined();
			expect(execBuffer['2'].prod_error).toBeUndefined();

			expect(execBuffer['1'].prod_error?.count).toBe(1);
			expect(execBuffer['1'].prod_success?.count).toBe(2);
			expect(execBuffer['2'].prod_success?.count).toBe(2);

			expect(execBuffer['1'].prod_error?.first).toEqual(execTime2);
			expect(execBuffer['1'].prod_success?.first).toEqual(execTime1);
			expect(execBuffer['2'].prod_success?.first).toEqual(execTime1);

			// failed execution n8n node
			payload.success = false;
			payload.error_node_type = 'n8n-nodes-base.merge';
			payload.is_manual = true;
			telemetry.trackWorkflowExecution(payload);

			expect(spyTrack).toHaveBeenCalledTimes(1);

			execBuffer = telemetry.getCountsBuffer();

			expect(execBuffer['1'].manual_error?.count).toBe(1);
			expect(execBuffer['1'].manual_success).toBeUndefined();
			expect(execBuffer['2'].manual_error).toBeUndefined();
			expect(execBuffer['2'].manual_success).toBeUndefined();
			expect(execBuffer['2'].prod_error).toBeUndefined();
			expect(execBuffer['1'].prod_success?.count).toBe(2);
			expect(execBuffer['1'].prod_error?.count).toBe(1);
			expect(execBuffer['2'].prod_success?.count).toBe(2);

			expect(execBuffer['1'].prod_error?.first).toEqual(execTime2);
			expect(execBuffer['1'].prod_success?.first).toEqual(execTime1);
			expect(execBuffer['2'].prod_success?.first).toEqual(execTime1);
		});
	});

	describe('Rudderstack', () => {
		test("should call rudderStack.identify() with a fake IP address to instruct Rudderstack to not use the user's IP address", () => {
			const traits = {
				name: 'Test User',
				age: 30,
				isActive: true,
			};

			telemetry.identify(traits);

			const expectedArgs = {
				userId: instanceId,
				traits: { ...traits, instanceId },
				context: {
					ip: '0.0.0.0', // RudderStack anonymized IP
				},
			};

			expect(mockRudderStack.identify).toHaveBeenCalledWith(expectedArgs);
		});

		test("should call rudderStack.track() with a fake IP address to instruct Rudderstack to not use the user's IP address", () => {
			const eventName = 'Test Event';
			const properties = { user_id: '1234' };

			telemetry.track(eventName, properties);

			expect(mockRudderStack.track).toHaveBeenCalledWith(
				expect.objectContaining({
					event: eventName,
					context: {
						ip: '0.0.0.0', // RudderStack anonymized IP
					},
				}),
			);
		});
	});
});

const fakeJestSystemTime = (dateTime: string | Date): Date => {
	const dt = new Date(dateTime);
	jest.setSystemTime(dt);
	return dt;
};
