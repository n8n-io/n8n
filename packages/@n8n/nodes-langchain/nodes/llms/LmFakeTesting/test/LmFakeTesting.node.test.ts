import { FakeChatModel, FakeStreamingChatModel } from '@langchain/core/utils/testing';
import { mock } from 'jest-mock-extended';
import type { ISupplyDataFunctions } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { LmFakeTesting } from '../LmFakeTesting.node';
import { FakeLlmSingleton } from '../FakeLlmSingleton';
import { SequentialFakeStreamingChatModel } from '../SequentialFakeStreamingChatModel';

describe('LmFakeTesting Node', () => {
	let node: LmFakeTesting;
	let mockSupplyDataFunction: jest.Mocked<ISupplyDataFunctions>;

	beforeEach(() => {
		node = new LmFakeTesting();
		mockSupplyDataFunction = mock<ISupplyDataFunctions>();

		// Reset singleton before each test
		const singleton = FakeLlmSingleton.getInstance();
		singleton.reset();

		// Mock getNodeParameter method
		mockSupplyDataFunction.getNodeParameter.mockImplementation(
			(param, _itemIndex, defaultValue) => {
				switch (param) {
					case 'responseType':
						return 'fixed';
					case 'responseFormat':
						return 'text';
					case 'textResponses':
						return { values: [{ response: 'Test response' }] };
					case 'toolCallResponses':
						return { values: [] };
					case 'errorMessage':
						return 'Test error';
					case 'toolStyle':
						return 'none';
					case 'resetConfig':
						return false;
					default:
						return defaultValue;
				}
			},
		);

		// Mock getNextRunIndex for runIndex
		(mockSupplyDataFunction.getNextRunIndex as jest.Mock).mockReturnValue(0);
	});

	afterEach(() => {
		// Clean up singleton after each test
		const singleton = FakeLlmSingleton.getInstance();
		singleton.reset();
	});

	describe('description', () => {
		it('should have the expected node properties', () => {
			expect(node.description).toBeDefined();
			expect(node.description.name).toBe('lmFakeTesting');
			expect(node.description.displayName).toBe('Fake LLM (Testing)');
			// Hidden property is commented out for testing purposes
			expect(node.description.hidden).toBeUndefined();
			expect(node.description.inputs).toEqual([]);
			expect(node.description.outputs).toEqual([NodeConnectionTypes.AiLanguageModel]);
		});

		it('should have the correct properties configuration', () => {
			const { properties } = node.description;
			expect(properties).toBeDefined();

			// Check for key properties
			const responseTypeProperty = properties?.find((p) => p.name === 'responseType');
			expect(responseTypeProperty).toBeDefined();
			expect(responseTypeProperty?.type).toBe('options');

			const textResponsesProperty = properties?.find((p) => p.name === 'textResponses');
			expect(textResponsesProperty).toBeDefined();
			expect(textResponsesProperty?.type).toBe('fixedCollection');

			const toolStyleProperty = properties?.find((p) => p.name === 'toolStyle');
			expect(toolStyleProperty).toBeDefined();
			expect(toolStyleProperty?.type).toBe('options');
		});

		it('should be categorized correctly', () => {
			expect(node.description.codex?.categories).toContain('AI');
			expect(node.description.codex?.subcategories?.AI).toContain('Language Models');
		});
	});

	describe('supplyData', () => {
		it('should supply FakeStreamingChatModel for fixed response type', async () => {
			mockSupplyDataFunction.getNodeParameter.mockImplementation(
				(param, _itemIndex, defaultValue) => {
					switch (param) {
						case 'responseType':
							return 'fixed';
						case 'textResponses':
							return { values: [{ response: 'Fixed test response' }] };
						case 'toolStyle':
							return 'none';
						case 'resetConfig':
							return false;
						default:
							return defaultValue;
					}
				},
			);

			const result = await node.supplyData.call(mockSupplyDataFunction, 0);

			expect(result.response).toBeInstanceOf(FakeStreamingChatModel);
		});

		it('should supply SequentialFakeStreamingChatModel for sequence response type', async () => {
			mockSupplyDataFunction.getNodeParameter.mockImplementation(
				(param, _itemIndex, defaultValue) => {
					switch (param) {
						case 'responseType':
							return 'sequence';
						case 'textResponses':
							return {
								values: [
									{ response: 'Response 1' },
									{ response: 'Response 2' },
									{ response: 'Response 3' },
								],
							};
						case 'toolStyle':
							return 'none';
						case 'resetConfig':
							return false;
						default:
							return defaultValue;
					}
				},
			);

			const result = await node.supplyData.call(mockSupplyDataFunction, 0);

			expect(result.response).toBeInstanceOf(SequentialFakeStreamingChatModel);
		});

		it('should supply error-throwing FakeChatModel for error response type', async () => {
			mockSupplyDataFunction.getNodeParameter.mockImplementation(
				(param, _itemIndex, defaultValue) => {
					switch (param) {
						case 'responseType':
							return 'error';
						case 'errorMessage':
							return 'Custom error message';
						case 'toolStyle':
							return 'none';
						case 'resetConfig':
							return false;
						default:
							return defaultValue;
					}
				},
			);

			const result = await node.supplyData.call(mockSupplyDataFunction, 0);

			expect(result.response).toBeInstanceOf(FakeChatModel);

			// Test that the LLM throws the expected error
			await expect((result.response as FakeChatModel).invoke('test')).rejects.toThrow(
				'Custom error message',
			);
		});

		it('should configure singleton with provided parameters', async () => {
			mockSupplyDataFunction.getNodeParameter.mockImplementation(
				(param, _itemIndex, defaultValue) => {
					switch (param) {
						case 'responseType':
							return 'sequence';
						case 'responseFormat':
							return 'text';
						case 'textResponses':
							return { values: [{ response: 'Config test 1' }, { response: 'Config test 2' }] };
						case 'toolStyle':
							return 'function_calling';
						case 'resetConfig':
							return false;
						default:
							return defaultValue;
					}
				},
			);

			await node.supplyData.call(mockSupplyDataFunction, 0);

			const singleton = FakeLlmSingleton.getInstance();
			const config = singleton.getCurrentConfig();

			expect(config.responseType).toBe('sequence');
			expect(config.responses).toEqual(['Config test 1', 'Config test 2']);
			expect(config.toolStyle).toBe('function_calling');
		});

		it('should reset singleton when resetConfig is true', async () => {
			const singleton = FakeLlmSingleton.getInstance();

			// First configure with custom settings
			singleton.configure({
				responseType: 'sequence',
				responses: ['Custom response'],
				toolStyle: 'structured',
			});

			// Now test reset functionality
			mockSupplyDataFunction.getNodeParameter.mockImplementation(
				(param, _itemIndex, defaultValue) => {
					switch (param) {
						case 'responseType':
							return 'fixed';
						case 'responseFormat':
							return 'text';
						case 'textResponses':
							return { values: [{ response: 'New response' }] };
						case 'resetConfig':
							return true;
						default:
							return defaultValue;
					}
				},
			);

			await node.supplyData.call(mockSupplyDataFunction, 0);

			// Verify that singleton was reset and then reconfigured
			const config = singleton.getCurrentConfig();
			expect(config.responseType).toBe('fixed');
			expect(config.responses).toEqual(['New response']);
		});

		it('should handle empty responses gracefully', async () => {
			mockSupplyDataFunction.getNodeParameter.mockImplementation(
				(param, _itemIndex, defaultValue) => {
					switch (param) {
						case 'responseType':
							return 'fixed';
						case 'responseFormat':
							return 'text';
						case 'textResponses':
							return { values: [] }; // Empty responses
						case 'toolStyle':
							return 'none';
						case 'resetConfig':
							return false;
						default:
							return defaultValue;
					}
				},
			);

			const result = await node.supplyData.call(mockSupplyDataFunction, 0);

			expect(result.response).toBeInstanceOf(FakeStreamingChatModel);

			// Should use default response when none provided
			const singleton = FakeLlmSingleton.getInstance();
			const config = singleton.getCurrentConfig();
			expect(config.responses).toEqual(['This is a fake response for testing']);
		});

		it('should filter out falsy responses', async () => {
			mockSupplyDataFunction.getNodeParameter.mockImplementation(
				(param, _itemIndex, defaultValue) => {
					switch (param) {
						case 'responseType':
							return 'sequence';
						case 'responseFormat':
							return 'text';
						case 'textResponses':
							return {
								values: [
									{ response: 'Valid response 1' },
									{ response: '' }, // Empty response
									{ response: 'Valid response 2' },
									{ response: '   ' }, // Whitespace only response
								],
							};
						case 'toolStyle':
							return 'none';
						case 'resetConfig':
							return false;
						default:
							return defaultValue;
					}
				},
			);

			await node.supplyData.call(mockSupplyDataFunction, 0);

			const singleton = FakeLlmSingleton.getInstance();
			const config = singleton.getCurrentConfig();
			// Note: The implementation uses .filter(Boolean) which removes falsy values (only empty strings, not whitespace-only)
			expect(config.responses).toEqual(['Valid response 1', 'Valid response 2', '   ']);
		});

		it('should handle malformed responses parameter', async () => {
			mockSupplyDataFunction.getNodeParameter.mockImplementation(
				(param, _itemIndex, defaultValue) => {
					switch (param) {
						case 'responseType':
							return 'fixed';
						case 'responseFormat':
							return 'text';
						case 'textResponses':
							return null; // Malformed parameter
						case 'toolStyle':
							return 'none';
						case 'resetConfig':
							return false;
						default:
							return defaultValue;
					}
				},
			);

			const result = await node.supplyData.call(mockSupplyDataFunction, 0);

			expect(result.response).toBeInstanceOf(FakeStreamingChatModel);

			// Should use default response when parameter is malformed
			const singleton = FakeLlmSingleton.getInstance();
			const config = singleton.getCurrentConfig();
			expect(config.responses).toEqual(['This is a fake response for testing']);
		});
	});

	describe('integration with singleton', () => {
		it('should maintain singleton state across multiple node instances', async () => {
			const node1 = new LmFakeTesting();
			const node2 = new LmFakeTesting();

			// Configure through first node
			mockSupplyDataFunction.getNodeParameter.mockImplementation(
				(param, _itemIndex, defaultValue) => {
					switch (param) {
						case 'responseType':
							return 'sequence';
						case 'responseFormat':
							return 'text';
						case 'textResponses':
							return { values: [{ response: 'Shared response' }] };
						default:
							return defaultValue;
					}
				},
			);

			await node1.supplyData.call(mockSupplyDataFunction, 0);

			// Use different mock for second node (should still get configured state)
			const mockSupplyDataFunction2 = mock<ISupplyDataFunctions>();
			(mockSupplyDataFunction2.getNextRunIndex as jest.Mock).mockReturnValue(1); // Not 0, so won't reset
			mockSupplyDataFunction2.getNodeParameter.mockImplementation(
				(param, _itemIndex, defaultValue) => {
					switch (param) {
						case 'responseType':
							return 'fixed'; // Different from what was configured
						case 'responseFormat':
							return 'text';
						case 'textResponses':
							return { values: [{ response: 'Different response' }] };
						default:
							return defaultValue;
					}
				},
			);

			await node2.supplyData.call(mockSupplyDataFunction2, 0);

			const singleton = FakeLlmSingleton.getInstance();
			const config = singleton.getCurrentConfig();

			// Should have the configuration from node2 (latest configuration wins)
			expect(config.responseType).toBe('fixed');
			expect(config.responses).toEqual(['Different response']);
		});
	});
});
