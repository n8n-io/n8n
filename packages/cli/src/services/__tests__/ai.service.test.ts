import type {
	AiAskRequestDto,
	AiApplySuggestionRequestDto,
	AiChatRequestDto,
} from '@n8n/api-types';
import type { GlobalConfig } from '@n8n/config';
import { AiAssistantClient, type AiAssistantSDK } from '@n8n_io/ai-assistant-sdk';
import { mock } from 'jest-mock-extended';
import type { IUser } from 'n8n-workflow';

import { N8N_VERSION } from '@/constants';
import type { License } from '@/license';

import { AiService } from '../ai.service';

jest.mock('@n8n_io/ai-assistant-sdk', () => ({
	AiAssistantClient: jest.fn(),
}));

describe('AiService', () => {
	let aiService: AiService;

	const baseUrl = 'https://ai-assistant-url.com';
	const user = mock<IUser>({ id: 'user123' });
	const client = mock<AiAssistantClient>();
	const license = mock<License>();
	const globalConfig = mock<GlobalConfig>({
		logging: { level: 'info' },
		aiAssistant: { baseUrl },
	});

	beforeEach(() => {
		jest.clearAllMocks();
		(AiAssistantClient as jest.Mock).mockImplementation(() => client);
		aiService = new AiService(license, globalConfig);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('init', () => {
		it('should not initialize client if AI assistant is not enabled', async () => {
			license.isAiAssistantEnabled.mockReturnValue(false);

			await aiService.init();

			expect(AiAssistantClient).not.toHaveBeenCalled();
		});

		it('should initialize client when AI assistant is enabled', async () => {
			license.isAiAssistantEnabled.mockReturnValue(true);
			license.loadCertStr.mockResolvedValue('mock-license-cert');
			license.getConsumerId.mockReturnValue('mock-consumer-id');

			await aiService.init();

			expect(AiAssistantClient).toHaveBeenCalledWith({
				licenseCert: 'mock-license-cert',
				consumerId: 'mock-consumer-id',
				n8nVersion: N8N_VERSION,
				baseUrl,
				logLevel: 'info',
			});
		});
	});

	describe('chat', () => {
		const payload = mock<AiChatRequestDto>();

		it('should call client chat method after initialization', async () => {
			license.isAiAssistantEnabled.mockReturnValue(true);
			const clientResponse = mock<Response>();
			client.chat.mockResolvedValue(clientResponse);

			const result = await aiService.chat(payload, user);

			expect(client.chat).toHaveBeenCalledWith(payload, { id: user.id });
			expect(result).toEqual(clientResponse);
		});

		it('should throw error if client is not initialized', async () => {
			license.isAiAssistantEnabled.mockReturnValue(false);

			await expect(aiService.chat(payload, user)).rejects.toThrow('Assistant client not setup');
		});
	});

	describe('applySuggestion', () => {
		const payload = mock<AiApplySuggestionRequestDto>();

		it('should call client applySuggestion', async () => {
			license.isAiAssistantEnabled.mockReturnValue(true);
			const clientResponse = mock<AiAssistantSDK.ApplySuggestionResponse>();
			client.applySuggestion.mockResolvedValue(clientResponse);

			const result = await aiService.applySuggestion(payload, user);

			expect(client.applySuggestion).toHaveBeenCalledWith(payload, { id: user.id });
			expect(result).toEqual(clientResponse);
		});

		it('should throw error if client is not initialized', async () => {
			license.isAiAssistantEnabled.mockReturnValue(false);

			await expect(aiService.applySuggestion(payload, user)).rejects.toThrow(
				'Assistant client not setup',
			);
		});
	});

	describe('askAi', () => {
		const payload = mock<AiAskRequestDto>();

		it('should call client askAi method after initialization', async () => {
			license.isAiAssistantEnabled.mockReturnValue(true);
			const clientResponse = mock<AiAssistantSDK.AskAiResponsePayload>();
			client.askAi.mockResolvedValue(clientResponse);

			const result = await aiService.askAi(payload, user);

			expect(client.askAi).toHaveBeenCalledWith(payload, { id: user.id });
			expect(result).toEqual(clientResponse);
		});

		it('should throw error if client is not initialized', async () => {
			license.isAiAssistantEnabled.mockReturnValue(false);

			await expect(aiService.askAi(payload, user)).rejects.toThrow('Assistant client not setup');
		});
	});
});
