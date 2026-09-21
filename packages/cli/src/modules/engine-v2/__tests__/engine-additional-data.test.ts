import type { SsrfProtectionService } from '@n8n/backend-network';
import type { GlobalConfig, SsrfProtectionConfig } from '@n8n/config';
import { UnimplementedError } from '@n8n/engine';
import type { ExternalSecretsProxy } from 'n8n-core';
import type { ICredentialsHelper } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { EventService } from '@/events/event.service';
import type { UrlService } from '@/services/url.service';

import { EngineAdditionalDataBuilder } from '../engine-additional-data';

describe('EngineAdditionalDataBuilder', () => {
	const urlService = mock<UrlService>({
		getWebhookBaseUrl: () => 'http://n8n.test/',
		getTestWebhookBaseUrl: () => 'http://n8n.test/',
		getInstanceBaseUrl: () => 'http://n8n.test',
	});
	const globalConfig = mock<GlobalConfig>({
		endpoints: {
			rest: 'rest',
			form: 'form',
			formWaiting: 'form-waiting',
			formTest: 'form-test',
			webhook: 'webhook',
			webhookWaiting: 'webhook-waiting',
			webhookTest: 'webhook-test',
			mcp: 'mcp',
			mcpTest: 'mcp-test',
		} as GlobalConfig['endpoints'],
	});
	const eventService = mock<EventService>();
	const externalSecretsProxy = mock<ExternalSecretsProxy>();
	const credentialsHelper = mock<ICredentialsHelper>();
	const ssrfProtectionService = mock<SsrfProtectionService>();

	const context = {
		executionId: 'exec-1',
		workflowId: 'wf-1',
		mode: 'manual' as const,
		userId: 'user-1',
		projectId: 'project-1',
	};

	const build = ({ ssrfEnabled = false } = {}) =>
		new EngineAdditionalDataBuilder(
			urlService,
			globalConfig,
			eventService,
			externalSecretsProxy,
			mock<SsrfProtectionConfig>({ enabled: ssrfEnabled }),
			ssrfProtectionService,
		).build(context, credentialsHelper);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('tags the data with the ids of the step', () => {
		expect(build()).toMatchObject({
			executionId: 'exec-1',
			workflowId: 'wf-1',
			userId: 'user-1',
			projectId: 'project-1',
			currentNodeExecutionIndex: 0,
		});
	});

	it('builds every URL from config, so no control plane lookup is needed', () => {
		expect(build()).toMatchObject({
			restApiUrl: 'http://n8n.test/rest',
			instanceBaseUrl: 'http://n8n.test/',
			formBaseUrl: 'http://n8n.test/form',
			formWaitingBaseUrl: 'http://n8n.test/form-waiting',
			formTestBaseUrl: 'http://n8n.test/form-test',
			webhookBaseUrl: 'http://n8n.test/webhook',
			webhookWaitingBaseUrl: 'http://n8n.test/webhook-waiting',
			webhookTestBaseUrl: 'http://n8n.test/webhook-test',
			mcpBaseUrl: 'http://n8n.test/mcp',
			mcpTestBaseUrl: 'http://n8n.test/mcp-test',
		});
	});

	it('uses the credentials helper it is given', () => {
		expect(build().credentialsHelper).toBe(credentialsHelper);
	});

	it('exposes the external secrets proxy of this process', () => {
		expect(build().externalSecretsProxy).toBe(externalSecretsProxy);
	});

	it('fails on the first $vars read instead of resolving undefined', () => {
		expect(() => build().variables.someName).toThrow(UnimplementedError);
	});

	it('attaches the SSRF bridge when protection is enabled', () => {
		expect(build({ ssrfEnabled: true }).ssrfBridge).toBe(ssrfProtectionService);
	});

	it('attaches no SSRF bridge when protection is disabled', () => {
		expect(build().ssrfBridge).toBeUndefined();
	});

	it('forwards AI events to the event service', () => {
		build().logAiEvent('ai-messages-retrieved-from-memory', {
			msg: 'hi',
			workflowName: 'test',
			executionId: 'exec-1',
			nodeName: 'Code',
		});

		expect(eventService.emit).toHaveBeenCalledWith(
			'ai-messages-retrieved-from-memory',
			expect.objectContaining({ msg: 'hi' }),
		);
	});

	describe('task runners', () => {
		it('reports every runner as unavailable, so the Code node fails before it waits', () => {
			// No reason: the Code node reads it as a Python install problem key.
			expect(build().getRunnerStatus?.('python')).toEqual({ available: false });
		});

		it('rejects a runner task and names the feature', async () => {
			const data = build();

			const error = await data
				.startRunnerTask(
					data,
					'javascript',
					{},
					mock(),
					{ main: [] },
					mock(),
					mock(),
					mock(),
					0,
					0,
					'Code',
					[],
					{},
					'manual',
					mock(),
				)
				.catch((e: unknown) => e);

			expect(error).toBeInstanceOf(UnimplementedError);
			expect((error as Error).message).toContain('Task runners');
		});
	});

	describe('control plane capabilities', () => {
		it.each([
			['executeWorkflow', 'Sub-workflows'],
			['executeAgent', 'Agents'],
			['listAgents', 'Agents'],
			['getRunExecutionData', 'Reading another execution'],
			['getRuntimeCredential', 'Runtime credentials'],
		] as const)('%s rejects and names the feature', async (method, feature) => {
			const data = build() as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>;

			const error = await data[method]().catch((e: unknown) => e);

			expect(error).toBeInstanceOf(UnimplementedError);
			expect((error as Error).message).toContain(feature);
		});

		it('setExecutionStatus throws and names the feature', () => {
			expect(() => build().setExecutionStatus?.('running')).toThrow(UnimplementedError);
		});
	});
});
