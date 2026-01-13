import { mockDeep } from 'jest-mock-extended';
import type { ISupplyDataFunctions, IChatMemoryService, INode, IWorkflowBase } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { MemoryBufferWindow } from './MemoryBufferWindow.node';
import { MemoryChatBufferSingleton } from './MemoryChatBufferSingleton';

describe('MemoryBufferWindow', () => {
	const supplyDataFunctions = mockDeep<ISupplyDataFunctions>();

	beforeEach(() => {
		jest.resetAllMocks();

		// @ts-expect-error Reset memory singleton between tests
		MemoryChatBufferSingleton.instance = undefined;

		supplyDataFunctions.getWorkflow.mockReturnValue({
			id: 'workflow-123',
		} as unknown as IWorkflowBase);

		supplyDataFunctions.getNode.mockReturnValue({
			id: 'node-456',
			name: 'Simple Memory',
			typeVersion: 1.4,
		} as INode);
	});

	describe('description', () => {
		it('should have correct displayName', () => {
			const node = new MemoryBufferWindow();
			expect(node.description.displayName).toBe('Simple Memory');
		});

		it('should have correct name', () => {
			const node = new MemoryBufferWindow();
			expect(node.description.name).toBe('memoryBufferWindow');
		});

		it('should support multiple versions', () => {
			const node = new MemoryBufferWindow();
			expect(node.description.version).toEqual([1, 1.1, 1.2, 1.3, 1.4]);
		});
	});

	describe('supplyData', () => {
		describe('version < 1.2', () => {
			beforeEach(() => {
				supplyDataFunctions.getNode.mockReturnValue({
					id: 'node-456',
					name: 'Simple Memory',
					typeVersion: 1,
				} as INode);
			});

			it('should use sessionKey parameter directly for session ID', async () => {
				supplyDataFunctions.getNodeParameter.mockImplementation((parameterName) => {
					switch (parameterName) {
						case 'contextWindowLength':
							return 10;
						case 'sessionKey':
							return 'my-session';
						case 'persistentMemory':
							return false;
						default:
							return undefined;
					}
				});

				const node = new MemoryBufferWindow();
				const result = await node.supplyData.call(supplyDataFunctions, 0);

				expect(result.response).toBeDefined();
				// Memory should be created with workflow__session key
				const singleton = MemoryChatBufferSingleton.getInstance();
				// @ts-expect-error Accessing private property for testing
				expect(singleton.memoryBuffer.has('workflow-123__my-session')).toBe(true);
			});
		});

		describe('version >= 1.2 and < 1.4', () => {
			beforeEach(() => {
				supplyDataFunctions.getNode.mockReturnValue({
					id: 'node-456',
					name: 'Simple Memory',
					typeVersion: 1.2,
				} as INode);
			});

			it('should use singleton memory without persistent storage', async () => {
				supplyDataFunctions.getNodeParameter.mockImplementation((parameterName) => {
					switch (parameterName) {
						case 'contextWindowLength':
							return 5;
						case 'sessionIdType':
							return 'customKey';
						case 'sessionKey':
							return 'test-session';
						case 'persistentMemory':
							return false;
						default:
							return undefined;
					}
				});

				const node = new MemoryBufferWindow();
				const result = await node.supplyData.call(supplyDataFunctions, 0);

				expect(result.response).toBeDefined();
			});
		});

		describe('version 1.4+ with persistent memory', () => {
			beforeEach(() => {
				supplyDataFunctions.getNode.mockReturnValue({
					id: 'node-456',
					name: 'Simple Memory',
					typeVersion: 1.4,
				} as INode);
			});

			it('should use ChatMemoryMessageHistory when persistentMemory is true', async () => {
				const mockMemoryService = mockDeep<IChatMemoryService>();
				supplyDataFunctions.helpers.getChatMemoryProxy = jest
					.fn()
					.mockResolvedValue(mockMemoryService);

				supplyDataFunctions.getNodeParameter.mockImplementation((parameterName) => {
					switch (parameterName) {
						case 'contextWindowLength':
							return 10;
						case 'sessionIdType':
							return 'customKey';
						case 'sessionKey':
							return 'persistent-session';
						case 'persistentMemory':
							return true;
						case 'turnId':
							return 'turn-123';
						case 'previousTurnIds':
							return ['turn-1', 'turn-2'];
						default:
							return undefined;
					}
				});

				const node = new MemoryBufferWindow();
				const result = await node.supplyData.call(supplyDataFunctions, 0);

				expect(result.response).toBeDefined();
				expect(supplyDataFunctions.helpers.getChatMemoryProxy).toHaveBeenCalledWith(
					'persistent-session',
					'turn-123',
					['turn-1', 'turn-2'],
				);
			});

			it('should throw error when getChatMemoryProxy is not available', async () => {
				supplyDataFunctions.helpers.getChatMemoryProxy = undefined;

				supplyDataFunctions.getNodeParameter.mockImplementation((parameterName) => {
					switch (parameterName) {
						case 'contextWindowLength':
							return 10;
						case 'sessionIdType':
							return 'fromInput';
						case 'sessionKey':
							return 'test-session';
						case 'persistentMemory':
							return true;
						case 'turnId':
							return null;
						case 'previousTurnIds':
							return null;
						default:
							return undefined;
					}
				});

				const node = new MemoryBufferWindow();
				await expect(node.supplyData.call(supplyDataFunctions, 0)).rejects.toThrow(
					NodeOperationError,
				);
			});

			it('should throw error when getChatMemoryProxy returns null', async () => {
				supplyDataFunctions.helpers.getChatMemoryProxy = jest.fn().mockResolvedValue(null);

				supplyDataFunctions.getNodeParameter.mockImplementation((parameterName) => {
					switch (parameterName) {
						case 'contextWindowLength':
							return 10;
						case 'sessionIdType':
							return 'customKey';
						case 'sessionKey':
							return 'test-session';
						case 'persistentMemory':
							return true;
						case 'turnId':
							return null;
						case 'previousTurnIds':
							return null;
						default:
							return undefined;
					}
				});

				const node = new MemoryBufferWindow();
				await expect(node.supplyData.call(supplyDataFunctions, 0)).rejects.toThrow(
					'Chat Hub module is not available',
				);
			});

			it('should use singleton memory when persistentMemory is false', async () => {
				supplyDataFunctions.getNodeParameter.mockImplementation((parameterName) => {
					switch (parameterName) {
						case 'contextWindowLength':
							return 5;
						case 'sessionIdType':
							return 'customKey';
						case 'sessionKey':
							return 'non-persistent-session';
						case 'persistentMemory':
							return false;
						case 'turnId':
							return null;
						case 'previousTurnIds':
							return null;
						default:
							return undefined;
					}
				});

				const node = new MemoryBufferWindow();
				const result = await node.supplyData.call(supplyDataFunctions, 0);

				expect(result.response).toBeDefined();
				// getChatMemoryProxy should not be called when persistentMemory is false
				expect(supplyDataFunctions.helpers.getChatMemoryProxy).not.toHaveBeenCalled();
			});

			it('should handle null turnId and previousTurnIds', async () => {
				const mockMemoryService = mockDeep<IChatMemoryService>();
				supplyDataFunctions.helpers.getChatMemoryProxy = jest
					.fn()
					.mockResolvedValue(mockMemoryService);

				supplyDataFunctions.getNodeParameter.mockImplementation((parameterName) => {
					switch (parameterName) {
						case 'contextWindowLength':
							return 10;
						case 'sessionIdType':
							return 'customKey';
						case 'sessionKey':
							return 'test-session';
						case 'persistentMemory':
							return true;
						case 'turnId':
							return null;
						case 'previousTurnIds':
							return null;
						default:
							return undefined;
					}
				});

				const node = new MemoryBufferWindow();
				const result = await node.supplyData.call(supplyDataFunctions, 0);

				expect(result.response).toBeDefined();
				expect(supplyDataFunctions.helpers.getChatMemoryProxy).toHaveBeenCalledWith(
					'test-session',
					null,
					null,
				);
			});
		});

		describe('context window length', () => {
			it('should respect contextWindowLength parameter', async () => {
				supplyDataFunctions.getNode.mockReturnValue({
					id: 'node-456',
					name: 'Simple Memory',
					typeVersion: 1,
				} as INode);

				supplyDataFunctions.getNodeParameter.mockImplementation((parameterName) => {
					switch (parameterName) {
						case 'contextWindowLength':
							return 25;
						case 'sessionKey':
							return 'window-test';
						case 'persistentMemory':
							return false;
						default:
							return undefined;
					}
				});

				const node = new MemoryBufferWindow();
				const result = await node.supplyData.call(supplyDataFunctions, 0);

				// The response should be wrapped by logWrapper, but underlying memory should have k=25
				expect(result.response).toBeDefined();

				// Verify through singleton
				const singleton = MemoryChatBufferSingleton.getInstance();
				// @ts-expect-error Accessing private property for testing
				const memoryEntry = singleton.memoryBuffer.get('workflow-123__window-test');
				expect(memoryEntry?.buffer.k).toBe(25);
			});
		});

		describe('different item indices', () => {
			it('should handle different item indices', async () => {
				supplyDataFunctions.getNode.mockReturnValue({
					id: 'node-456',
					name: 'Simple Memory',
					typeVersion: 1,
				} as INode);

				supplyDataFunctions.getNodeParameter.mockImplementation((parameterName, itemIndex) => {
					switch (parameterName) {
						case 'contextWindowLength':
							return 10;
						case 'sessionKey':
							return `session-${itemIndex}`;
						case 'persistentMemory':
							return false;
						default:
							return undefined;
					}
				});

				const node = new MemoryBufferWindow();

				// Call with item index 0
				const result0 = await node.supplyData.call(supplyDataFunctions, 0);
				expect(result0.response).toBeDefined();

				// Call with item index 1
				const result1 = await node.supplyData.call(supplyDataFunctions, 1);
				expect(result1.response).toBeDefined();

				// Verify different sessions created
				const singleton = MemoryChatBufferSingleton.getInstance();
				// @ts-expect-error Accessing private property for testing
				expect(singleton.memoryBuffer.has('workflow-123__session-0')).toBe(true);
				// @ts-expect-error Accessing private property for testing
				expect(singleton.memoryBuffer.has('workflow-123__session-1')).toBe(true);
			});
		});
	});
});
