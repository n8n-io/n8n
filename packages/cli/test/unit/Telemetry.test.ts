import Telemetry from '../../src/telemetry';

jest.spyOn(Telemetry.prototype as any, 'createTelemetryClient').mockImplementation(() => {
    return {
        flush: () => {},
        identify: () => {},
        track: () => {},
    };
});

jest.spyOn(Telemetry.prototype as any, 'startPulse').mockImplementation(() => {});

const spyTrack = jest.spyOn(Telemetry.prototype, 'track');

let telemetry: Telemetry;

const testDateTime = new Date('2022-01-01 00:00:00');

describe('Telemetry', () => {
    beforeAll(() => {
        jest.useFakeTimers();
        jest.setSystemTime(testDateTime);
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    beforeEach(() => {
        telemetry = new Telemetry('Telemetry unit test', '0.0.0');
        spyTrack.mockClear();
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
                error_node_type: 'custom-nodes-base.node-type'
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

            const execBuffer = telemetry.getCountsBufferNew();

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
                error_node_type: 'custom-nodes-base.node-type'
            };

            const execTime1 = fakeJestSystemTime('2022-01-01 12:00:00');
            await telemetry.trackWorkflowExecution(payload);
            fakeJestSystemTime('2022-01-01 12:30:00');
            await telemetry.trackWorkflowExecution(payload);

            let execBuffer = telemetry.getCountsBufferNew();

            // should not fire event for custom nodes
            expect(spyTrack).toHaveBeenCalledTimes(0);
            expect(execBuffer['1'].manual_error?.count).toBe(2);
            expect(execBuffer['1'].manual_error?.first).toEqual(execTime1);

            payload.error_node_type = 'n8n-nodes-base.node-type';
            fakeJestSystemTime('2022-01-01 13:00:00');
            await telemetry.trackWorkflowExecution(payload);
            fakeJestSystemTime('2022-01-01 12:30:00');
            await telemetry.trackWorkflowExecution(payload);

            execBuffer = telemetry.getCountsBufferNew();

            // should fire event for custom nodes
            expect(spyTrack).toHaveBeenCalledTimes(2);
            expect(spyTrack).toHaveBeenCalledWith('Workflow execution errored', payload);
            expect(execBuffer['1'].manual_error?.count).toBe(4);
            expect(execBuffer['1'].manual_error?.first).toEqual(execTime1);
        });

		test('should track manual executions count correctly', async () => {
            // successful execution
            const execTime1 = fakeJestSystemTime('2022-01-01 12:00:00');
            const payload = {
                workflow_id: '1',
                is_manual: true,
                success: true,
                error_node_type: 'node_type'
            };

			await telemetry.trackWorkflowExecution(payload);

            expect(spyTrack).toHaveBeenCalledTimes(0);

            let execBuffer = telemetry.getCountsBuffer();
            expect(execBuffer.counts['1'].manual_error_count).toBe(0);
            expect(execBuffer.counts['1'].manual_success_count).toBe(1);
            expect(execBuffer.counts['1'].prod_error_count).toBe(0);
            expect(execBuffer.counts['1'].prod_success_count).toBe(0);

            expect(execBuffer.firstExecutions.first_manual_error).toBeUndefined();
            expect(execBuffer.firstExecutions.first_manual_success).toEqual(execTime1);
            expect(execBuffer.firstExecutions.first_prod_error).toBeUndefined();
            expect(execBuffer.firstExecutions.first_prod_success).toBeUndefined();

            // failed execution
            const execTime2 = fakeJestSystemTime('2022-01-01 13:00:00');
            payload.success = false;
            await telemetry.trackWorkflowExecution(payload);

            expect(spyTrack).toHaveBeenCalledTimes(0);

            execBuffer = telemetry.getCountsBuffer();
            expect(execBuffer.counts['1'].manual_error_count).toBe(1);
            expect(execBuffer.counts['1'].manual_success_count).toBe(1);
            expect(execBuffer.counts['1'].prod_error_count).toBe(0);
            expect(execBuffer.counts['1'].prod_success_count).toBe(0);

            expect(execBuffer.firstExecutions.first_manual_error).toEqual(execTime2);
            expect(execBuffer.firstExecutions.first_manual_success).toEqual(execTime1);
            expect(execBuffer.firstExecutions.first_prod_error).toBeUndefined();
            expect(execBuffer.firstExecutions.first_prod_success).toBeUndefined();
		});

        test('should track production executions count correctly', async () => {
            const payload = {
                workflow_id: '1',
                is_manual: false,
                success: true,
                error_node_type: 'node_type'
            };

            // successful execution
            const execTime1 = fakeJestSystemTime('2022-01-01 12:00:00');
            await telemetry.trackWorkflowExecution(payload);

            expect(spyTrack).toHaveBeenCalledTimes(0);

            let execBuffer = telemetry.getCountsBuffer();
            expect(execBuffer.counts['1'].manual_error_count).toBe(0);
            expect(execBuffer.counts['1'].manual_success_count).toBe(0);
            expect(execBuffer.counts['1'].prod_error_count).toBe(0);
            expect(execBuffer.counts['1'].prod_success_count).toBe(1);

            expect(execBuffer.firstExecutions.first_manual_error).toBeUndefined();
            expect(execBuffer.firstExecutions.first_manual_success).toBeUndefined();
            expect(execBuffer.firstExecutions.first_prod_error).toBeUndefined();
            expect(execBuffer.firstExecutions.first_prod_success).toEqual(execTime1);

            // successful execution n8n node
            payload.error_node_type = 'n8n-nodes-base.merge';
            payload.workflow_id = '2';

            await telemetry.trackWorkflowExecution(payload);

            expect(spyTrack).toHaveBeenCalledTimes(0);

            execBuffer = telemetry.getCountsBuffer();
            expect(execBuffer.counts['1'].manual_error_count).toBe(0);
            expect(execBuffer.counts['1'].manual_success_count).toBe(0);
            expect(execBuffer.counts['1'].prod_error_count).toBe(0);
            expect(execBuffer.counts['1'].prod_success_count).toBe(1);
            expect(execBuffer.counts['2'].manual_error_count).toBe(0);
            expect(execBuffer.counts['2'].manual_success_count).toBe(0);
            expect(execBuffer.counts['2'].prod_error_count).toBe(0);
            expect(execBuffer.counts['2'].prod_success_count).toBe(1);
            
            expect(execBuffer.firstExecutions.first_manual_error).toBeUndefined();
            expect(execBuffer.firstExecutions.first_manual_success).toBeUndefined();
            expect(execBuffer.firstExecutions.first_prod_error).toBeUndefined();
            expect(execBuffer.firstExecutions.first_prod_success).toEqual(execTime1);

            // additional successful execution
            payload.error_node_type = 'n8n-nodes-base.merge';
            payload.workflow_id = '2';

            await telemetry.trackWorkflowExecution(payload);

            payload.error_node_type = 'n8n-nodes-base.merge';
            payload.workflow_id = '1';

            await telemetry.trackWorkflowExecution(payload);

            expect(spyTrack).toHaveBeenCalledTimes(0);

            execBuffer = telemetry.getCountsBuffer();
            expect(execBuffer.counts['1'].manual_error_count).toBe(0);
            expect(execBuffer.counts['1'].manual_success_count).toBe(0);
            expect(execBuffer.counts['1'].prod_error_count).toBe(0);
            expect(execBuffer.counts['1'].prod_success_count).toBe(2);
            expect(execBuffer.counts['2'].manual_error_count).toBe(0);
            expect(execBuffer.counts['2'].manual_success_count).toBe(0);
            expect(execBuffer.counts['2'].prod_error_count).toBe(0);
            expect(execBuffer.counts['2'].prod_success_count).toBe(2);

            expect(execBuffer.firstExecutions.first_manual_error).toBeUndefined();
            expect(execBuffer.firstExecutions.first_manual_success).toBeUndefined();
            expect(execBuffer.firstExecutions.first_prod_error).toBeUndefined();
            expect(execBuffer.firstExecutions.first_prod_success).toEqual(execTime1);

            // failed execution
            const execTime2 = fakeJestSystemTime('2022-01-01 12:00:00');
            payload.error_node_type = 'custom-package.custom-node';
            payload.success = false;
            await telemetry.trackWorkflowExecution(payload);

            expect(spyTrack).toHaveBeenCalledTimes(0);

            execBuffer = telemetry.getCountsBuffer();
            expect(execBuffer.counts['1'].manual_error_count).toBe(0);
            expect(execBuffer.counts['1'].manual_success_count).toBe(0);
            expect(execBuffer.counts['1'].prod_error_count).toBe(1);
            expect(execBuffer.counts['1'].prod_success_count).toBe(2);
            expect(execBuffer.counts['2'].manual_error_count).toBe(0);
            expect(execBuffer.counts['2'].manual_success_count).toBe(0);
            expect(execBuffer.counts['2'].prod_error_count).toBe(0);
            expect(execBuffer.counts['2'].prod_success_count).toBe(2);

            expect(execBuffer.firstExecutions.first_manual_error).toBeUndefined();
            expect(execBuffer.firstExecutions.first_manual_success).toBeUndefined();
            expect(execBuffer.firstExecutions.first_prod_error).toEqual(execTime2);
            expect(execBuffer.firstExecutions.first_prod_success).toEqual(execTime1);

            // failed execution n8n node
            payload.success = false;
            payload.error_node_type = 'n8n-nodes-base.merge';
            await telemetry.trackWorkflowExecution(payload);

            expect(spyTrack).toHaveBeenCalledTimes(1);

            execBuffer = telemetry.getCountsBuffer();
            expect(execBuffer.counts['1'].manual_error_count).toBe(0);
            expect(execBuffer.counts['1'].manual_success_count).toBe(0);
            expect(execBuffer.counts['1'].prod_error_count).toBe(2);
            expect(execBuffer.counts['1'].prod_success_count).toBe(2);
            expect(execBuffer.counts['2'].manual_error_count).toBe(0);
            expect(execBuffer.counts['2'].manual_success_count).toBe(0);
            expect(execBuffer.counts['2'].prod_error_count).toBe(0);
            expect(execBuffer.counts['2'].prod_success_count).toBe(2);

            expect(execBuffer.firstExecutions.first_manual_error).toBeUndefined();
            expect(execBuffer.firstExecutions.first_manual_success).toBeUndefined();
            expect(execBuffer.firstExecutions.first_prod_error).toEqual(execTime2);
            expect(execBuffer.firstExecutions.first_prod_success).toEqual(execTime1);
        });

        test('should track production executions count correctly new logic', async () => {
            const payload = {
                workflow_id: '1',
                is_manual: false,
                success: true,
                error_node_type: 'node_type'
            };

            // successful execution
            const execTime1 = fakeJestSystemTime('2022-01-01 12:00:00');
            await telemetry.trackWorkflowExecution(payload);

            expect(spyTrack).toHaveBeenCalledTimes(0);

            let execBuffer = telemetry.getCountsBufferNew();
            expect(execBuffer['1'].manual_error).toBeUndefined();
            expect(execBuffer['1'].manual_success).toBeUndefined();
            expect(execBuffer['1'].prod_error).toBeUndefined();

            expect(execBuffer['1'].prod_success?.count).toBe(1);
            expect(execBuffer['1'].prod_success?.first).toEqual(execTime1);

            // // successful execution n8n node
            // payload.error_node_type = 'n8n-nodes-base.merge';
            // payload.workflow_id = '2';

            // await telemetry.trackWorkflowExecution(payload);

            // expect(spyTrack).toHaveBeenCalledTimes(0);

            // execBuffer = telemetry.getCountsBufferNew();
            // expect(execBuffer.counts['1'].manual_error_count).toBe(0);
            // expect(execBuffer.counts['1'].manual_success_count).toBe(0);
            // expect(execBuffer.counts['1'].prod_error_count).toBe(0);
            // expect(execBuffer.counts['1'].prod_success_count).toBe(1);
            // expect(execBuffer.counts['2'].manual_error_count).toBe(0);
            // expect(execBuffer.counts['2'].manual_success_count).toBe(0);
            // expect(execBuffer.counts['2'].prod_error_count).toBe(0);
            // expect(execBuffer.counts['2'].prod_success_count).toBe(1);
            
            // expect(execBuffer.firstExecutions.first_manual_error).toBeUndefined();
            // expect(execBuffer.firstExecutions.first_manual_success).toBeUndefined();
            // expect(execBuffer.firstExecutions.first_prod_error).toBeUndefined();
            // expect(execBuffer.firstExecutions.first_prod_success).toEqual(execTime1);

            // // additional successful execution
            // payload.error_node_type = 'n8n-nodes-base.merge';
            // payload.workflow_id = '2';

            // await telemetry.trackWorkflowExecution(payload);

            // payload.error_node_type = 'n8n-nodes-base.merge';
            // payload.workflow_id = '1';

            // await telemetry.trackWorkflowExecution(payload);

            // expect(spyTrack).toHaveBeenCalledTimes(0);

            // execBuffer = telemetry.getCountsBufferNew();
            // expect(execBuffer.counts['1'].manual_error_count).toBe(0);
            // expect(execBuffer.counts['1'].manual_success_count).toBe(0);
            // expect(execBuffer.counts['1'].prod_error_count).toBe(0);
            // expect(execBuffer.counts['1'].prod_success_count).toBe(2);
            // expect(execBuffer.counts['2'].manual_error_count).toBe(0);
            // expect(execBuffer.counts['2'].manual_success_count).toBe(0);
            // expect(execBuffer.counts['2'].prod_error_count).toBe(0);
            // expect(execBuffer.counts['2'].prod_success_count).toBe(2);

            // expect(execBuffer.firstExecutions.first_manual_error).toBeUndefined();
            // expect(execBuffer.firstExecutions.first_manual_success).toBeUndefined();
            // expect(execBuffer.firstExecutions.first_prod_error).toBeUndefined();
            // expect(execBuffer.firstExecutions.first_prod_success).toEqual(execTime1);

            // // failed execution
            // const execTime2 = fakeJestSystemTime('2022-01-01 12:00:00');
            // payload.error_node_type = 'custom-package.custom-node';
            // payload.success = false;
            // await telemetry.trackWorkflowExecution(payload);

            // expect(spyTrack).toHaveBeenCalledTimes(0);

            // execBuffer = telemetry.getCountsBufferNew();
            // expect(execBuffer.counts['1'].manual_error_count).toBe(0);
            // expect(execBuffer.counts['1'].manual_success_count).toBe(0);
            // expect(execBuffer.counts['1'].prod_error_count).toBe(1);
            // expect(execBuffer.counts['1'].prod_success_count).toBe(2);
            // expect(execBuffer.counts['2'].manual_error_count).toBe(0);
            // expect(execBuffer.counts['2'].manual_success_count).toBe(0);
            // expect(execBuffer.counts['2'].prod_error_count).toBe(0);
            // expect(execBuffer.counts['2'].prod_success_count).toBe(2);

            // expect(execBuffer.firstExecutions.first_manual_error).toBeUndefined();
            // expect(execBuffer.firstExecutions.first_manual_success).toBeUndefined();
            // expect(execBuffer.firstExecutions.first_prod_error).toEqual(execTime2);
            // expect(execBuffer.firstExecutions.first_prod_success).toEqual(execTime1);

            // // failed execution n8n node
            // payload.success = false;
            // payload.error_node_type = 'n8n-nodes-base.merge';
            // await telemetry.trackWorkflowExecution(payload);

            // expect(spyTrack).toHaveBeenCalledTimes(1);

            // execBuffer = telemetry.getCountsBufferNew();
            // expect(execBuffer.counts['1'].manual_error_count).toBe(0);
            // expect(execBuffer.counts['1'].manual_success_count).toBe(0);
            // expect(execBuffer.counts['1'].prod_error_count).toBe(2);
            // expect(execBuffer.counts['1'].prod_success_count).toBe(2);
            // expect(execBuffer.counts['2'].manual_error_count).toBe(0);
            // expect(execBuffer.counts['2'].manual_success_count).toBe(0);
            // expect(execBuffer.counts['2'].prod_error_count).toBe(0);
            // expect(execBuffer.counts['2'].prod_success_count).toBe(2);

            // expect(execBuffer.firstExecutions.first_manual_error).toBeUndefined();
            // expect(execBuffer.firstExecutions.first_manual_success).toBeUndefined();
            // expect(execBuffer.firstExecutions.first_prod_error).toEqual(execTime2);
            // expect(execBuffer.firstExecutions.first_prod_success).toEqual(execTime1);
        });
	});
});

const fakeJestSystemTime = (dateTime: string | Date): Date => {
    const dt = new Date(dateTime);
    jest.setSystemTime(dt);
    return dt;
}
