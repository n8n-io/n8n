import { AIMessageChunk, HumanMessage } from '@langchain/core/messages';
import { SequentialFakeStreamingChatModel } from '../SequentialFakeStreamingChatModel';

describe('SequentialFakeStreamingChatModel', () => {
	let model: SequentialFakeStreamingChatModel;
	let testChunks: AIMessageChunk[];

	beforeEach(() => {
		testChunks = [
			new AIMessageChunk({ content: 'First response' }),
			new AIMessageChunk({ content: 'Second response' }),
			new AIMessageChunk({ content: 'Third response' }),
		];

		model = new SequentialFakeStreamingChatModel(testChunks);
	});

	describe('constructor', () => {
		it('should initialize with chunks and responses', () => {
			expect(model).toBeDefined();
		});
	});

	describe('lc_namespace', () => {
		it('should return correct namespace for chat model validation', () => {
			expect(model.lc_namespace).toEqual(['langchain', 'chat_models', 'fake']);
		});
	});

	describe('bindTools', () => {
		it('should return a proxy that intercepts invoke calls', async () => {
			const tools = [{ name: 'test_tool', description: 'A test tool' }];
			const boundModel = model.bindTools(tools);

			expect(boundModel).toBeDefined();
			expect(typeof boundModel.invoke).toBe('function');
		});

		it('should use sequential responses when invoke is called', async () => {
			const tools = [{ name: 'test_tool', description: 'A test tool' }];
			const boundModel = model.bindTools(tools);

			const response1 = await boundModel.invoke([new HumanMessage('Test')]);
			const response2 = await boundModel.invoke([new HumanMessage('Test')]);
			const response3 = await boundModel.invoke([new HumanMessage('Test')]);

			expect(response1.content).toBe('First response');
			expect(response2.content).toBe('Second response');
			expect(response3.content).toBe('Third response');
		});

		it('should handle when all responses are used', async () => {
			const tools = [{ name: 'test_tool', description: 'A test tool' }];
			const boundModel = model.bindTools(tools);

			// Use all responses once
			await boundModel.invoke([new HumanMessage('Test')]);
			await boundModel.invoke([new HumanMessage('Test')]);
			await boundModel.invoke([new HumanMessage('Test')]);

			// Should return fallback message when no more responses available
			const response4 = await boundModel.invoke([new HumanMessage('Test')]);
			expect(response4.content).toBe('No more responses available');
		});

		it('should preserve other LangChain functionality', async () => {
			const tools = [{ name: 'test_tool', description: 'A test tool' }];
			const boundModel = model.bindTools(tools);

			// Test that non-invoke methods still work
			expect(boundModel.lc_namespace).toBeDefined();
		});
	});

	describe('empty responses handling', () => {
		it('should handle empty responses gracefully', async () => {
			const emptyModel = new SequentialFakeStreamingChatModel([]);
			const tools = [{ name: 'test_tool', description: 'A test tool' }];
			const boundModel = emptyModel.bindTools(tools);

			const response = await boundModel.invoke([new HumanMessage('Test')]);
			expect(response.content).toBe('No responses configured');
		});
	});
});
