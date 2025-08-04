'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const ai_assistant_sdk_1 = require('@n8n_io/ai-assistant-sdk');
const jest_mock_extended_1 = require('jest-mock-extended');
const constants_1 = require('@/constants');
const ai_service_1 = require('../ai.service');
jest.mock('@n8n_io/ai-assistant-sdk', () => ({
	AiAssistantClient: jest.fn(),
}));
describe('AiService', () => {
	let aiService;
	const baseUrl = 'https://ai-assistant-url.com';
	const user = (0, jest_mock_extended_1.mock)({ id: 'user123' });
	const client = (0, jest_mock_extended_1.mock)();
	const license = (0, jest_mock_extended_1.mock)();
	const globalConfig = (0, jest_mock_extended_1.mock)({
		logging: { level: 'info' },
		aiAssistant: { baseUrl },
	});
	beforeEach(() => {
		jest.clearAllMocks();
		ai_assistant_sdk_1.AiAssistantClient.mockImplementation(() => client);
		aiService = new ai_service_1.AiService(license, globalConfig);
	});
	afterEach(() => {
		jest.clearAllMocks();
	});
	describe('init', () => {
		it('should not initialize client if AI assistant is not enabled', async () => {
			license.isAiAssistantEnabled.mockReturnValue(false);
			await aiService.init();
			expect(ai_assistant_sdk_1.AiAssistantClient).not.toHaveBeenCalled();
		});
		it('should initialize client when AI assistant is enabled', async () => {
			license.isAiAssistantEnabled.mockReturnValue(true);
			license.loadCertStr.mockResolvedValue('mock-license-cert');
			license.getConsumerId.mockReturnValue('mock-consumer-id');
			await aiService.init();
			expect(ai_assistant_sdk_1.AiAssistantClient).toHaveBeenCalledWith({
				licenseCert: 'mock-license-cert',
				consumerId: 'mock-consumer-id',
				n8nVersion: constants_1.N8N_VERSION,
				baseUrl,
				logLevel: 'info',
			});
		});
	});
	describe('chat', () => {
		const payload = (0, jest_mock_extended_1.mock)();
		it('should call client chat method after initialization', async () => {
			license.isAiAssistantEnabled.mockReturnValue(true);
			const clientResponse = (0, jest_mock_extended_1.mock)();
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
		const payload = (0, jest_mock_extended_1.mock)();
		it('should call client applySuggestion', async () => {
			license.isAiAssistantEnabled.mockReturnValue(true);
			const clientResponse = (0, jest_mock_extended_1.mock)();
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
		const payload = (0, jest_mock_extended_1.mock)();
		it('should call client askAi method after initialization', async () => {
			license.isAiAssistantEnabled.mockReturnValue(true);
			const clientResponse = (0, jest_mock_extended_1.mock)();
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
//# sourceMappingURL=ai.service.test.js.map
