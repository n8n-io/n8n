import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { mockClear } from 'jest-mock-extended';

import { mockEntityManager } from '@test/mocking';
import { WorkflowBuilderSession } from '../workflow-builder-session.entity';

// Mock the ai-workflow-builder module to avoid import chain issues
jest.mock('@n8n/ai-workflow-builder', () => ({
	isLangchainMessagesArray: jest.fn((arr: unknown[]) => {
		if (!Array.isArray(arr)) return false;
		return arr.every(
			(item: unknown) =>
				typeof item === 'object' &&
				item !== null &&
				'_getType' in item &&
				typeof (item as { _getType: () => string })._getType === 'function',
		);
	}),
	LangchainMessage: {},
	StoredSession: {},
	ISessionStorage: {},
}));

import { WorkflowBuilderSessionRepository } from '../workflow-builder-session.repository';

describe('WorkflowBuilderSessionRepository', () => {
	const entityManager = mockEntityManager(WorkflowBuilderSession);
	let repository: WorkflowBuilderSessionRepository;

	beforeEach(() => {
		mockClear(entityManager.findOne);
		mockClear(entityManager.upsert);
		mockClear(entityManager.delete);

		// Create repository with mocked data source
		const mockDataSource = {
			manager: entityManager,
		};
		repository = new WorkflowBuilderSessionRepository(mockDataSource as never);
	});

	describe('parseThreadId', () => {
		it('should throw error for invalid thread ID format', async () => {
			await expect(repository.getSession('invalid-thread-id')).rejects.toThrow(
				'Invalid thread ID format: invalid-thread-id',
			);
		});

		it('should throw error for thread ID without user part', async () => {
			await expect(repository.getSession('workflow-123')).rejects.toThrow(
				'Invalid thread ID format: workflow-123',
			);
		});

		it('should throw error for empty thread ID', async () => {
			await expect(repository.getSession('')).rejects.toThrow('Invalid thread ID format: ');
		});
	});

	describe('getSession', () => {
		const validThreadId = 'workflow-wf123-user-user456';

		it('should return null when no session exists', async () => {
			entityManager.findOne.mockResolvedValueOnce(null);

			const result = await repository.getSession(validThreadId);

			expect(result).toBeNull();
			expect(entityManager.findOne).toHaveBeenCalledWith(WorkflowBuilderSession, {
				where: { workflowId: 'wf123', userId: 'user456' },
			});
		});

		it('should return session with restored messages', async () => {
			// Use actual LangChain messages and serialize them properly
			const originalMessages = [new HumanMessage('Hello'), new AIMessage('Hi there!')];

			// Serialize using the same format the repository expects
			const { mapChatMessagesToStoredMessages } = await import('@langchain/core/messages');
			const storedMessages = mapChatMessagesToStoredMessages(originalMessages);

			// Use a plain object instead of mock to avoid proxy issues with arrays
			const entity = {
				id: 'session-id',
				workflowId: 'wf123',
				userId: 'user456',
				messages: storedMessages,
				previousSummary: 'Previous summary',
				updatedAt: new Date('2023-12-01T12:00:00Z'),
				createdAt: new Date('2023-12-01T10:00:00Z'),
			} as WorkflowBuilderSession;
			entityManager.findOne.mockResolvedValueOnce(entity);

			const result = await repository.getSession(validThreadId);

			expect(result).not.toBeNull();
			expect(result!.previousSummary).toBe('Previous summary');
			expect(result!.updatedAt).toEqual(new Date('2023-12-01T12:00:00Z'));
			// Messages are restored via mapStoredMessagesToChatMessages
			expect(result!.messages).toHaveLength(2);
			expect(result!.messages[0].content).toBe('Hello');
			expect(result!.messages[1].content).toBe('Hi there!');
		});

		it('should return undefined previousSummary when null in entity', async () => {
			const entity = new WorkflowBuilderSession();
			entity.id = 'session-id';
			entity.workflowId = 'wf123';
			entity.userId = 'user456';
			entity.messages = [];
			entity.previousSummary = null;
			entityManager.findOne.mockResolvedValueOnce(entity);

			const result = await repository.getSession(validThreadId);

			expect(result!.previousSummary).toBeUndefined();
		});

		it('should return empty messages array when messages fail validation', async () => {
			const entity = new WorkflowBuilderSession();
			entity.id = 'session-id';
			entity.workflowId = 'wf123';
			entity.userId = 'user456';
			entity.messages = [];
			entity.previousSummary = null;
			entityManager.findOne.mockResolvedValueOnce(entity);

			const result = await repository.getSession(validThreadId);

			expect(result!.messages).toEqual([]);
		});
	});

	describe('saveSession', () => {
		const validThreadId = 'workflow-wf123-user-user456';

		it('should upsert session with serialized messages', async () => {
			const messages = [new HumanMessage('Hello'), new AIMessage('Hi there!')];
			entityManager.upsert.mockResolvedValueOnce(undefined as never);

			await repository.saveSession(validThreadId, {
				messages,
				previousSummary: 'Summary',
				updatedAt: new Date(),
			});

			expect(entityManager.upsert).toHaveBeenCalledWith(
				WorkflowBuilderSession,
				{
					workflowId: 'wf123',
					userId: 'user456',
					messages: expect.any(Array), // Serialized messages
					previousSummary: 'Summary',
				},
				['workflowId', 'userId'],
			);
		});

		it('should set previousSummary to null when undefined', async () => {
			entityManager.upsert.mockResolvedValueOnce(undefined as never);

			await repository.saveSession(validThreadId, {
				messages: [],
				updatedAt: new Date(),
			});

			expect(entityManager.upsert).toHaveBeenCalledWith(
				WorkflowBuilderSession,
				expect.objectContaining({
					previousSummary: null,
				}),
				['workflowId', 'userId'],
			);
		});

		it('should throw error for invalid thread ID', async () => {
			await expect(
				repository.saveSession('invalid', {
					messages: [],
					updatedAt: new Date(),
				}),
			).rejects.toThrow('Invalid thread ID format: invalid');
		});
	});

	describe('deleteSession', () => {
		const validThreadId = 'workflow-wf123-user-user456';

		it('should delete session by workflowId and userId', async () => {
			entityManager.delete.mockResolvedValueOnce({ affected: 1 } as never);

			await repository.deleteSession(validThreadId);

			expect(entityManager.delete).toHaveBeenCalledWith(WorkflowBuilderSession, {
				workflowId: 'wf123',
				userId: 'user456',
			});
		});

		it('should throw error for invalid thread ID', async () => {
			await expect(repository.deleteSession('invalid')).rejects.toThrow(
				'Invalid thread ID format: invalid',
			);
		});
	});
});
