import { MOONSHOTAI_KIMI_K3_MODEL_ID, UNLIMITED_CREDITS } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { OutboundHttp } from '@n8n/backend-network';
import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { AiService } from '@/services/ai.service';

const capturedTokenGetters: Array<() => Promise<unknown>> = [];
vi.mock('@/services/proxy-token-manager', () => ({
	ProxyTokenManager: class {
		constructor(fetchToken: () => Promise<unknown>) {
			capturedTokenGetters.push(fetchToken);
		}
		getAuthHeaders = vi.fn();
	},
}));

const createProxyLanguageModel = vi.hoisted(() => vi.fn());
vi.mock('@/utils/ai-proxy-language-model', () => ({
	createProxyLanguageModel: (...args: unknown[]) => createProxyLanguageModel(...args),
}));

import { InstanceAiModelService } from '../instance-ai-model.service';
import type { InstanceAiSettingsService } from '../instance-ai-settings.service';

const fakeUser = { id: 'user-1' } as User;

function createClient() {
	return {
		getApiProxyBaseUrl: vi.fn(() => 'https://proxy.base'),
		getInstanceAiApiProxyToken: vi
			.fn()
			.mockResolvedValue({ tokenType: 'Bearer', accessToken: 'ia-tok' }),
		getInstanceAiCredits: vi.fn().mockResolvedValue({ creditsQuota: 5700, creditsClaimed: 12 }),
	};
}

describe('InstanceAiModelService', () => {
	const settingsService = mock<InstanceAiSettingsService>();
	const aiService = mock<AiService>();
	const outboundHttp = mock<OutboundHttp>();
	const logger = mock<Logger>();

	let service: InstanceAiModelService;

	beforeEach(() => {
		vi.clearAllMocks();
		capturedTokenGetters.length = 0;
		service = new InstanceAiModelService(settingsService, aiService, outboundHttp, logger);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('getModelFetch', () => {
		it('builds the AI transport once and reuses it', () => {
			const baseFetch = vi.fn();
			outboundHttp.transport.mockReturnValue({ asCustomFetch: () => baseFetch } as never);

			expect(service.getModelFetch()).toBe(baseFetch);
			expect(service.getModelFetch()).toBe(baseFetch);
			expect(outboundHttp.transport).toHaveBeenCalledTimes(1);
			expect(outboundHttp.transport).toHaveBeenCalledWith(
				expect.objectContaining({ proxy: 'env', useDefaultSsrfPolicy: 'unsafe' }),
			);
		});
	});

	describe('isProxyEnabled', () => {
		it('should mirror the AI service proxy state', () => {
			aiService.isProxyEnabled.mockReturnValue(true);
			expect(service.isProxyEnabled()).toBe(true);

			aiService.isProxyEnabled.mockReturnValue(false);
			expect(service.isProxyEnabled()).toBe(false);
		});
	});

	describe('getCredits', () => {
		it('should return unlimited credits when the proxy is disabled', async () => {
			aiService.isProxyEnabled.mockReturnValue(false);

			await expect(service.getCredits(fakeUser)).resolves.toEqual({
				creditsQuota: UNLIMITED_CREDITS,
				creditsClaimed: 0,
			});
			expect(aiService.getClient).not.toHaveBeenCalled();
		});

		it('should fetch instance-ai credits from the proxy client when enabled', async () => {
			aiService.isProxyEnabled.mockReturnValue(true);
			const client = createClient();
			aiService.getClient.mockResolvedValue(client as never);

			await expect(service.getCredits(fakeUser)).resolves.toEqual({
				creditsQuota: 5700,
				creditsClaimed: 12,
			});
			expect(client.getInstanceAiCredits).toHaveBeenCalledWith({ id: 'user-1' });
		});

		it('should retry transient failures when fetching credits', async () => {
			vi.useFakeTimers();
			aiService.isProxyEnabled.mockReturnValue(true);
			const transient = Object.assign(new Error('Bad Gateway'), { statusCode: 502 });
			const client = createClient();
			client.getInstanceAiCredits
				.mockRejectedValueOnce(transient)
				.mockResolvedValue({ creditsQuota: 5700, creditsClaimed: 12 });
			aiService.getClient.mockResolvedValue(client as never);

			const promise = service.getCredits(fakeUser);
			await vi.runAllTimersAsync();

			await expect(promise).resolves.toEqual({
				creditsQuota: 5700,
				creditsClaimed: 12,
			});
			expect(client.getInstanceAiCredits).toHaveBeenCalledTimes(2);
		});
	});

	describe('resolveAgentModelConfig', () => {
		it('should fall back to the settings model config when no proxy is active', async () => {
			aiService.isProxyEnabled.mockReturnValue(false);
			settingsService.resolveModelConfig.mockResolvedValue('anthropic/claude' as never);

			await expect(service.resolveAgentModelConfig(fakeUser)).resolves.toBe('anthropic/claude');
		});

		it('should mint proxy tokens via the instance-ai endpoint when the proxy is active', async () => {
			aiService.isProxyEnabled.mockReturnValue(true);
			const client = createClient();
			aiService.getClient.mockResolvedValue(client as never);
			vi.spyOn(service, 'resolveProxyModel').mockResolvedValue('model' as never);

			await service.resolveAgentModelConfig(fakeUser);

			expect(capturedTokenGetters).toHaveLength(1);
			await capturedTokenGetters[0]();

			expect(client.getInstanceAiApiProxyToken).toHaveBeenCalledWith(
				{ id: fakeUser.id },
				expect.objectContaining({ userMessageId: expect.any(String) }),
			);
		});
	});

	describe('resolveProxyModel', () => {
		const tokenManager = { getAuthHeaders: vi.fn() } as never;

		it('passes the exact Kimi id to the shared proxy factory', async () => {
			settingsService.getConfiguredModelId.mockReturnValue(MOONSHOTAI_KIMI_K3_MODEL_ID);
			createProxyLanguageModel.mockResolvedValue({
				provider: 'moonshotai',
				modelId: 'kimi-k3',
			});

			await service.resolveProxyModel(fakeUser, 'https://proxy.base/', tokenManager);

			expect(createProxyLanguageModel).toHaveBeenCalledWith({
				proxyBaseUrl: 'https://proxy.base/',
				modelId: MOONSHOTAI_KIMI_K3_MODEL_ID,
				tokenManager,
				feature: 'instance-ai',
				n8nVersion: expect.any(String),
				outboundHttp,
				runId: undefined,
				threadId: undefined,
			});
			expect(settingsService.resolveModelName).not.toHaveBeenCalled();
		});

		it('forwards the caller-provided run and thread ids to the proxy factory', async () => {
			settingsService.getConfiguredModelId.mockReturnValue(MOONSHOTAI_KIMI_K3_MODEL_ID);
			createProxyLanguageModel.mockResolvedValue({
				provider: 'moonshotai',
				modelId: 'kimi-k3',
			});

			await service.resolveProxyModel(fakeUser, 'https://proxy.base/', tokenManager, {
				runId: 'run-42',
				threadId: 'thread-7',
			});

			expect(createProxyLanguageModel).toHaveBeenCalledWith(
				expect.objectContaining({ runId: 'run-42', threadId: 'thread-7' }),
			);
		});

		it('keeps Anthropic routing for other configured models', async () => {
			settingsService.getConfiguredModelId.mockReturnValue('anthropic/claude-opus-5');
			settingsService.resolveModelName.mockReturnValue('claude-opus-5');
			createProxyLanguageModel.mockResolvedValue({
				provider: 'anthropic.messages',
				modelId: 'claude-opus-5',
			});

			await service.resolveProxyModel(fakeUser, 'https://proxy.base', tokenManager);

			expect(createProxyLanguageModel).toHaveBeenCalledWith(
				expect.objectContaining({
					modelId: 'claude-opus-5',
					feature: 'instance-ai',
				}),
			);
		});
	});

	describe('resolveMemoryModelConfig', () => {
		const tokenManager = { getAuthHeaders: vi.fn() } as never;
		const proxyRun = { proxyBaseUrl: 'https://proxy.base', tokenManager };
		const proxyMainModel = { provider: 'anthropic.messages', modelId: 'claude-opus-5-5' } as never;

		beforeEach(() => {
			aiService.isProxyEnabled.mockReturnValue(false);
		});

		it('returns undefined when no memory model is configured', async () => {
			settingsService.getConfiguredMemoryModelName.mockReturnValue('');

			await expect(
				service.resolveMemoryModelConfig(fakeUser, proxyMainModel, proxyRun),
			).resolves.toBeUndefined();
			expect(createProxyLanguageModel).not.toHaveBeenCalled();
		});

		it('routes the memory model name through the run proxy', async () => {
			settingsService.getConfiguredMemoryModelName.mockReturnValue('claude-haiku-4-5');
			createProxyLanguageModel.mockResolvedValue({
				provider: 'anthropic.messages',
				modelId: 'claude-haiku-4-5',
			});

			await service.resolveMemoryModelConfig(fakeUser, proxyMainModel, {
				...proxyRun,
				proxyContext: { runId: 'run-1', threadId: 'thread-1' },
			});

			expect(createProxyLanguageModel).toHaveBeenCalledWith(
				expect.objectContaining({
					proxyBaseUrl: 'https://proxy.base',
					modelId: 'claude-haiku-4-5',
					tokenManager,
					runId: 'run-1',
					threadId: 'thread-1',
				}),
			);
			expect(settingsService.resolveModelName).not.toHaveBeenCalled();
		});

		it('sends the bare model name to the proxy when the value has the main provider prefix', async () => {
			settingsService.getConfiguredMemoryModelName.mockReturnValue('anthropic/claude-haiku-5-5');
			settingsService.getConfiguredModelId.mockReturnValue('anthropic/claude-opus-5-5');
			createProxyLanguageModel.mockResolvedValue({
				provider: 'anthropic.messages',
				modelId: 'claude-haiku-5-5',
			});

			await service.resolveMemoryModelConfig(fakeUser, proxyMainModel, proxyRun);

			expect(createProxyLanguageModel).toHaveBeenCalledWith(
				expect.objectContaining({ modelId: 'claude-haiku-5-5' }),
			);
		});

		it('returns undefined and warns when the memory model cannot be resolved', async () => {
			settingsService.getConfiguredMemoryModelName.mockReturnValue('claude-haiku-4-5');
			createProxyLanguageModel.mockRejectedValue(new Error('proxy unavailable'));

			await expect(
				service.resolveMemoryModelConfig(fakeUser, proxyMainModel, proxyRun),
			).resolves.toBeUndefined();
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('Failed to resolve the Instance AI memory model'),
				{ modelName: 'claude-haiku-4-5', error: 'proxy unavailable' },
			);
		});

		it('renames the main model without resolving the settings again', async () => {
			settingsService.getConfiguredMemoryModelName.mockReturnValue('claude-haiku-4-5');

			await expect(
				service.resolveMemoryModelConfig(
					fakeUser,
					{
						kind: 'endpoint',
						id: 'anthropic/claude-opus-5-5',
						url: 'https://anthropic.example',
						apiKey: 'main-key',
					},
					{},
				),
			).resolves.toEqual({
				kind: 'endpoint',
				id: 'anthropic/claude-haiku-4-5',
				url: 'https://anthropic.example',
				apiKey: 'main-key',
			});
			expect(settingsService.resolveModelConfig).not.toHaveBeenCalled();
		});

		it('uses the main model for a pre-built model outside a proxy', async () => {
			settingsService.getConfiguredMemoryModelName.mockReturnValue('claude-haiku-4-5');

			await expect(
				service.resolveMemoryModelConfig(fakeUser, proxyMainModel, {}),
			).resolves.toBeUndefined();
		});
	});
});
