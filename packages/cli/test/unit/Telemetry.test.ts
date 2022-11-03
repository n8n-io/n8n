import { Telemetry } from '@/telemetry';
import config from '@/config';

jest.spyOn(Telemetry.prototype as any, 'initRudderStack').mockImplementation(() => {
	return {
		flush: () => {},
		identify: () => {},
		track: () => {},
	};
});

describe('Telemetry', () => {
	let startPulseSpy: jest.SpyInstance;
	const spyTrack = jest.spyOn(Telemetry.prototype, 'track');

	let telemetry: Telemetry;
	const n8nVersion = '0.0.0';
	const instanceId = 'Telemetry unit test';
	const testDateTime = new Date('2022-01-01 00:00:00');

	beforeAll(() => {
		startPulseSpy = jest
			.spyOn(Telemetry.prototype as any, 'startPulse')
			.mockImplementation(() => {});
		jest.useFakeTimers();
		jest.setSystemTime(testDateTime);
		config.set('diagnostics.enabled', true);
		config.set('deployment.type', 'n8n-testing');
	});

	afterAll(() => {
		jest.clearAllTimers();
		jest.useRealTimers();
		startPulseSpy.mockRestore();
		telemetry.trackN8nStop();
	});

	beforeEach(() => {
		spyTrack.mockClear();
		telemetry = new Telemetry(instanceId, n8nVersion);
	});

	afterEach(() => {
		telemetry.trackN8nStop();
	});

	describe('trackN8nStop', () => {
		test('should call track method', () => {
			telemetry.trackN8nStop();
			expect(spyTrack).toHaveBeenCalledTimes(1);
		});
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
			await telemetry.trackWorkflowExecution(payload);
			fakeJestSystemTime('2022-01-01 12:30:00');
			await telemetry.trackWorkflowExecution(payload);

			payload.is_manual = false;
			payload.success = true;
			const execTime2 = fakeJestSystemTime('2022-01-01 13:00:00');
			await telemetry.trackWorkflowExecution(payload);
			fakeJestSystemTime('2022-01-01 12:30:00');
			await telemetry.trackWorkflowExecution(payload);

			payload.is_manual = true;
			payload.success = false;
			const execTime3 = fakeJestSystemTime('2022-01-01 14:00:00');
			await telemetry.trackWorkflowExecution(payload);
			fakeJestSystemTime('2022-01-01 12:30:00');
			await telemetry.trackWorkflowExecution(payload);

			payload.is_manual = false;
			payload.success = false;
			const execTime4 = fakeJestSystemTime('2022-01-01 15:00:00');
			await telemetry.trackWorkflowExecution(payload);
			fakeJestSystemTime('2022-01-01 12:30:00');
			await telemetry.trackWorkflowExecution(payload);

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
			await telemetry.trackWorkflowExecution(payload);
			fakeJestSystemTime('2022-01-01 12:30:00');
			await telemetry.trackWorkflowExecution(payload);

			let execBuffer = telemetry.getCountsBuffer();

			// should not fire event for custom nodes
			expect(spyTrack).toHaveBeenCalledTimes(0);
			expect(execBuffer['1'].manual_error?.count).toBe(2);
			expect(execBuffer['1'].manual_error?.first).toEqual(execTime1);

			payload.error_node_type = 'n8n-nodes-base.node-type';
			fakeJestSystemTime('2022-01-01 13:00:00');
			await telemetry.trackWorkflowExecution(payload);
			fakeJestSystemTime('2022-01-01 12:30:00');
			await telemetry.trackWorkflowExecution(payload);

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
			await telemetry.trackWorkflowExecution(payload);

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

			await telemetry.trackWorkflowExecution(payload);

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

			await telemetry.trackWorkflowExecution(payload);

			payload.error_node_type = 'n8n-nodes-base.merge';
			payload.workflow_id = '1';

			await telemetry.trackWorkflowExecution(payload);

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
			await telemetry.trackWorkflowExecution(payload);

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
			await telemetry.trackWorkflowExecution(payload);

			expect(spyTrack).toHaveBeenCalledTimes(1);

			execBuffer = telemetry.getCountsBuffer();

			expect(execBuffer['1'].manual_error).toBeUndefined();
			expect(execBuffer['1'].manual_success).toBeUndefined();
			expect(execBuffer['2'].manual_error).toBeUndefined();
			expect(execBuffer['2'].manual_success).toBeUndefined();
			expect(execBuffer['2'].prod_error).toBeUndefined();
			expect(execBuffer['1'].prod_success?.count).toBe(2);
			expect(execBuffer['1'].prod_error?.count).toBe(2);
			expect(execBuffer['2'].prod_success?.count).toBe(2);

			expect(execBuffer['1'].prod_error?.first).toEqual(execTime2);
			expect(execBuffer['1'].prod_success?.first).toEqual(execTime1);
			expect(execBuffer['2'].prod_success?.first).toEqual(execTime1);
		});
	});

	describe('pulse', () => {
		let pulseSpy: jest.SpyInstance;
		beforeAll(() => {
			startPulseSpy.mockRestore();
		});

		beforeEach(() => {
			fakeJestSystemTime(testDateTime);
			pulseSpy = jest.spyOn(Telemetry.prototype as any, 'pulse');
		});

		afterEach(() => {
			pulseSpy.mockClear();
		});

		test('should trigger pulse in intervals', () => {
			expect(pulseSpy).toBeCalledTimes(0);

			jest.advanceTimersToNextTimer();

			expect(pulseSpy).toBeCalledTimes(1);
			expect(spyTrack).toHaveBeenCalledTimes(1);
			expect(spyTrack).toHaveBeenCalledWith('pulse');

			jest.advanceTimersToNextTimer();

			expect(pulseSpy).toBeCalledTimes(2);
			expect(spyTrack).toHaveBeenCalledTimes(2);
			expect(spyTrack).toHaveBeenCalledWith('pulse');
		});

		test('should track workflow counts correctly', async () => {
			expect(pulseSpy).toBeCalledTimes(0);

			let execBuffer = telemetry.getCountsBuffer();

			// expect clear counters on start
			expect(Object.keys(execBuffer).length).toBe(0);

			const payload = {
				workflow_id: '1',
				is_manual: true,
				success: true,
				error_node_type: 'custom-nodes-base.node-type',
			};

			await telemetry.trackWorkflowExecution(payload);
			await telemetry.trackWorkflowExecution(payload);

			payload.is_manual = false;
			payload.success = true;
			await telemetry.trackWorkflowExecution(payload);
			await telemetry.trackWorkflowExecution(payload);

			payload.is_manual = true;
			payload.success = false;
			await telemetry.trackWorkflowExecution(payload);
			await telemetry.trackWorkflowExecution(payload);

			payload.is_manual = false;
			payload.success = false;
			await telemetry.trackWorkflowExecution(payload);
			await telemetry.trackWorkflowExecution(payload);

			payload.workflow_id = '2';
			await telemetry.trackWorkflowExecution(payload);
			await telemetry.trackWorkflowExecution(payload);

			expect(spyTrack).toHaveBeenCalledTimes(0);
			expect(pulseSpy).toBeCalledTimes(0);

			jest.advanceTimersToNextTimer();

			execBuffer = telemetry.getCountsBuffer();

			expect(pulseSpy).toBeCalledTimes(1);
			expect(spyTrack).toHaveBeenCalledTimes(3);
			expect(spyTrack).toHaveBeenNthCalledWith(1, 'Workflow execution count', {
				event_version: '2',
				workflow_id: '1',
				manual_error: {
					count: 2,
					first: testDateTime,
				},
				manual_success: {
					count: 2,
					first: testDateTime,
				},
				prod_error: {
					count: 2,
					first: testDateTime,
				},
				prod_success: {
					count: 2,
					first: testDateTime,
				},
			});
			expect(spyTrack).toHaveBeenNthCalledWith(2, 'Workflow execution count', {
				event_version: '2',
				workflow_id: '2',
				prod_error: {
					count: 2,
					first: testDateTime,
				},
			});
			expect(spyTrack).toHaveBeenNthCalledWith(3, 'pulse');
			expect(Object.keys(execBuffer).length).toBe(0);

			jest.advanceTimersToNextTimer();

			execBuffer = telemetry.getCountsBuffer();
			expect(Object.keys(execBuffer).length).toBe(0);

			expect(pulseSpy).toBeCalledTimes(2);
			expect(spyTrack).toHaveBeenCalledTimes(4);
			expect(spyTrack).toHaveBeenNthCalledWith(4, 'pulse');
		});
	});
});

const fakeJestSystemTime = (dateTime: string | Date): Date => {
	const dt = new Date(dateTime);
	jest.setSystemTime(dt);
	return dt;
};
