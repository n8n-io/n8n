import type { InstanceAiVerificationFailure } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { OutboundHttp } from '@n8n/backend-network';
import type { GlobalConfig, InstanceAiConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

const raceWithAbortMock = vi.hoisted(() => vi.fn());

vi.mock('@n8n/agents', () => ({ createModel: vi.fn(), raceWithAbort: raceWithAbortMock }));
vi.mock('ai', () => ({ generateText: vi.fn() }));
vi.mock('@n8n/instance-ai', () => ({ createSandbox: vi.fn(), createWorkspace: vi.fn() }));
vi.mock('@n8n/ai-utilities', () => ({ braveSearch: vi.fn(), searxngSearch: vi.fn() }));
vi.mock('@/utils/ai-proxy-fetch', () => ({ createAiProxyFetch: vi.fn(() => vi.fn()) }));

import { braveSearch, searxngSearch } from '@n8n/ai-utilities';
import { createModel } from '@n8n/agents';
import { createSandbox, createWorkspace } from '@n8n/instance-ai';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { generateText } from 'ai';

import type { InstanceAiModelService } from '../instance-ai-model.service';
import type { InstanceAiSettingsService } from '../instance-ai-settings.service';
import { InstanceAiVerificationService } from '../instance-ai-verification.service';

import type { Telemetry } from '@/telemetry';

describe('InstanceAiVerificationService', () => {
	const globalConfig = mock<GlobalConfig>({
		instanceAi: {
			sandboxProvider: 'n8n-sandbox',
			sandboxImage: 'sandbox-image',
			sandboxTimeout: 60,
			n8nSandboxServiceUrl: 'https://env.sandbox',
			n8nSandboxServiceApiKey: 'env-sandbox-key',
			daytonaApiUrl: 'https://env.daytona',
			daytonaApiKey: 'env-daytona-key',
		} as unknown as InstanceAiConfig,
	});
	const logger = mock<Logger>();
	const telemetry = mock<Telemetry>();
	const settingsService = mock<InstanceAiSettingsService>();
	const modelService = mock<InstanceAiModelService>();
	const outboundHttp = mock<OutboundHttp>();
	const user = mock<User>();
	const createModelMock = vi.mocked(createModel);
	const generateTextMock = vi.mocked(generateText);
	const createSandboxMock = vi.mocked(createSandbox);
	const createWorkspaceMock = vi.mocked(createWorkspace);
	const braveSearchMock = vi.mocked(braveSearch);
	const searxngSearchMock = vi.mocked(searxngSearch);

	let service: InstanceAiVerificationService;

	beforeEach(() => {
		vi.resetAllMocks();
		raceWithAbortMock.mockImplementation(
			async (work: Promise<unknown> | (() => Promise<unknown>)) =>
				await (typeof work === 'function' ? work() : work),
		);
		Object.assign(globalConfig.instanceAi, {
			sandboxProvider: 'n8n-sandbox',
			sandboxImage: 'sandbox-image',
			sandboxTimeout: 60,
			n8nSandboxServiceUrl: 'https://env.sandbox',
			n8nSandboxServiceApiKey: 'env-sandbox-key',
			daytonaApiUrl: 'https://env.daytona',
			daytonaApiKey: 'env-daytona-key',
		});
		modelService.resolveAgentModelConfig.mockResolvedValue('openai/saved-model');
		createModelMock.mockReturnValue({} as never);
		generateTextMock.mockResolvedValue({} as never);
		service = new InstanceAiVerificationService(
			logger,
			globalConfig,
			settingsService,
			modelService,
			outboundHttp,
			telemetry,
		);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('verifyModel', () => {
		it('verifies a draft connection with restored credential data', async () => {
			const connection = { type: 'openAiApi', data: { apiKey: '__redacted__' } };
			const restored = { type: 'openAiApi', data: { apiKey: 'saved-key' } };
			const modelConfig = { id: 'openai/gpt-5.4', url: '', apiKey: 'saved-key' } as const;
			settingsService.resolveModelConnectionForVerification.mockResolvedValue(restored);
			settingsService.buildModelConfigForConnection.mockReturnValue(modelConfig);

			await expect(
				service.verifyModel(user, { connection, modelName: 'gpt-5.4' }),
			).resolves.toMatchObject({ ok: true, latencyMs: expect.any(Number) });

			expect(settingsService.resolveModelConnectionForVerification).toHaveBeenCalledWith(
				connection,
			);
			expect(settingsService.buildModelConfigForConnection).toHaveBeenCalledWith(
				restored,
				'gpt-5.4',
			);
			expect(createModelMock).toHaveBeenCalledWith(modelConfig, expect.any(Function));
			expect(generateTextMock).toHaveBeenCalledWith(
				// OpenAI's Responses API rejects max_output_tokens below 16.
				expect.objectContaining({ prompt: 'Reply with OK.', maxOutputTokens: 16 }),
			);
		});

		it('uses the saved model configuration when no draft connection is provided', async () => {
			settingsService.resolveModelConfigForVerification.mockResolvedValue(
				'anthropic/claude-opus-4-6',
			);

			await expect(
				service.verifyModel(user, { modelName: 'claude-opus-4-6' }),
			).resolves.toMatchObject({
				ok: true,
			});

			expect(settingsService.resolveModelConfigForVerification).toHaveBeenCalledWith(
				user,
				'claude-opus-4-6',
			);
			expect(modelService.resolveAgentModelConfig).not.toHaveBeenCalled();
		});

		it('uses the active agent model when no model override is provided', async () => {
			await expect(service.verifyModel(user, {})).resolves.toMatchObject({ ok: true });

			expect(modelService.resolveAgentModelConfig).toHaveBeenCalledWith(user);
			expect(createModelMock).toHaveBeenCalledWith('openai/saved-model', expect.any(Function));
		});

		it.each<{ error: unknown; failure: InstanceAiVerificationFailure }>([
			{ error: { status: 401 }, failure: 'unauthorized' },
			{ error: { statusCode: '403', message: 'Access forbidden' }, failure: 'forbidden' },
			{
				error: Object.assign(new Error('Quota limit reached'), { code: 403 }),
				failure: 'quota_exceeded',
			},
			{ error: { status: 429 }, failure: 'rate_limited' },
			{ error: Object.assign(new Error('aborted'), { name: 'AbortError' }), failure: 'timeout' },
			{
				error: Object.assign(new Error('timed out'), { name: 'TimeoutError' }),
				failure: 'timeout',
			},
			{ error: new Error('Provider returned 401'), failure: 'unauthorized' },
			{ error: new Error('Provider returned 403: limit exceeded'), failure: 'quota_exceeded' },
			{ error: new Error('Provider returned 403'), failure: 'forbidden' },
			{ error: new Error('Provider returned 429'), failure: 'rate_limited' },
			{ error: new Error('Request timeout'), failure: 'timeout' },
			{ error: new Error('fetch failed: ECONNREFUSED'), failure: 'unreachable' },
			{ error: new Error('Invalid JSON response'), failure: 'invalid_response' },
			{ error: new Error('Unexpected provider failure'), failure: 'provider_error' },
		])('classifies model verification failures as $failure', async ({ error, failure }) => {
			generateTextMock.mockRejectedValueOnce(error);

			await expect(service.verifyModel(user, {})).resolves.toEqual({
				ok: false,
				failure,
				error: expect.any(String),
			});
			expect(logger.warn).toHaveBeenCalledWith(
				'Instance AI model verification failed',
				expect.objectContaining({ error: expect.any(String), failure }),
			);
		});

		it('returns a scrubbed error detail on failure', async () => {
			generateTextMock.mockRejectedValueOnce(
				new Error('Incorrect API key provided: sk-proj-abcdef1234567890abcdef'),
			);

			const result = await service.verifyModel(user, {});

			expect(result).toEqual({
				ok: false,
				failure: 'provider_error',
				error: expect.stringContaining('[REDACTED]'),
			});
			expect(JSON.stringify(result)).not.toContain('sk-proj-abcdef');
		});
	});

	describe('verifySandbox', () => {
		it('verifies an n8n Sandbox draft and destroys the workspace', async () => {
			const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');
			const connection = { type: 'httpHeaderAuth', data: { value: '__redacted__' } };
			settingsService.resolveSandboxConnectionForVerification.mockResolvedValue({
				type: 'httpHeaderAuth',
				data: { value: 'saved-key' },
			});
			const workspace = {
				init: vi.fn().mockResolvedValue(undefined),
				destroy: vi.fn().mockResolvedValue(undefined),
				sandbox: { executeCommand: vi.fn().mockResolvedValue({ exitCode: 0 }) },
			};
			createSandboxMock.mockResolvedValue({} as never);
			createWorkspaceMock.mockReturnValue(workspace as never);

			await expect(
				service.verifySandbox(user, {
					provider: 'n8n-sandbox',
					connection,
					serviceUrl: 'https://draft.sandbox',
				}),
			).resolves.toMatchObject({ ok: true, startupMs: expect.any(Number) });

			expect(settingsService.resolveSandboxConnectionForVerification).toHaveBeenCalledWith(
				connection,
			);
			expect(createSandboxMock).toHaveBeenCalledWith({
				enabled: true,
				provider: 'n8n-sandbox',
				serviceUrl: 'https://draft.sandbox',
				apiKey: 'saved-key',
				timeout: 60,
			});
			expect(timeoutSpy).toHaveBeenCalledWith(60);
			expect(workspace.sandbox.executeCommand).toHaveBeenCalledWith('printf', ['ok'], {
				abortSignal: expect.any(AbortSignal),
			});
			expect(workspace.destroy).toHaveBeenCalled();
		});

		it('returns a timeout and starts cleanup when sandbox verification exceeds the deadline', async () => {
			const timeoutError = Object.assign(new Error('Sandbox verification timed out'), {
				name: 'TimeoutError',
			});
			let raceCount = 0;
			raceWithAbortMock.mockImplementation(
				async (work: Promise<unknown> | (() => Promise<unknown>)) => {
					raceCount++;
					if (raceCount === 3) throw timeoutError;
					return await (typeof work === 'function' ? work() : work);
				},
			);
			const workspace = {
				init: vi.fn(),
				destroy: vi.fn().mockResolvedValue(undefined),
				sandbox: { executeCommand: vi.fn() },
			};
			createSandboxMock.mockResolvedValue({} as never);
			createWorkspaceMock.mockReturnValue(workspace as never);

			await expect(service.verifySandbox(user, {})).resolves.toEqual({
				ok: false,
				failure: 'timeout',
				error: expect.any(String),
			});

			expect(workspace.destroy).toHaveBeenCalledOnce();
			expect(workspace.init).toHaveBeenCalledOnce();
			expect(workspace.sandbox.executeCommand).not.toHaveBeenCalled();
		});

		it('verifies saved Daytona settings', async () => {
			settingsService.resolveDaytonaConfig.mockResolvedValue({
				apiUrl: 'https://saved.daytona',
				apiKey: 'saved-daytona-key',
			});
			const workspace = {
				init: vi.fn().mockResolvedValue(undefined),
				destroy: vi.fn().mockRejectedValue(new Error('cleanup failed')),
				sandbox: { executeCommand: vi.fn().mockResolvedValue({ exitCode: 0 }) },
			};
			createSandboxMock.mockResolvedValue({} as never);
			createWorkspaceMock.mockReturnValue(workspace as never);

			await expect(service.verifySandbox(user, { provider: 'daytona' })).resolves.toMatchObject({
				ok: true,
			});

			expect(createSandboxMock).toHaveBeenCalledWith({
				enabled: true,
				provider: 'daytona',
				daytonaApiUrl: 'https://saved.daytona',
				daytonaApiKey: 'saved-daytona-key',
				image: 'sandbox-image',
				timeout: 60,
				ephemeral: true,
			});
			expect(logger.warn).toHaveBeenCalledWith(
				'Instance AI sandbox verification cleanup failed',
				expect.objectContaining({ error: expect.any(String), provider: 'daytona' }),
			);
		});

		it('uses saved n8n Sandbox settings when no draft is provided', async () => {
			settingsService.resolveN8nSandboxConfig.mockResolvedValue({
				serviceUrl: 'https://saved.sandbox',
				apiKey: 'saved-key',
			});
			const workspace = {
				init: vi.fn().mockResolvedValue(undefined),
				destroy: vi.fn().mockResolvedValue(undefined),
				sandbox: { executeCommand: vi.fn().mockResolvedValue({ exitCode: 0 }) },
			};
			createSandboxMock.mockResolvedValue({} as never);
			createWorkspaceMock.mockReturnValue(workspace as never);

			await expect(service.verifySandbox(user, {})).resolves.toMatchObject({ ok: true });

			expect(createSandboxMock).toHaveBeenCalledWith({
				enabled: true,
				provider: 'n8n-sandbox',
				serviceUrl: 'https://saved.sandbox',
				apiKey: 'saved-key',
				timeout: 60,
			});
		});

		it.each([
			['missing sandbox', undefined, undefined],
			['missing workspace', {}, undefined],
			['failed command', {}, { exitCode: 1 }],
		] as const)('reports provider errors for a %s', async (_name, sandbox, commandResult) => {
			createSandboxMock.mockResolvedValue(sandbox as never);
			if (sandbox && commandResult === undefined) {
				createWorkspaceMock.mockReturnValue(undefined as never);
			} else if (sandbox) {
				createWorkspaceMock.mockReturnValue({
					init: vi.fn().mockResolvedValue(undefined),
					destroy: vi.fn().mockResolvedValue(undefined),
					sandbox: { executeCommand: vi.fn().mockResolvedValue(commandResult) },
				} as never);
			}

			await expect(service.verifySandbox(user, {})).resolves.toEqual({
				ok: false,
				failure: 'provider_error',
				error: expect.any(String),
			});
		});

		it('maps Daytona forbidden responses to quota errors', async () => {
			createSandboxMock.mockRejectedValue({ status: 403, message: 'Forbidden' });

			await expect(service.verifySandbox(user, { provider: 'daytona' })).resolves.toEqual({
				ok: false,
				failure: 'quota_exceeded',
				error: expect.any(String),
			});
			expect(logger.warn).toHaveBeenCalledWith(
				'Instance AI sandbox verification failed',
				expect.objectContaining({
					error: expect.any(String),
					failure: 'quota_exceeded',
					provider: 'daytona',
				}),
			);
		});
	});

	describe('verifySearch', () => {
		it('verifies a Brave draft with restored credential data', async () => {
			const connection = { type: 'braveSearchApi', data: { apiKey: '__redacted__' } };
			settingsService.resolveSearchConnectionForVerification.mockResolvedValue({
				type: 'braveSearchApi',
				data: { apiKey: '  saved-key  ' },
			});
			braveSearchMock.mockResolvedValue({ results: [{}, {}] } as never);

			await expect(service.verifySearch({ connection })).resolves.toEqual({
				ok: true,
				resultCount: 2,
			});

			expect(braveSearchMock).toHaveBeenCalledWith(
				'saved-key',
				'n8n workflow automation',
				expect.objectContaining({ maxResults: 10 }),
			);
			expect(searxngSearchMock).not.toHaveBeenCalled();
		});

		it('verifies a saved SearXNG connection', async () => {
			settingsService.resolveSearchConfig.mockResolvedValue({
				searxngUrl: 'https://saved.searxng',
			});
			searxngSearchMock.mockResolvedValue({ results: [{}] } as never);

			await expect(service.verifySearch({})).resolves.toEqual({ ok: true, resultCount: 1 });

			expect(searxngSearchMock).toHaveBeenCalledWith(
				'https://saved.searxng',
				'n8n workflow automation',
				expect.objectContaining({ maxResults: 10 }),
			);
		});

		it('reports an unconfigured provider without exposing connection details', async () => {
			settingsService.resolveSearchConfig.mockResolvedValue({});

			await expect(service.verifySearch({})).resolves.toEqual({
				ok: false,
				failure: 'provider_error',
				error: expect.any(String),
			});
		});

		it('classifies search provider failures', async () => {
			settingsService.resolveSearchConfig.mockResolvedValue({ braveApiKey: 'saved-key' });
			braveSearchMock.mockRejectedValue(new Error('network request failed'));

			await expect(service.verifySearch({})).resolves.toEqual({
				ok: false,
				failure: 'unreachable',
				error: expect.any(String),
			});
			expect(logger.warn).toHaveBeenCalledWith(
				'Instance AI search verification failed',
				expect.objectContaining({ error: expect.any(String), failure: 'unreachable' }),
			);
		});
	});

	describe('connection failed telemetry', () => {
		it('reports a failed model verification with the provider and classified failure', async () => {
			generateTextMock.mockRejectedValueOnce(new Error('Provider returned 401'));

			await service.verifyModel(user, {});

			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.INSTANCE_AI.AI_ASSISTANT_CONNECTION_FAILED,
				{
					component: 'model',
					provider: 'openai',
					failure: 'unauthorized',
					error_message: 'Provider returned 401',
				},
			);
		});

		it('scrubs credential-shaped values from the reported error message', async () => {
			generateTextMock.mockRejectedValueOnce(
				new Error('Incorrect API key provided: sk-proj-abcdef1234567890abcdef'),
			);

			await service.verifyModel(user, {});

			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.INSTANCE_AI.AI_ASSISTANT_CONNECTION_FAILED,
				expect.objectContaining({
					error_message: expect.stringContaining('[REDACTED]'),
				}),
			);
			expect(JSON.stringify(telemetry.track.mock.calls)).not.toContain('sk-proj-abcdef');
		});

		it('attributes the provider from the configured model id under the AI service proxy', async () => {
			settingsService.isProxyEnabled.mockReturnValue(true);
			settingsService.getConfiguredModelId.mockReturnValue('moonshotai/kimi-k3');
			modelService.resolveAgentModelConfig.mockResolvedValue({
				specificationVersion: 'v2',
				provider: 'anthropic.messages',
				modelId: 'kimi-k3',
			} as never);
			generateTextMock.mockRejectedValueOnce(new Error('Provider returned 401'));

			await service.verifyModel(user, {});

			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.INSTANCE_AI.AI_ASSISTANT_CONNECTION_FAILED,
				expect.objectContaining({ provider: 'moonshotai' }),
			);
		});

		it('attributes the provider for pre-built language-model configs', async () => {
			modelService.resolveAgentModelConfig.mockResolvedValue({
				specificationVersion: 'v2',
				provider: 'anthropic.messages',
				modelId: 'claude-sonnet-4',
			} as never);
			generateTextMock.mockRejectedValueOnce(new Error('Provider returned 401'));

			await service.verifyModel(user, {});

			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.INSTANCE_AI.AI_ASSISTANT_CONNECTION_FAILED,
				expect.objectContaining({ provider: 'anthropic' }),
			);
		});

		it('strips URL query strings from the reported error message', async () => {
			generateTextMock.mockRejectedValueOnce(
				new Error('request to https://api.example.com/v1?key=secret-key failed'),
			);

			await service.verifyModel(user, {});

			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.INSTANCE_AI.AI_ASSISTANT_CONNECTION_FAILED,
				expect.objectContaining({
					error_message: 'request to https://api.example.com/v1 failed',
				}),
			);
			expect(JSON.stringify(telemetry.track.mock.calls)).not.toContain('secret-key');
		});

		it('reports failed search verification as the web_search component', async () => {
			settingsService.resolveSearchConfig.mockResolvedValue({ braveApiKey: 'saved-key' });
			braveSearchMock.mockRejectedValue(new Error('network request failed'));

			await service.verifySearch({});

			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.INSTANCE_AI.AI_ASSISTANT_CONNECTION_FAILED,
				{
					component: 'web_search',
					provider: 'brave',
					failure: 'unreachable',
					error_message: 'network request failed',
				},
			);
		});

		it('does not report telemetry for successful verifications', async () => {
			await expect(service.verifyModel(user, {})).resolves.toMatchObject({ ok: true });

			expect(telemetry.track).not.toHaveBeenCalled();
		});
	});
});
