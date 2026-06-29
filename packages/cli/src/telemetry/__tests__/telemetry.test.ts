import type { OutboundHttp } from '@n8n/backend-network';
import { mockInstance } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import type RudderStack from '@rudderstack/rudder-sdk-node';
import { InstanceSettings } from 'n8n-core';
import type { MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { PostHogClient } from '@/posthog';
import { Telemetry } from '@/telemetry';

vi.unmock('@/telemetry');
vi.mock('@/posthog');

const rudderStackConstructor = vi.fn().mockImplementation(function () {
	return mock<RudderStack>();
});
vi.mock('@rudderstack/rudder-sdk-node', () => ({
	__esModule: true,
	default: rudderStackConstructor,
}));

describe('Telemetry', () => {
	let spyTrack: MockInstance;

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
		vi.useFakeTimers();
		vi.setSystemTime(testDateTime);
		globalConfig.deployment.type = 'n8n-testing';
	});

	afterAll(async () => {
		vi.clearAllTimers();
		vi.useRealTimers();
		await telemetry.stopTracking();
	});

	beforeEach(async () => {
		spyTrack = vi.spyOn(Telemetry.prototype, 'track').mockName('track');
		// @ts-expect-error Spying on private method
		vi.spyOn(Telemetry.prototype, 'startPulse').mockImplementation(function () {});

		const postHog = new PostHogClient(instanceSettings, mock());
		await postHog.init();

		telemetry = new Telemetry(
			mock(),
			postHog,
			mock(),
			instanceSettings,
			mock(),
			globalConfig,
			mock(),
			mock(),
		);
		// @ts-expect-error Assigning to private property
		telemetry.rudderStack = mockRudderStack;
	});

	afterEach(async () => {
		await telemetry.stopTracking();
	});

	describe('init', () => {
		const httpAgent = mock();
		const httpsAgent = mock();
		const getNodeAgent = vi.fn().mockReturnValue({ httpAgent, httpsAgent });
		const transport = vi.fn().mockReturnValue({ getNodeAgent });
		const outboundHttp = mock<OutboundHttp>({ transport });

		const initConfig = mock<GlobalConfig>({
			diagnostics: { enabled: true, backendConfig: 'test-key;https://data-plane.test' },
			logging: { level: 'info', outputs: ['console'] },
		});

		let initTelemetry: Telemetry;

		beforeEach(() => {
			rudderStackConstructor.mockClear();
			transport.mockClear();
			getNodeAgent.mockClear();
			initConfig.diagnostics.backendConfig = 'test-key;https://data-plane.test';
			initTelemetry = new Telemetry(
				mock(),
				new PostHogClient(instanceSettings, mock()),
				mock(),
				instanceSettings,
				mock(),
				initConfig,
				mock(),
				outboundHttp,
			);
		});

		afterEach(async () => {
			await initTelemetry.stopTracking();
		});

		test('should route the RudderStack SDK through the outbound transport with SSRF disabled', async () => {
			await initTelemetry.init();

			expect(transport).toHaveBeenCalledWith({ ssrf: 'disabled' });
			expect(getNodeAgent).toHaveBeenCalled();
			expect(rudderStackConstructor).toHaveBeenCalledWith(
				'test-key',
				expect.objectContaining({
					dataPlaneUrl: 'https://data-plane.test',
					gzip: false,
					axiosConfig: {
						httpAgent,
						httpsAgent,
						headers: { 'Content-Type': 'application/json' },
					},
				}),
			);
		});

		test('should not initialize RudderStack when the backend config is invalid', async () => {
			initConfig.diagnostics.backendConfig = 'missing-data-plane';

			await initTelemetry.init();

			expect(rudderStackConstructor).not.toHaveBeenCalled();
		});
	});

	describe('trackWorkflowExecution', () => {
		beforeEach(() => {
			vi.setSystemTime(testDateTime);
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

		test('should count Instance AI source buckets alongside existing mode buckets', async () => {
			const payload: Parameters<Telemetry['trackWorkflowExecution']>[0] = {
				workflow_id: '1',
				is_manual: true,
				success: true,
				error_node_type: 'custom-nodes-base.node-type',
				execution_source: 'user',
			};

			const userManualExecTime = fakeJestSystemTime('2022-01-01 12:00:00');
			telemetry.trackWorkflowExecution(payload);

			payload.execution_source = 'instance_ai';
			payload.mock_data_sources = 'trigger_input';

			const instanceAiMockManualExecTime = fakeJestSystemTime('2022-01-01 13:00:00');
			telemetry.trackWorkflowExecution(payload);

			payload.is_manual = false;
			delete payload.mock_data_sources;

			const instanceAiRealProdExecTime = fakeJestSystemTime('2022-01-01 14:00:00');
			telemetry.trackWorkflowExecution(payload);

			const execBuffer = telemetry.getCountsBuffer();

			expect(execBuffer['1'].manual_success?.count).toBe(2);
			expect(execBuffer['1'].manual_success?.first).toEqual(userManualExecTime);
			expect(execBuffer['1'].prod_success?.count).toBe(1);
			expect(execBuffer['1'].prod_success?.first).toEqual(instanceAiRealProdExecTime);

			expect(execBuffer['1']).not.toHaveProperty('user_manual_success');
			expect(execBuffer['1'].instance_ai_mock_manual_success?.count).toBe(1);
			expect(execBuffer['1'].instance_ai_mock_manual_success?.first).toEqual(
				instanceAiMockManualExecTime,
			);
			expect(execBuffer['1'].instance_ai_real_prod_success?.count).toBe(1);
			expect(execBuffer['1'].instance_ai_real_prod_success?.first).toEqual(
				instanceAiRealProdExecTime,
			);
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

		test('should count crashed executions correctly', async () => {
			const payload = {
				workflow_id: '1',
				is_manual: true,
				success: false,
				crashed: true,
				error_node_type: 'n8n-nodes-base.node-type',
			};

			// Manual crashed execution
			const execTime1 = fakeJestSystemTime('2022-01-01 12:00:00');
			telemetry.trackWorkflowExecution(payload);
			fakeJestSystemTime('2022-01-01 12:30:00');
			telemetry.trackWorkflowExecution(payload);

			// Production crashed execution
			payload.is_manual = false;
			const execTime2 = fakeJestSystemTime('2022-01-01 13:00:00');
			telemetry.trackWorkflowExecution(payload);
			fakeJestSystemTime('2022-01-01 13:30:00');
			telemetry.trackWorkflowExecution(payload);

			// Should fire "Workflow execution errored" events for manual crashed executions with n8n-nodes-base
			expect(spyTrack).toHaveBeenCalledTimes(2);

			const execBuffer = telemetry.getCountsBuffer();

			expect(execBuffer['1'].manual_crashed?.count).toBe(2);
			expect(execBuffer['1'].manual_crashed?.first).toEqual(execTime1);
			expect(execBuffer['1'].prod_crashed?.count).toBe(2);
			expect(execBuffer['1'].prod_crashed?.first).toEqual(execTime2);

			// Other execution types should be undefined
			expect(execBuffer['1'].manual_success).toBeUndefined();
			expect(execBuffer['1'].manual_error).toBeUndefined();
			expect(execBuffer['1'].prod_success).toBeUndefined();
			expect(execBuffer['1'].prod_error).toBeUndefined();
		});

		test('should handle crashed executions with different workflow IDs', async () => {
			const payload1 = {
				workflow_id: '1',
				is_manual: true,
				success: false,
				crashed: true,
				error_node_type: 'n8n-nodes-base.node-type',
			};

			const payload2 = {
				workflow_id: '2',
				is_manual: false,
				success: false,
				crashed: true,
				error_node_type: 'n8n-nodes-base.another-node',
			};

			const execTime1 = fakeJestSystemTime('2022-01-01 12:00:00');
			telemetry.trackWorkflowExecution(payload1);

			const execTime2 = fakeJestSystemTime('2022-01-01 13:00:00');
			telemetry.trackWorkflowExecution(payload2);

			// Should fire one "Workflow execution errored" event for manual crashed execution with n8n-nodes-base
			expect(spyTrack).toHaveBeenCalledTimes(1);

			const execBuffer = telemetry.getCountsBuffer();

			expect(execBuffer['1'].manual_crashed?.count).toBe(1);
			expect(execBuffer['1'].manual_crashed?.first).toEqual(execTime1);
			expect(execBuffer['2'].prod_crashed?.count).toBe(1);
			expect(execBuffer['2'].prod_crashed?.first).toEqual(execTime2);

			// Cross-check other types are undefined
			expect(execBuffer['1'].prod_crashed).toBeUndefined();
			expect(execBuffer['2'].manual_crashed).toBeUndefined();
		});
	});

	describe('trackAgentExecution', () => {
		test('should aggregate agent execution counters by agent ID', () => {
			telemetry.trackAgentExecution({ agent_id: 'agent-1', message_count: 1 });
			telemetry.trackAgentExecution({ agent_id: 'agent-1', token_count: 15 });
			telemetry.trackAgentExecution({ agent_id: 'agent-1', tool_call_count: 2 });
			telemetry.trackAgentExecution({ agent_id: 'agent-2', message_count: 1 });

			expect(spyTrack).toHaveBeenCalledTimes(0);
			expect(telemetry.getAgentExecutionCountsBuffer()).toEqual({
				'agent-1': {
					agent_id: 'agent-1',
					message_count: 1,
					token_count: 15,
					tool_call_count: 2,
				},
				'agent-2': {
					agent_id: 'agent-2',
					message_count: 1,
					token_count: 0,
					tool_call_count: 0,
				},
			});
		});

		test('should flush agent execution counters and reset the buffer', () => {
			telemetry.trackAgentExecution({ agent_id: 'agent-1', message_count: 1 });
			telemetry.trackAgentExecution({ agent_id: 'agent-1', token_count: 15 });
			telemetry.trackAgentExecution({ agent_id: 'agent-1', tool_call_count: 2 });

			// @ts-expect-error Calling private method
			telemetry.flushAgentExecutionCounts();

			expect(spyTrack).toHaveBeenCalledWith('Agent execution count', {
				event_version: '1',
				agent_id: 'agent-1',
				message_count: 1,
				token_count: 15,
				tool_call_count: 2,
			});
			expect(telemetry.getAgentExecutionCountsBuffer()).toEqual({});
		});

		test('should allow a post-flush window with tokens but no fresh user turn', () => {
			telemetry.trackAgentExecution({ agent_id: 'agent-1', message_count: 1 });
			telemetry.trackAgentExecution({ agent_id: 'agent-1', token_count: 15 });

			// @ts-expect-error Calling private method
			telemetry.flushAgentExecutionCounts();
			spyTrack.mockClear();

			telemetry.trackAgentExecution({ agent_id: 'agent-1', token_count: 20 });

			// @ts-expect-error Calling private method
			telemetry.flushAgentExecutionCounts();

			expect(spyTrack).toHaveBeenCalledWith('Agent execution count', {
				event_version: '1',
				agent_id: 'agent-1',
				message_count: 0,
				token_count: 20,
				tool_call_count: 0,
			});
			expect(telemetry.getAgentExecutionCountsBuffer()).toEqual({});
		});

		test('should aggregate agent execution counters by agent ID and user ID when present', () => {
			telemetry.trackAgentExecution({ agent_id: 'agent-1', user_id: 'user-1', message_count: 1 });
			telemetry.trackAgentExecution({ agent_id: 'agent-1', user_id: 'user-1', token_count: 15 });
			telemetry.trackAgentExecution({ agent_id: 'agent-1', user_id: 'user-2', message_count: 1 });
			telemetry.trackAgentExecution({ agent_id: 'agent-1', tool_call_count: 2 });

			expect(telemetry.getAgentExecutionCountsBuffer()).toEqual({
				'agent-1:user-1': {
					agent_id: 'agent-1',
					user_id: 'user-1',
					message_count: 1,
					token_count: 15,
					tool_call_count: 0,
				},
				'agent-1:user-2': {
					agent_id: 'agent-1',
					user_id: 'user-2',
					message_count: 1,
					token_count: 0,
					tool_call_count: 0,
				},
				'agent-1': {
					agent_id: 'agent-1',
					message_count: 0,
					token_count: 0,
					tool_call_count: 2,
				},
			});
		});

		test('should flush attributed and unattributed agent execution counters separately', () => {
			telemetry.trackAgentExecution({ agent_id: 'agent-1', user_id: 'user-1', message_count: 1 });
			telemetry.trackAgentExecution({ agent_id: 'agent-1', user_id: 'user-1', token_count: 15 });
			telemetry.trackAgentExecution({ agent_id: 'agent-1', token_count: 20 });

			// @ts-expect-error Calling private method
			telemetry.flushAgentExecutionCounts();

			expect(spyTrack).toHaveBeenCalledWith('Agent execution count', {
				event_version: '1',
				agent_id: 'agent-1',
				user_id: 'user-1',
				message_count: 1,
				token_count: 15,
				tool_call_count: 0,
			});
			expect(spyTrack).toHaveBeenCalledWith('Agent execution count', {
				event_version: '1',
				agent_id: 'agent-1',
				message_count: 0,
				token_count: 20,
				tool_call_count: 0,
			});
			expect(telemetry.getAgentExecutionCountsBuffer()).toEqual({});
		});

		test('should not buffer when rudderStack is not initialized', () => {
			// @ts-expect-error Assigning to private property
			telemetry.rudderStack = undefined;

			telemetry.trackAgentExecution({ agent_id: 'agent-1', message_count: 1 });

			expect(telemetry.getAgentExecutionCountsBuffer()).toEqual({});
		});
	});

	describe('trackAgentTurnFinished', () => {
		const configuration = {
			model: 'anthropic/claude-sonnet-4-5',
			channels: ['slack'],
			tool_types: ['custom'],
			tool_count: 1,
			num_skills: 2,
			memory_type: 'n8n_observational' as const,
		};

		test('should buffer agent session metrics without tracking immediately', () => {
			telemetry.trackAgentTurnFinished({
				agent_id: 'agent-1',
				thread_id: 'thread-1',
				run_type: 'test',
				turn_status: 'succeeded',
				configuration,
				latency_ms: 100,
				cost: 10,
				tool_call_count: 1,
			});

			expect(spyTrack).toHaveBeenCalledTimes(0);
			expect(Object.values(telemetry.getAgentSessionMetricsBuffer())).toEqual([
				expect.objectContaining({
					agent_id: 'agent-1',
					run_type: 'test',
					turn_status: 'succeeded',
					configuration,
					sessions: {
						'thread-1': {
							latency_ms: 100,
							cost: 10,
							tool_call_count: 1,
							num_skills: 2,
							turn_count: 1,
						},
					},
				}),
			]);
		});

		test('should flush session metrics with additive sums', () => {
			for (const [thread_id, latency_ms, cost, tool_call_count] of [
				['thread-1', 100, 10, 1],
				['thread-1', 200, 20, 3],
				['thread-2', 400, 40, 5],
				['thread-3', 800, 80, 7],
			] as const) {
				telemetry.trackAgentTurnFinished({
					agent_id: 'agent-1',
					thread_id,
					run_type: 'test',
					turn_status: 'succeeded',
					configuration,
					latency_ms,
					cost,
					tool_call_count,
				});
			}

			// @ts-expect-error Calling private method
			telemetry.flushAgentSessionMetrics();

			const payload = spyTrack.mock.calls.find(
				([eventName]) => eventName === 'Agent session metrics',
			)?.[1];
			expect(payload).toEqual({
				event_version: '1',
				agent_id: 'agent-1',
				...configuration,
				run_type: 'test',
				turn_status: 'succeeded',
				session_count: 3,
				turn_count: 4,
				latency_ms_sum: 1500,
				cost_sum: 150,
				tool_call_count_sum: 16,
				num_skills_sum: 6,
			});
			expect(payload).not.toHaveProperty('latency_ms_avg');
			expect(payload).not.toHaveProperty('latency_ms_p25');
			expect(payload).not.toHaveProperty('cost_avg');
			expect(payload).not.toHaveProperty('tool_call_count_p50');
			expect(payload).not.toHaveProperty('num_skills_p75');
			expect(telemetry.getAgentSessionMetricsBuffer()).toEqual({});
		});

		test('should flush turn status and run type buckets separately', () => {
			telemetry.trackAgentTurnFinished({
				agent_id: 'agent-1',
				thread_id: 'thread-1',
				run_type: 'test',
				turn_status: 'succeeded',
				configuration,
				latency_ms: 100,
				cost: 10,
				tool_call_count: 1,
			});
			telemetry.trackAgentTurnFinished({
				agent_id: 'agent-1',
				thread_id: 'thread-2',
				run_type: 'production',
				turn_status: 'failed',
				configuration,
				latency_ms: 200,
				cost: 20,
				tool_call_count: 2,
			});

			// @ts-expect-error Calling private method
			telemetry.flushAgentSessionMetrics();

			expect(spyTrack).toHaveBeenCalledWith(
				'Agent session metrics',
				expect.objectContaining({
					run_type: 'test',
					turn_status: 'succeeded',
					latency_ms_sum: 100,
				}),
			);
			expect(spyTrack).toHaveBeenCalledWith(
				'Agent session metrics',
				expect.objectContaining({
					run_type: 'production',
					turn_status: 'failed',
					latency_ms_sum: 200,
				}),
			);
		});

		test('should keep mixed turn outcomes separate for the same session', () => {
			telemetry.trackAgentTurnFinished({
				agent_id: 'agent-1',
				thread_id: 'thread-1',
				run_type: 'production',
				turn_status: 'succeeded',
				configuration,
				latency_ms: 100,
				cost: 10,
				tool_call_count: 1,
			});
			telemetry.trackAgentTurnFinished({
				agent_id: 'agent-1',
				thread_id: 'thread-1',
				run_type: 'production',
				turn_status: 'succeeded',
				configuration,
				latency_ms: 200,
				cost: 20,
				tool_call_count: 2,
			});
			telemetry.trackAgentTurnFinished({
				agent_id: 'agent-1',
				thread_id: 'thread-1',
				run_type: 'production',
				turn_status: 'failed',
				configuration,
				latency_ms: 400,
				cost: 40,
				tool_call_count: 4,
			});

			// @ts-expect-error Calling private method
			telemetry.flushAgentSessionMetrics();

			expect(spyTrack).toHaveBeenCalledWith(
				'Agent session metrics',
				expect.objectContaining({
					run_type: 'production',
					turn_status: 'succeeded',
					session_count: 1,
					turn_count: 2,
					latency_ms_sum: 300,
					cost_sum: 30,
					tool_call_count_sum: 3,
					num_skills_sum: 2,
				}),
			);
			expect(spyTrack).toHaveBeenCalledWith(
				'Agent session metrics',
				expect.objectContaining({
					run_type: 'production',
					turn_status: 'failed',
					session_count: 1,
					turn_count: 1,
					latency_ms_sum: 400,
					cost_sum: 40,
					tool_call_count_sum: 4,
					num_skills_sum: 2,
				}),
			);
		});

		test('should not emit thread IDs', () => {
			telemetry.trackAgentTurnFinished({
				agent_id: 'agent-1',
				thread_id: 'thread-1',
				run_type: 'test',
				turn_status: 'succeeded',
				configuration,
				latency_ms: 100,
				cost: 10,
				tool_call_count: 1,
			});

			// @ts-expect-error Calling private method
			telemetry.flushAgentSessionMetrics();

			const payload = spyTrack.mock.calls.find(
				([eventName]) => eventName === 'Agent session metrics',
			)?.[1];
			expect(payload).not.toHaveProperty('thread_id');
			expect(JSON.stringify(payload)).not.toContain('thread-1');
		});

		test('should not buffer when rudderStack is not initialized', () => {
			// @ts-expect-error Assigning to private property
			telemetry.rudderStack = undefined;

			telemetry.trackAgentTurnFinished({
				agent_id: 'agent-1',
				thread_id: 'thread-1',
				run_type: 'test',
				turn_status: 'succeeded',
				configuration,
				latency_ms: 100,
				cost: 10,
				tool_call_count: 1,
			});

			expect(telemetry.getAgentSessionMetricsBuffer()).toEqual({});
		});
	});

	describe('trackApiInvocation', () => {
		beforeEach(() => {
			vi.setSystemTime(testDateTime);
		});

		test('should count calls per user and endpoint', () => {
			const execTime1 = fakeJestSystemTime('2022-01-01 12:00:00');

			telemetry.trackApiInvocation({
				user_id: 'user1',
				path: '/workflows',
				method: 'GET',
				api_version: 'v1',
				user_agent: 'n8n-cli/1.0',
			});

			telemetry.trackApiInvocation({
				user_id: 'user1',
				path: '/workflows',
				method: 'GET',
				api_version: 'v1',
				user_agent: 'n8n-cli/1.0',
			});

			telemetry.trackApiInvocation({
				user_id: 'user1',
				path: '/executions',
				method: 'POST',
				api_version: 'v1',
				user_agent: 'custom-app/2.0',
			});

			const buffer = telemetry.getApiInvocationsBuffer();

			expect(buffer['user1'].total_calls).toBe(3);
			expect(buffer['user1'].first).toEqual(execTime1);
			expect(buffer['user1'].endpoints['GET /workflows']).toBe(2);
			expect(buffer['user1'].endpoints['POST /executions']).toBe(1);
			expect(buffer['user1'].user_agents['n8n-cli/1.0']).toBe(2);
			expect(buffer['user1'].user_agents['custom-app/2.0']).toBe(1);
		});

		test('should handle missing user_agent', () => {
			telemetry.trackApiInvocation({
				user_id: 'user1',
				path: '/workflows',
				method: 'GET',
				api_version: 'v1',
			});

			const buffer = telemetry.getApiInvocationsBuffer();

			expect(buffer['user1'].total_calls).toBe(1);
			expect(buffer['user1'].user_agents).toEqual({});
		});

		test('should track multiple users independently', () => {
			telemetry.trackApiInvocation({
				user_id: 'user1',
				path: '/workflows',
				method: 'GET',
				api_version: 'v1',
				user_agent: 'n8n-cli/1.0',
			});

			telemetry.trackApiInvocation({
				user_id: 'user2',
				path: '/executions',
				method: 'POST',
				api_version: 'v1',
				user_agent: 'custom-app/2.0',
			});

			const buffer = telemetry.getApiInvocationsBuffer();

			expect(buffer['user1'].total_calls).toBe(1);
			expect(buffer['user1'].endpoints['GET /workflows']).toBe(1);
			expect(buffer['user2'].total_calls).toBe(1);
			expect(buffer['user2'].endpoints['POST /executions']).toBe(1);
		});

		test('should not buffer when rudderStack is not initialized', () => {
			// @ts-expect-error Assigning to private property
			telemetry.rudderStack = undefined;

			telemetry.trackApiInvocation({
				user_id: 'user1',
				path: '/workflows',
				method: 'GET',
				api_version: 'v1',
			});

			const buffer = telemetry.getApiInvocationsBuffer();
			expect(Object.keys(buffer)).toHaveLength(0);
		});
	});

	describe('Rudderstack', () => {
		test('should fall back to instanceId for rudderStack.identify() when no userId is provided', () => {
			const traits = {
				name: 'Test User',
				age: 30,
				isActive: true,
			};

			telemetry.identify(traits);

			expect(mockRudderStack.identify).toHaveBeenCalledWith({
				userId: instanceId,
				traits: { ...traits, instanceId },
				context: { ip: '0.0.0.0' },
			});
		});

		test('should call rudderStack.identify() with composite userId when userId is provided', () => {
			const traits = {
				name: 'Test User',
				age: 30,
				isActive: true,
			};

			telemetry.identify(traits, 'user-123');

			expect(mockRudderStack.identify).toHaveBeenCalledWith({
				userId: `${instanceId}#user-123`,
				traits: { ...traits, instanceId },
				context: { ip: '0.0.0.0' },
			});
		});

		test('should fall back to instanceId for rudderStack.group() when no userId is provided', () => {
			const traits = { version: '1.0' } as Record<string, string | number>;

			telemetry.groupIdentify({ traits });

			expect(mockRudderStack.group).toHaveBeenCalledWith({
				groupId: instanceId,
				userId: instanceId,
				traits,
				context: { ip: '0.0.0.0' },
			});
		});

		test('should call rudderStack.group() with composite userId when userId is provided', () => {
			const traits = { version: '1.0' } as Record<string, string | number>;

			telemetry.groupIdentify({ userId: 'user-123', traits });

			expect(mockRudderStack.group).toHaveBeenCalledWith({
				groupId: instanceId,
				userId: `${instanceId}#user-123`,
				traits,
				context: { ip: '0.0.0.0' },
			});
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

		test('should include instance_id, version_cli, and user_id in track properties', () => {
			const eventName = 'Test Event';
			const properties = { user_id: '1234', custom_prop: 'value' };

			telemetry.track(eventName, properties);

			expect(mockRudderStack.track).toHaveBeenCalledWith(
				expect.objectContaining({
					event: eventName,
					properties: expect.objectContaining({
						instance_id: instanceId,
						user_id: '1234',
						version_cli: expect.any(String),
						custom_prop: 'value',
					}),
				}),
			);
		});

		test('should format userId with user_id when provided', () => {
			const eventName = 'Test Event';
			const properties = { user_id: '5678' };

			telemetry.track(eventName, properties);

			expect(mockRudderStack.track).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: `${instanceId}#5678`,
				}),
			);
		});

		test('should format userId without user_id when not provided', () => {
			const eventName = 'Test Event';

			telemetry.track(eventName, {});

			expect(mockRudderStack.track).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: instanceId,
				}),
			);
		});

		test('should set user_id to undefined when not provided in properties', () => {
			const eventName = 'Test Event';

			telemetry.track(eventName, {});

			expect(mockRudderStack.track).toHaveBeenCalledWith(
				expect.objectContaining({
					properties: expect.objectContaining({
						user_id: undefined,
					}),
				}),
			);
		});
	});
});

const fakeJestSystemTime = (dateTime: string | Date): Date => {
	const dt = new Date(dateTime);
	vi.setSystemTime(dt);
	return dt;
};
