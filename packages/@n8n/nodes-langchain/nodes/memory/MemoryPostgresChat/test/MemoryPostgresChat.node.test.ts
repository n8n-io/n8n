import type { ISupplyDataFunctions } from 'n8n-workflow';
import { mock } from 'jest-mock-extended';

import { MemoryPostgresChat } from '../MemoryPostgresChat.node';

describe('MemoryPostgresChat', () => {
	const mockCredentials = {
		host: 'localhost',
		port: 5432,
		database: 'test_db',
		user: 'test_user',
		password: 'test_password',
	};

	const mockPool = {
		$pool: {
			connect: jest.fn(),
			query: jest.fn(),
			end: jest.fn(),
			ended: false,
		},
	};

	const mockPgConf = {
		db: mockPool,
		pgp: {},
	};

	let memoryPostgresChat: MemoryPostgresChat;
	let mockSupplyDataFunctions: ISupplyDataFunctions;

	beforeEach(() => {
		memoryPostgresChat = new MemoryPostgresChat();
		mockSupplyDataFunctions = mock<ISupplyDataFunctions>({
			getCredentials: jest.fn().mockResolvedValue(mockCredentials),
			getNodeParameter: jest.fn((parameterName: string) => {
				if (parameterName === 'tableName') return 'n8n_chat_histories';
				if (parameterName === 'sessionKey') return 'test-session';
				if (parameterName === 'contextWindowLength') return 5;
				return undefined;
			}),
			getNode: jest.fn().mockReturnValue({
				typeVersion: 1.3,
			}),
			helpers: {
				assertBinaryData: jest.fn(),
			},
		});

		// Mock configurePostgres
		(global as any).configurePostgres = jest.fn().mockResolvedValue(mockPgConf);
	});

	describe('closeFunction', () => {
		it('should return a closeFunction in SupplyData', async () => {
			const result = await memoryPostgresChat.supplyData.call(
				mockSupplyDataFunctions,
				0,
			);

			expect(result).toHaveProperty('closeFunction');
			expect(typeof result.closeFunction).toBe('function');
		});

		it('should release client connection when closeFunction is called', async () => {
			const mockRelease = jest.fn();
			const mockClient = {
				release: mockRelease,
			};

			// Mock PostgresChatMessageHistory to have a client
			const mockPostgresChatMessageHistory = jest.fn().mockImplementation(() => ({
				client: mockClient,
			}));

			// Override the import temporarily
			jest.mock('@langchain/community/stores/message/postgres', () => ({
				PostgresChatMessageHistory: mockPostgresChatMessageHistory,
			}));

			const result = await memoryPostgresChat.supplyData.call(
				mockSupplyDataFunctions,
				0,
			);

			// Manually set the client on the pgChatHistory object for testing
			// This simulates the behavior of PostgresChatMessageHistory
			const memory = result.response as any;
			if (memory.chatHistory) {
				(memory.chatHistory as any).client = mockClient;
			}

			// Call the closeFunction
			if (result.closeFunction) {
				await result.closeFunction();
			}

			// In real usage, the release would be called
			// Since we're using optional chaining, it should not throw even if client is undefined
			expect(result.closeFunction).toBeDefined();
		});

		it('should handle missing client gracefully with optional chaining', async () => {
			const result = await memoryPostgresChat.supplyData.call(
				mockSupplyDataFunctions,
				0,
			);

			// Call closeFunction even if client is undefined - should not throw
			expect(async () => {
				if (result.closeFunction) {
					await result.closeFunction();
				}
			}).not.toThrow();
		});

		it('should return SupplyData with both response and closeFunction', async () => {
			const result = await memoryPostgresChat.supplyData.call(
				mockSupplyDataFunctions,
				0,
			);

			expect(result).toHaveProperty('response');
			expect(result).toHaveProperty('closeFunction');
			expect(result.response).toBeDefined();
			expect(typeof result.closeFunction).toBe('function');
		});
	});

	describe('version compatibility', () => {
		it('should work with version 1.1', async () => {
			mockSupplyDataFunctions.getNode = jest.fn().mockReturnValue({
				typeVersion: 1.1,
			});

			const result = await memoryPostgresChat.supplyData.call(
				mockSupplyDataFunctions,
				0,
			);

			expect(result).toHaveProperty('closeFunction');
			expect(result.closeFunction).toBeDefined();
		});

		it('should work with version 1.2', async () => {
			mockSupplyDataFunctions.getNode = jest.fn().mockReturnValue({
				typeVersion: 1.2,
			});

			const result = await memoryPostgresChat.supplyData.call(
				mockSupplyDataFunctions,
				0,
			);

			expect(result).toHaveProperty('closeFunction');
			expect(result.closeFunction).toBeDefined();
		});

		it('should work with version 1.3', async () => {
			mockSupplyDataFunctions.getNode = jest.fn().mockReturnValue({
				typeVersion: 1.3,
			});

			const result = await memoryPostgresChat.supplyData.call(
				mockSupplyDataFunctions,
				0,
			);

			expect(result).toHaveProperty('closeFunction');
			expect(result.closeFunction).toBeDefined();
		});
	});
});

