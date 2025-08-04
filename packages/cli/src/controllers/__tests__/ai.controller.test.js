'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const internal_server_error_1 = require('@/errors/response-errors/internal-server.error');
const ai_controller_1 = require('../ai.controller');
describe('AiController', () => {
	const aiService = (0, jest_mock_extended_1.mock)();
	const workflowBuilderService = (0, jest_mock_extended_1.mock)();
	const controller = new ai_controller_1.AiController(
		aiService,
		workflowBuilderService,
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
	);
	const request = (0, jest_mock_extended_1.mock)({
		user: { id: 'user123' },
	});
	const response = (0, jest_mock_extended_1.mock)();
	beforeEach(() => {
		jest.clearAllMocks();
		response.header.mockReturnThis();
		response.status.mockReturnThis();
	});
	describe('chat', () => {
		const payload = (0, jest_mock_extended_1.mock)();
		it('should handle chat request successfully', async () => {
			aiService.chat.mockResolvedValue(
				(0, jest_mock_extended_1.mock)({
					body: (0, jest_mock_extended_1.mock)({
						pipeTo: jest.fn().mockImplementation(async (writableStream) => {
							const writer = writableStream.getWriter();
							await writer.write(JSON.stringify({ message: 'test response' }));
							await writer.close();
						}),
					}),
				}),
			);
			await controller.chat(request, response, payload);
			expect(aiService.chat).toHaveBeenCalledWith(payload, request.user);
			expect(response.header).toHaveBeenCalledWith('Content-type', 'application/json-lines');
			expect(response.flush).toHaveBeenCalled();
			expect(response.end).toHaveBeenCalled();
		});
		it('should throw InternalServerError if chat fails', async () => {
			const mockError = new Error('Chat failed');
			aiService.chat.mockRejectedValue(mockError);
			await expect(controller.chat(request, response, payload)).rejects.toThrow(
				internal_server_error_1.InternalServerError,
			);
		});
	});
	describe('applySuggestion', () => {
		const payload = (0, jest_mock_extended_1.mock)();
		it('should apply suggestion successfully', async () => {
			const clientResponse = (0, jest_mock_extended_1.mock)();
			aiService.applySuggestion.mockResolvedValue(clientResponse);
			const result = await controller.applySuggestion(request, response, payload);
			expect(aiService.applySuggestion).toHaveBeenCalledWith(payload, request.user);
			expect(result).toEqual(clientResponse);
		});
		it('should throw InternalServerError if applying suggestion fails', async () => {
			const mockError = new Error('Apply suggestion failed');
			aiService.applySuggestion.mockRejectedValue(mockError);
			await expect(controller.applySuggestion(request, response, payload)).rejects.toThrow(
				internal_server_error_1.InternalServerError,
			);
		});
	});
	describe('askAi method', () => {
		const payload = (0, jest_mock_extended_1.mock)();
		it('should ask AI successfully', async () => {
			const clientResponse = (0, jest_mock_extended_1.mock)();
			aiService.askAi.mockResolvedValue(clientResponse);
			const result = await controller.askAi(request, response, payload);
			expect(aiService.askAi).toHaveBeenCalledWith(payload, request.user);
			expect(result).toEqual(clientResponse);
		});
		it('should throw InternalServerError if asking AI fails', async () => {
			const mockError = new Error('Ask AI failed');
			aiService.askAi.mockRejectedValue(mockError);
			await expect(controller.askAi(request, response, payload)).rejects.toThrow(
				internal_server_error_1.InternalServerError,
			);
		});
	});
	describe('build', () => {
		const payload = {
			payload: {
				text: 'Create a workflow',
				type: 'message',
				role: 'user',
				workflowContext: {
					currentWorkflow: { id: 'workflow123' },
				},
			},
		};
		it('should handle build request successfully', async () => {
			const mockChunks = [
				{ messages: [{ role: 'assistant', type: 'message', text: 'Building...' }] },
				{ messages: [{ role: 'assistant', type: 'workflow-updated', codeSnippet: '{}' }] },
			];
			async function* mockChatGenerator() {
				for (const chunk of mockChunks) {
					yield chunk;
				}
			}
			workflowBuilderService.chat.mockReturnValue(mockChatGenerator());
			await controller.build(request, response, payload);
			expect(workflowBuilderService.chat).toHaveBeenCalledWith(
				{
					message: 'Create a workflow',
					workflowContext: {
						currentWorkflow: { id: 'workflow123' },
						executionData: undefined,
						executionSchema: undefined,
					},
				},
				request.user,
			);
			expect(response.header).toHaveBeenCalledWith('Content-type', 'application/json-lines');
			expect(response.flush).toHaveBeenCalled();
			expect(response.write).toHaveBeenCalledTimes(2);
			expect(response.write).toHaveBeenNthCalledWith(
				1,
				JSON.stringify(mockChunks[0]) + '⧉⇋⇋➽⌑⧉§§\n',
			);
			expect(response.write).toHaveBeenNthCalledWith(
				2,
				JSON.stringify(mockChunks[1]) + '⧉⇋⇋➽⌑⧉§§\n',
			);
			expect(response.end).toHaveBeenCalled();
		});
		it('should handle errors during streaming and send error chunk', async () => {
			const mockError = new Error('Tool execution failed');
			async function* mockChatGeneratorWithError() {
				yield { messages: [{ role: 'assistant', type: 'message', text: 'Starting...' }] };
				throw mockError;
			}
			workflowBuilderService.chat.mockReturnValue(mockChatGeneratorWithError());
			await controller.build(request, response, payload);
			expect(workflowBuilderService.chat).toHaveBeenCalled();
			expect(response.header).toHaveBeenCalledWith('Content-type', 'application/json-lines');
			expect(response.write).toHaveBeenCalledTimes(2);
			expect(response.write).toHaveBeenNthCalledWith(
				1,
				JSON.stringify({
					messages: [{ role: 'assistant', type: 'message', text: 'Starting...' }],
				}) + '⧉⇋⇋➽⌑⧉§§\n',
			);
			expect(response.write).toHaveBeenNthCalledWith(
				2,
				JSON.stringify({
					messages: [
						{
							role: 'assistant',
							type: 'error',
							content: 'Tool execution failed',
						},
					],
				}) + '⧉⇋⇋➽⌑⧉§§\n',
			);
			expect(response.end).toHaveBeenCalled();
		});
		it('should handle errors before streaming starts', async () => {
			const mockError = new Error('Failed to initialize');
			workflowBuilderService.chat.mockImplementation(() => {
				throw mockError;
			});
			response.headersSent = false;
			await controller.build(request, response, payload);
			expect(response.status).toHaveBeenCalledWith(500);
			expect(response.json).toHaveBeenCalledWith({
				code: 500,
				message: 'Failed to initialize',
			});
			expect(response.write).not.toHaveBeenCalled();
			expect(response.end).not.toHaveBeenCalled();
		});
		it('should not try to send error response if headers already sent', async () => {
			const mockError = new Error('Failed after headers');
			workflowBuilderService.chat.mockImplementation(() => {
				throw mockError;
			});
			response.headersSent = true;
			await controller.build(request, response, payload);
			expect(response.status).not.toHaveBeenCalled();
			expect(response.json).not.toHaveBeenCalled();
			expect(response.end).toHaveBeenCalled();
		});
	});
});
//# sourceMappingURL=ai.controller.test.js.map
