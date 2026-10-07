import type {
	AiAskRequestDto,
	AiApplySuggestionRequestDto,
	AiChatRequestDto,
} from '@n8n/api-types';
import type { LicenseState, Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import { AiAssistantClient, type AiAssistantSDK } from '@n8n_io/ai-assistant-sdk';
import type { ErrorReporter, InstanceSettings } from 'n8n-core';
import type { IUser } from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { N8N_VERSION } from '@/constants';
import type { License } from '@/license';

import { AiService } from '../ai.service';

vi.mock('@n8n_io/ai-assistant-sdk', () => ({
	AiAssistantClient: vi.fn(),
}));

describe('AiService', () => {
	let aiService: AiService;

	const baseUrl = 'https://ai-assistant-url.com';
	const instanceId = 'mock-instance-id';
	const user = mock<IUser>({ id: 'user123' });
	const client = mock<AiAssistantClient>();
	const license = mock<License>();
	const licenseState = mock<LicenseState>();
	const globalConfig = mock<GlobalConfig>({
		logging: { level: 'info' },
		aiAssistant: { baseUrl },
	});
	const instanceSettings = mock<InstanceSettings>({ instanceId });
	const logger = mock<Logger>();
	const errorReporter = mock<ErrorReporter>();

	beforeEach(() => {
		vi.clearAllMocks();
		(AiAssistantClient as Mock).mockImplementation(function () {
			return client;
		});
		aiService = new AiService(
			license,
			globalConfig,
			instanceSettings,
			logger,
			errorReporter,
			licenseState,
		);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('init', () => {
		it('should not initialize client if AI assistant is not enabled', async () => {
			licenseState.isAiAssistantLicensed.mockReturnValue(false);

			await aiService.init();

			expect(AiAssistantClient).not.toHaveBeenCalled();
		});

		it('should initialize client when AI assistant is enabled', async () => {
			licenseState.isAiAssistantLicensed.mockReturnValue(true);
			license.loadCertStr.mockResolvedValue('mock-license-cert');
			license.getConsumerId.mockReturnValue('mock-consumer-id');

			await aiService.init();

			expect(AiAssistantClient).toHaveBeenCalledWith({
				licenseCert: 'mock-license-cert',
				consumerId: 'mock-consumer-id',
				n8nVersion: N8N_VERSION,
				baseUrl,
				logLevel: 'info',
				instanceId,
			});
		});
	});

	describe('chat', () => {
		const payload = mock<AiChatRequestDto>();

		it('should call client chat method after initialization', async () => {
			licenseState.isAiAssistantLicensed.mockReturnValue(true);
			const clientResponse = mock<Response>();
			client.chat.mockResolvedValue(clientResponse);

			const result = await aiService.chat(payload, user);

			expect(client.chat).toHaveBeenCalledWith(payload, { id: user.id });
			expect(result).toEqual(clientResponse);
		});

		it('should throw error if client is not initialized', async () => {
			licenseState.isAiAssistantLicensed.mockReturnValue(false);

			await expect(aiService.chat(payload, user)).rejects.toThrow(
				'AI Assistant client not initialized',
			);
		});
	});

	describe('applySuggestion', () => {
		const payload = mock<AiApplySuggestionRequestDto>();

		it('should call client applySuggestion', async () => {
			licenseState.isAiAssistantLicensed.mockReturnValue(true);
			const clientResponse = mock<AiAssistantSDK.ApplySuggestionResponse>();
			client.applySuggestion.mockResolvedValue(clientResponse);

			const result = await aiService.applySuggestion(payload, user);

			expect(client.applySuggestion).toHaveBeenCalledWith(payload, { id: user.id });
			expect(result).toEqual(clientResponse);
		});

		it('should throw error if client is not initialized', async () => {
			licenseState.isAiAssistantLicensed.mockReturnValue(false);

			await expect(aiService.applySuggestion(payload, user)).rejects.toThrow(
				'AI Assistant client not initialized',
			);
		});
	});

	describe('license certificate refresh', () => {
		it('should register for license certificate updates on init', async () => {
			licenseState.isAiAssistantLicensed.mockReturnValue(true);
			license.loadCertStr.mockResolvedValue('mock-license-cert');
			license.getConsumerId.mockReturnValue('mock-consumer-id');

			await aiService.init();

			expect(license.onCertRefresh).toHaveBeenCalledWith(expect.any(Function));
		});

		it('should update client license cert when callback is invoked', async () => {
			licenseState.isAiAssistantLicensed.mockReturnValue(true);
			license.loadCertStr.mockResolvedValue('mock-license-cert');
			license.getConsumerId.mockReturnValue('mock-consumer-id');

			// Capture the callback passed to onCertRefresh
			let capturedCallback: ((cert: string) => void) | undefined;
			license.onCertRefresh.mockImplementation((cb: (cert: string) => void) => {
				capturedCallback = cb;
				return () => {};
			});

			await aiService.init();

			expect(capturedCallback).toBeDefined();

			// Invoke the callback with a new cert
			capturedCallback!('new-cert-value');

			expect(client.updateLicenseCert).toHaveBeenCalledWith('new-cert-value');
		});

		it('should not register for license updates when AI assistant is disabled', async () => {
			licenseState.isAiAssistantLicensed.mockReturnValue(false);

			await aiService.init();

			expect(license.onCertRefresh).not.toHaveBeenCalled();
		});
	});

	describe('askAi', () => {
		const payload = mock<AiAskRequestDto>();

		it('should call client askAi method after initialization', async () => {
			licenseState.isAiAssistantLicensed.mockReturnValue(true);
			const clientResponse = mock<AiAssistantSDK.AskAiResponsePayload>();
			client.askAi.mockResolvedValue(clientResponse);

			const result = await aiService.askAi(payload, user);

			expect(client.askAi).toHaveBeenCalledWith(payload, { id: user.id });
			expect(result).toEqual(clientResponse);
		});

		it('should throw error if client is not initialized', async () => {
			licenseState.isAiAssistantLicensed.mockReturnValue(false);

			await expect(aiService.askAi(payload, user)).rejects.toThrow(
				'AI Assistant client not initialized',
			);
		});
	});

	describe('isProxyEnabled', () => {
		it('should return true when license enabled and base URL configured', () => {
			licenseState.isAiAssistantLicensed.mockReturnValue(true);

			expect(aiService.isProxyEnabled()).toBe(true);
		});

		it('should return false when license not enabled', () => {
			licenseState.isAiAssistantLicensed.mockReturnValue(false);

			expect(aiService.isProxyEnabled()).toBe(false);
		});

		it('should return false when base URL is empty', () => {
			licenseState.isAiAssistantLicensed.mockReturnValue(true);
			const configWithoutUrl = mock<GlobalConfig>({
				logging: { level: 'info' },
				aiAssistant: { baseUrl: '' },
			});
			const serviceNoUrl = new AiService(
				license,
				configWithoutUrl,
				instanceSettings,
				logger,
				errorReporter,
				licenseState,
			);

			expect(serviceNoUrl.isProxyEnabled()).toBe(false);
		});
	});

	describe('getClient', () => {
		it('should return initialized client when license is enabled', async () => {
			licenseState.isAiAssistantLicensed.mockReturnValue(true);
			license.loadCertStr.mockResolvedValue('cert');
			license.getConsumerId.mockReturnValue('consumer-1');

			const result = await aiService.getClient();

			expect(result).toBe(client);
		});

		it('should throw when client cannot be initialized', async () => {
			licenseState.isAiAssistantLicensed.mockReturnValue(false);

			await expect(aiService.getClient()).rejects.toThrow('AI Assistant client not initialized');
		});

		it('should only initialize once on repeated calls', async () => {
			licenseState.isAiAssistantLicensed.mockReturnValue(true);
			license.loadCertStr.mockResolvedValue('cert');
			license.getConsumerId.mockReturnValue('consumer-1');

			await aiService.getClient();
			await aiService.getClient();

			expect(AiAssistantClient).toHaveBeenCalledTimes(1);
		});
	});

	describe('createFreeAiCredits', () => {
		const credits = mock<AiAssistantSDK.AiCreditResponsePayload>();

		beforeEach(() => {
			licenseState.isAiAssistantLicensed.mockReturnValue(true);
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should retry transient upstream errors before succeeding', async () => {
			vi.useFakeTimers();
			const transient = Object.assign(new Error('Bad Gateway'), { statusCode: 502 });
			client.generateAiCreditsCredentials
				.mockRejectedValueOnce(transient)
				.mockResolvedValue(credits);

			const promise = aiService.createFreeAiCredits(user);
			await vi.runAllTimersAsync();

			await expect(promise).resolves.toEqual(credits);
			expect(client.generateAiCreditsCredentials).toHaveBeenCalledTimes(2);
			expect(client.generateAiCreditsCredentials).toHaveBeenCalledWith(user);
		});

		it('should not retry timed-out credential generation', async () => {
			vi.useFakeTimers();
			client.generateAiCreditsCredentials.mockImplementation(
				async () => await new Promise<never>(() => {}),
			);

			const promise = aiService.createFreeAiCredits(user);
			const assertion = expect(promise).rejects.toThrow(
				'The AI assistant service is temporarily unavailable',
			);
			await vi.runAllTimersAsync();

			await assertion;
			expect(client.generateAiCreditsCredentials).toHaveBeenCalledTimes(1);
		});

		it('should not retry definite client errors', async () => {
			const alreadyClaimed = Object.assign(new Error('Already claimed'), { statusCode: 400 });
			client.generateAiCreditsCredentials.mockRejectedValue(alreadyClaimed);

			await expect(aiService.createFreeAiCredits(user)).rejects.toBe(alreadyClaimed);
			expect(client.generateAiCreditsCredentials).toHaveBeenCalledTimes(1);
		});
	});
});
