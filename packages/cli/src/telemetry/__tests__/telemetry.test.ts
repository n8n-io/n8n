import type { Logger } from '@n8n/backend-common';
import type { OutboundHttp } from '@n8n/backend-network';
import { InstanceRegistryProxyService, TelemetryProxy } from '@n8n/backend-services';
import { mockInstance } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import { ProjectRelationRepository, ProjectRepository, UserRepository } from '@n8n/db';
import type { WorkflowRepository } from '@n8n/db';
import { defineTelemetryEvents } from '@n8n/telemetry';
import type RudderStack from '@rudderstack/rudder-sdk-node';
import { InstanceSettings } from 'n8n-core';
import type { MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { z } from 'zod/v4';

import type { License } from '@/license';
import { USER_CALLED_MCP_TOOL_EVENT } from '@/modules/mcp/mcp.constants';
import { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';
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
	let postHog: PostHogClient;
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

		postHog = new PostHogClient(instanceSettings, mock());
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

			expect(transport).toHaveBeenCalledWith({ useDefaultSsrfPolicy: 'unsafe' });
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

		test.each([
			{
				case: 'diagnostics are on',
				enabled: true,
				backendConfig: 'test-key;https://data-plane.test',
			},
			{
				case: 'diagnostics are off',
				enabled: false,
				backendConfig: 'test-key;https://data-plane.test',
			},
			{ case: 'the backend config is invalid', enabled: true, backendConfig: 'missing-data-plane' },
		])(
			'should register itself on the telemetry proxy when $case',
			async ({ enabled, backendConfig }) => {
				const telemetryProxy = mockInstance(TelemetryProxy);
				initConfig.diagnostics.enabled = enabled;
				initConfig.diagnostics.backendConfig = backendConfig;

				await initTelemetry.init();

				expect(telemetryProxy.registerProvider).toHaveBeenCalledWith(initTelemetry);
				initConfig.diagnostics.enabled = true;
			},
		);
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
			const execTime1 = fakeTestSystemTime('2022-01-01 12:00:00');
			telemetry.trackWorkflowExecution(payload);
			fakeTestSystemTime('2022-01-01 12:30:00');
			telemetry.trackWorkflowExecution(payload);

			payload.is_manual = false;
			payload.success = true;
			const execTime2 = fakeTestSystemTime('2022-01-01 13:00:00');
			telemetry.trackWorkflowExecution(payload);
			fakeTestSystemTime('2022-01-01 12:30:00');
			telemetry.trackWorkflowExecution(payload);

			payload.is_manual = true;
			payload.success = false;
			const execTime3 = fakeTestSystemTime('2022-01-01 14:00:00');
			telemetry.trackWorkflowExecution(payload);
			fakeTestSystemTime('2022-01-01 12:30:00');
			telemetry.trackWorkflowExecution(payload);

			payload.is_manual = false;
			payload.success = false;
			const execTime4 = fakeTestSystemTime('2022-01-01 15:00:00');
			telemetry.trackWorkflowExecution(payload);
			fakeTestSystemTime('2022-01-01 12:30:00');
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

			const userManualExecTime = fakeTestSystemTime('2022-01-01 12:00:00');
			telemetry.trackWorkflowExecution(payload);

			payload.execution_source = 'instance_ai';
			payload.mock_data_sources = 'trigger_input';

			const instanceAiMockManualExecTime = fakeTestSystemTime('2022-01-01 13:00:00');
			telemetry.trackWorkflowExecution(payload);

			payload.is_manual = false;
			delete payload.mock_data_sources;

			const instanceAiRealProdExecTime = fakeTestSystemTime('2022-01-01 14:00:00');
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

		test('should count runs that use personal credentials in the aggregate, not as events', async () => {
			const payload: Parameters<Telemetry['trackWorkflowExecution']>[0] = {
				workflow_id: '1',
				is_manual: false,
				success: true,
				personal_credentials_count: 2,
			};

			const firstProdExecTime = fakeTestSystemTime('2022-01-01 12:00:00');
			telemetry.trackWorkflowExecution(payload);
			fakeTestSystemTime('2022-01-01 12:30:00');
			telemetry.trackWorkflowExecution({ ...payload, success: false });

			const manualExecTime = fakeTestSystemTime('2022-01-01 13:00:00');
			telemetry.trackWorkflowExecution({ ...payload, is_manual: true });

			telemetry.trackWorkflowExecution({ ...payload, personal_credentials_count: undefined });

			expect(spyTrack).not.toHaveBeenCalled();

			const execBuffer = telemetry.getCountsBuffer();

			expect(execBuffer['1'].personal_credentials_prod?.count).toBe(2);
			expect(execBuffer['1'].personal_credentials_prod?.first).toEqual(firstProdExecTime);
			expect(execBuffer['1'].personal_credentials_manual?.count).toBe(1);
			expect(execBuffer['1'].personal_credentials_manual?.first).toEqual(manualExecTime);
		});

		test('should fire "Workflow execution errored" event for failed executions', async () => {
			const payload = {
				workflow_id: '1',
				is_manual: true,
				success: false,
				error_node_type: 'custom-nodes-base.node-type',
			};

			const execTime1 = fakeTestSystemTime('2022-01-01 12:00:00');
			telemetry.trackWorkflowExecution(payload);
			fakeTestSystemTime('2022-01-01 12:30:00');
			telemetry.trackWorkflowExecution(payload);

			let execBuffer = telemetry.getCountsBuffer();

			// should not fire event for custom nodes
			expect(spyTrack).toHaveBeenCalledTimes(0);
			expect(execBuffer['1'].manual_error?.count).toBe(2);
			expect(execBuffer['1'].manual_error?.first).toEqual(execTime1);

			payload.error_node_type = 'n8n-nodes-base.node-type';
			fakeTestSystemTime('2022-01-01 13:00:00');
			telemetry.trackWorkflowExecution(payload);
			fakeTestSystemTime('2022-01-01 12:30:00');
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
			const execTime1 = fakeTestSystemTime('2022-01-01 12:00:00');
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
			const execTime2 = fakeTestSystemTime('2022-01-01 12:00:00');
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
			const execTime1 = fakeTestSystemTime('2022-01-01 12:00:00');
			telemetry.trackWorkflowExecution(payload);
			fakeTestSystemTime('2022-01-01 12:30:00');
			telemetry.trackWorkflowExecution(payload);

			// Production crashed execution
			payload.is_manual = false;
			const execTime2 = fakeTestSystemTime('2022-01-01 13:00:00');
			telemetry.trackWorkflowExecution(payload);
			fakeTestSystemTime('2022-01-01 13:30:00');
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

			const execTime1 = fakeTestSystemTime('2022-01-01 12:00:00');
			telemetry.trackWorkflowExecution(payload1);

			const execTime2 = fakeTestSystemTime('2022-01-01 13:00:00');
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

	describe('trackApiInvocation', () => {
		beforeEach(() => {
			vi.setSystemTime(testDateTime);
		});

		test('should count calls per user and endpoint', () => {
			const execTime1 = fakeTestSystemTime('2022-01-01 12:00:00');

			telemetry.trackApiInvocation({
				user_id: 'user1',
				path: '/workflows',
				method: 'GET',
				api_version: 'v1',
				user_agent: 'n8n-cli/1.0',
				client: 'other',
			});

			telemetry.trackApiInvocation({
				user_id: 'user1',
				path: '/workflows',
				method: 'GET',
				api_version: 'v1',
				user_agent: 'n8n-cli/1.0',
				client: 'other',
			});

			telemetry.trackApiInvocation({
				user_id: 'user1',
				path: '/executions',
				method: 'POST',
				api_version: 'v1',
				user_agent: 'custom-app/2.0',
				client: 'other',
			});

			const buffer = telemetry.getApiInvocationsBuffer();

			expect(buffer['user1'].total_calls).toBe(3);
			expect(buffer['user1'].first).toEqual(execTime1);
			expect(buffer['user1'].endpoints['GET /workflows']).toBe(2);
			expect(buffer['user1'].endpoints['POST /executions']).toBe(1);
			expect(buffer['user1'].user_agents['n8n-cli/1.0']).toBe(2);
			expect(buffer['user1'].user_agents['custom-app/2.0']).toBe(1);
			expect(buffer['user1'].clients).toEqual({ editor_ui: 0, other: 3 });
		});

		test('should handle missing user_agent', () => {
			telemetry.trackApiInvocation({
				user_id: 'user1',
				path: '/workflows',
				method: 'GET',
				api_version: 'v1',
				client: 'other',
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
				client: 'other',
			});

			telemetry.trackApiInvocation({
				user_id: 'user2',
				path: '/executions',
				method: 'POST',
				api_version: 'v1',
				user_agent: 'custom-app/2.0',
				client: 'other',
			});

			const buffer = telemetry.getApiInvocationsBuffer();

			expect(buffer['user1'].total_calls).toBe(1);
			expect(buffer['user1'].endpoints['GET /workflows']).toBe(1);
			expect(buffer['user2'].total_calls).toBe(1);
			expect(buffer['user2'].endpoints['POST /executions']).toBe(1);
		});

		test('should count calls for the editor_ui client in the same entry', () => {
			telemetry.trackApiInvocation({
				user_id: 'user1',
				path: '/workflows',
				method: 'GET',
				api_version: 'v1',
				client: 'other',
			});

			telemetry.trackApiInvocation({
				user_id: 'user1',
				path: '/workflows',
				method: 'GET',
				api_version: 'v1',
				client: 'editor_ui',
			});

			telemetry.trackApiInvocation({
				user_id: 'user1',
				path: '/executions',
				method: 'GET',
				api_version: 'v1',
				client: 'other',
			});

			const buffer = telemetry.getApiInvocationsBuffer();

			expect(buffer).toStrictEqual({
				user1: {
					clients: { editor_ui: 1, other: 2 },
					total_calls: 3,
					endpoints: {
						'GET /workflows': 2,
						'GET /executions': 1,
					},
					endpoints_by_client: { editor_ui: { 'GET /workflows': 1 } },
					first: expect.any(Date),
					user_agents: {},
				},
			});
		});

		test('should not buffer when rudderStack is not initialized', () => {
			// @ts-expect-error Assigning to private property
			telemetry.rudderStack = undefined;

			telemetry.trackApiInvocation({
				user_id: 'user1',
				path: '/workflows',
				method: 'GET',
				api_version: 'v1',
				client: 'other',
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
			expect(postHog.groupIdentify).not.toHaveBeenCalled();
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
			expect(postHog.groupIdentify).toHaveBeenCalledWith({
				distinctId: `${instanceId}#user-123`,
				instanceId,
				properties: traits,
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

		test('should call rudderStack.track() with the user_cloud_id context trait when set', () => {
			telemetry.setUserCloudId('cloud-user-123');

			telemetry.track('Test Event', { user_id: '1234' });

			expect(mockRudderStack.track).toHaveBeenCalledWith(
				expect.objectContaining({
					context: {
						ip: '0.0.0.0',
						traits: { user_cloud_id: 'cloud-user-123' },
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

		test('redacts MCP tool call properties before sending the event', () => {
			const agentId = 'sk-proj-example0123456789abcdef0123456789';
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, {
				user_id: 'user-1',
				tool_name: 'validate_agent',
				parameters: { agentId, settings: { apiKey: 'example-value' } },
				results: { success: false, error: `Agent "${agentId}" not found` },
			});

			expect(mockRudderStack.track).toHaveBeenCalledWith(
				expect.objectContaining({
					event: USER_CALLED_MCP_TOOL_EVENT,
					properties: expect.objectContaining({
						user_id: 'user-1',
						tool_name: 'validate_agent',
						parameters: { agentId: '[REDACTED]', settings: { apiKey: '[REDACTED]' } },
						results: { success: false, error: 'Agent "[REDACTED]" not found' },
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

	describe('groupIdentify', () => {
		const traits = { version: '1.0' } as Record<string, string | number>;

		test('should send the PostHog override to PostHog only', () => {
			telemetry.groupIdentify({ traits, postHog: { userId: 'owner-1', traits } });

			expect(postHog.groupIdentify).toHaveBeenLastCalledWith({
				distinctId: `${instanceId}#owner-1`,
				instanceId,
				properties: traits,
			});
			expect(mockRudderStack.group).toHaveBeenLastCalledWith({
				groupId: instanceId,
				userId: instanceId,
				traits,
				context: { ip: '0.0.0.0' },
			});
		});

		test('should keep RudderStack traits unchanged when only PostHog gets them', () => {
			telemetry.groupIdentify({ userId: 'owner-1', postHog: { userId: 'owner-1', traits } });

			expect(postHog.groupIdentify).toHaveBeenLastCalledWith({
				distinctId: `${instanceId}#owner-1`,
				instanceId,
				properties: traits,
			});
			expect(mockRudderStack.group).toHaveBeenLastCalledWith({
				groupId: instanceId,
				userId: `${instanceId}#owner-1`,
				traits: undefined,
				context: { ip: '0.0.0.0' },
			});
		});
	});

	describe('track() with registry entries', () => {
		const TEST_TELEMETRY = defineTelemetryEvents({
			USER_TESTED_REGISTRY_ENTRY: {
				name: 'User tested registry entry',
				description: 'Fires when the registry entry pipeline is exercised in tests.',
				properties: z.object({ workflow_id: z.string() }),
			},
		});

		test('should emit the entry name and properties through the standard pipeline', () => {
			telemetry.track(TEST_TELEMETRY.USER_TESTED_REGISTRY_ENTRY, { workflow_id: 'wf-1' });

			expect(mockRudderStack.track).toHaveBeenCalledWith(
				expect.objectContaining({
					event: 'User tested registry entry',
					properties: expect.objectContaining({ workflow_id: 'wf-1' }),
					context: expect.objectContaining({ ip: '0.0.0.0' }),
				}),
			);
		});

		test('should warn and still emit when properties do not match the schema', () => {
			const logger = mock<Logger>();
			const validationTelemetry = new Telemetry(
				logger,
				new PostHogClient(instanceSettings, mock()),
				mock(),
				instanceSettings,
				mock(),
				globalConfig,
				mock(),
				mock(),
			);
			// @ts-expect-error Assigning to private property
			validationTelemetry.rudderStack = mockRudderStack;

			expect(() =>
				validationTelemetry.track(TEST_TELEMETRY.USER_TESTED_REGISTRY_ENTRY, {
					workflow_id: 123 as unknown as string,
				}),
			).not.toThrow();

			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('"User tested registry entry" failed schema validation'),
			);
			expect(mockRudderStack.track).toHaveBeenCalledWith(
				expect.objectContaining({
					event: 'User tested registry entry',
					properties: expect.objectContaining({ workflow_id: 123 }),
				}),
			);
		});

		test('should warn about schema mismatches even when RudderStack is not initialized', () => {
			const logger = mock<Logger>();
			const uninitializedTelemetry = new Telemetry(
				logger,
				new PostHogClient(instanceSettings, mock()),
				mock(),
				instanceSettings,
				mock(),
				globalConfig,
				mock(),
				mock(),
			);

			uninitializedTelemetry.track(TEST_TELEMETRY.USER_TESTED_REGISTRY_ENTRY, {
				workflow_id: 123 as unknown as string,
			});

			expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('failed schema validation'));
		});

		describe('missing user_id', () => {
			const USER_SCOPED_TELEMETRY = defineTelemetryEvents({
				USER_TESTED_USER_SCOPED_ENTRY: {
					name: 'User tested user scoped entry',
					description: 'Fires when a registry entry that names its user is exercised in tests.',
					properties: z.object({ user_id: z.string() }),
				},
			});

			const buildTelemetry = () => {
				const logger = mock<Logger>();
				const instance = new Telemetry(
					logger,
					new PostHogClient(instanceSettings, mock()),
					mock(),
					instanceSettings,
					mock(),
					globalConfig,
					mock(),
					mock(),
				);
				// @ts-expect-error Assigning to private property
				instance.rudderStack = mockRudderStack;
				return { logger, instance };
			};

			const missingUserIdWarnings = (logger: Logger) =>
				vi
					.mocked(logger.warn)
					.mock.calls.filter(([message]) => message.includes('carries no user_id'));

			test('should warn once per event name', () => {
				const { logger, instance } = buildTelemetry();

				instance.track(TEST_TELEMETRY.USER_TESTED_REGISTRY_ENTRY, { workflow_id: 'wf-1' });
				instance.track(TEST_TELEMETRY.USER_TESTED_REGISTRY_ENTRY, { workflow_id: 'wf-2' });

				const warnings = missingUserIdWarnings(logger);
				expect(warnings).toHaveLength(1);
				expect(warnings[0][0]).toContain('"User tested registry entry"');
			});

			test('should stay quiet when the event carries a user_id', () => {
				const { logger, instance } = buildTelemetry();

				instance.track(USER_SCOPED_TELEMETRY.USER_TESTED_USER_SCOPED_ENTRY, { user_id: 'u-1' });

				expect(missingUserIdWarnings(logger)).toHaveLength(0);
			});

			test('should stay quiet for an unregistered event, which declares no schema', () => {
				const { logger, instance } = buildTelemetry();

				instance.track('pulse', {});

				expect(missingUserIdWarnings(logger)).toHaveLength(0);
			});
		});
	});

	describe('sendPulsePacket', () => {
		const license = mock<License>({
			getPlanName: () => 'enterprise',
			getTriggerLimit: () => 400,
		});
		const workflowRepository = mock<WorkflowRepository>({
			getActiveTriggerCount: async () => 7,
		});

		let pulseTelemetry: Telemetry;

		beforeEach(() => {
			mockPulsePacketSources();

			pulseTelemetry = new Telemetry(
				mock(),
				new PostHogClient(instanceSettings, mock()),
				license,
				instanceSettings,
				workflowRepository,
				globalConfig,
				mock(),
				mock(),
			);
		});

		afterEach(async () => {
			await pulseTelemetry.stopTracking();
		});

		test('should send one packet of instance-wide counters', async () => {
			// @ts-expect-error Assigning to private property
			pulseTelemetry.rudderStack = mockRudderStack;

			await pulseTelemetry.sendPulsePacket();

			expect(spyTrack).toHaveBeenCalledWith('pulse', {
				plan_name_current: 'enterprise',
				quota: 400,
				usage: 7,
				role_count: { owner: 1 },
				source_control_set_up: 'main',
				branchName: 'main',
				read_only_instance: true,
				team_projects: 2,
				project_role_count: {
					'project:admin': 4,
					'project:chatUser': 0,
					'project:editor': 0,
					'project:personalOwner': 0,
					'project:viewer': 0,
				},
				processes: [
					{ type: 'main', cpu: 2, memory_kib: 2048, version: '1.0.0', count: 1 },
					{ type: 'worker', cpu: null, memory_kib: null, version: '1.0.0', count: 1 },
				],
			});
		});

		test('should send nothing when RudderStack is not initialized', async () => {
			await pulseTelemetry.sendPulsePacket();

			expect(spyTrack).not.toHaveBeenCalled();
		});
	});

	describe('flushBuffers', () => {
		test('should send the buffered events and empty the buffers', () => {
			telemetry.trackApiInvocation({
				user_id: 'user1',
				path: '/workflows',
				method: 'GET',
				api_version: 'v1',
				client: 'other',
			});

			telemetry.flushBuffers();

			expect(spyTrack).toHaveBeenCalledWith(
				'Public API usage',
				expect.objectContaining({
					user_id: 'user1',
					total_calls: 1,
					clients: JSON.stringify({ editor_ui: 0, other: 1 }),
					endpoints_by_client: JSON.stringify({ editor_ui: {} }),
				}),
			);
			expect(spyTrack).not.toHaveBeenCalledWith('pulse', expect.anything());
			expect(telemetry.getApiInvocationsBuffer()).toEqual({});
		});

		test('should run the added flushers between the workflow counts and the API usage', () => {
			const flushOrder: string[] = [];
			spyTrack.mockImplementation((event: string) => flushOrder.push(event));
			telemetry.addBufferFlusher(() => flushOrder.push('first flusher'));
			telemetry.addBufferFlusher(() => flushOrder.push('second flusher'));
			telemetry.trackWorkflowExecution({ workflow_id: '1', is_manual: true, success: true });
			telemetry.trackApiInvocation({
				user_id: 'user1',
				path: '/workflows',
				method: 'GET',
				api_version: 'v1',
				client: 'other',
			});

			telemetry.flushBuffers();

			expect(flushOrder).toEqual([
				'Workflow execution count',
				'first flusher',
				'second flusher',
				'Public API usage',
			]);
		});

		test('should send nothing when RudderStack is not initialized', () => {
			const flusher = vi.fn();
			telemetry.addBufferFlusher(flusher);
			// @ts-expect-error Assigning to private property
			telemetry.rudderStack = undefined;

			telemetry.flushBuffers();

			expect(spyTrack).not.toHaveBeenCalled();
			expect(flusher).not.toHaveBeenCalled();
		});
	});

	describe('isEnabled', () => {
		test('should return true when RudderStack is initialized', () => {
			expect(telemetry.isEnabled()).toBe(true);
		});

		test('should return false when RudderStack is not initialized', () => {
			// @ts-expect-error Assigning to private property
			telemetry.rudderStack = undefined;

			expect(telemetry.isEnabled()).toBe(false);
		});
	});
});

/** Registers the services the pulse packet reads its counters from. */
const mockPulsePacketSources = () => {
	mockInstance(InstanceRegistryProxyService, {
		getAllInstances: async () => [
			{
				schemaVersion: 1,
				instanceKey: 'k1',
				hostId: 'main-1',
				instanceType: 'main',
				instanceRole: 'leader',
				version: '1.0.0',
				registeredAt: 0,
				lastSeen: 0,
				cpuLimit: 2,
				memoryLimit: 2048 * 1024,
			},
			{
				schemaVersion: 1,
				instanceKey: 'k2',
				hostId: 'worker-1',
				instanceType: 'worker',
				instanceRole: 'unset',
				version: '1.0.0',
				registeredAt: 0,
				lastSeen: 0,
				cpuLimit: null,
				memoryLimit: null,
			},
		],
	});
	mockInstance(SourceControlPreferencesService, {
		getPreferences: () => mock({ branchName: 'main', branchReadOnly: true }),
		isSourceControlSetup: () => 'main',
	});
	mockInstance(UserRepository, { countUsersByRole: async () => ({ owner: 1 }) });
	mockInstance(ProjectRepository, { getProjectCounts: async () => ({ personal: 3, team: 2 }) });
	mockInstance(ProjectRelationRepository, {
		countUsersByRole: async () => ({
			'project:admin': 4,
			'project:chatUser': 0,
			'project:editor': 0,
			'project:personalOwner': 0,
			'project:viewer': 0,
		}),
	});
};

const fakeTestSystemTime = (dateTime: string | Date): Date => {
	const dt = new Date(dateTime);
	vi.setSystemTime(dt);
	return dt;
};
