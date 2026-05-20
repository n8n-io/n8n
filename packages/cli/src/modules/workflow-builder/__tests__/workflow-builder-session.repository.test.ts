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

	const mockExecute = jest.fn().mockResolvedValue(undefined);
	const mockQueryBuilder = {
		insert: jest.fn().mockReturnThis(),
		into: jest.fn().mockReturnThis(),
		values: jest.fn().mockReturnThis(),
		orUpdate: jest.fn().mockReturnThis(),
		execute: mockExecute,
	};

	beforeEach(() => {
		mockClear(entityManager.findOne);
		mockClear(entityManager.delete);
		mockExecute.mockClear();
		mockQueryBuilder.insert.mockClear().mockReturnThis();
		mockQueryBuilder.into.mockClear().mockReturnThis();
		mockQueryBuilder.values.mockClear().mockReturnThis();
		mockQueryBuilder.orUpdate.mockClear().mockReturnThis();

		// Create repository with mocked data source
		const mockDataSource = {
			manager: entityManager,
		};
		repository = new WorkflowBuilderSessionRepository(mockDataSource as never);
		jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as never);
	});

	const userId = 'af6cc09d-e809-41c6-9e92-ca26dfd11487';
	const workflowId = 'wf123';
	const validThreadId = `workflow-${workflowId}-user-${userId}`;
	const codeBuilderThreadId = `${validThreadId}-code`;

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

		it('should throw error for thread ID with non-uuid user id', async () => {
			await expect(repository.getSession('workflow-wf123-user-user456')).rejects.toThrow(
				'Invalid thread ID format: workflow-wf123-user-user456',
			);
		});

		it('should throw error for empty thread ID', async () => {
			await expect(repository.getSession('')).rejects.toThrow('Invalid thread ID format: ');
		});

		it('should parse thread ID with -code suffix without including the suffix in userId', async () => {
			entityManager.findOne.mockResolvedValueOnce(null);

			await repository.getSession(codeBuilderThreadId);

			expect(entityManager.findOne).toHaveBeenCalledWith(WorkflowBuilderSession, {
				where: { workflowId, userId },
			});
		});

		it('should parse thread ID where the workflow id itself contains the word "user"', async () => {
			const trickyWorkflowId = 'wf-with-user-segment-123';
			const trickyThreadId = `workflow-${trickyWorkflowId}-user-${userId}`;
			entityManager.findOne.mockResolvedValueOnce(null);

			await repository.getSession(trickyThreadId);

			expect(entityManager.findOne).toHaveBeenCalledWith(WorkflowBuilderSession, {
				where: { workflowId: trickyWorkflowId, userId },
			});
		});
	});

	describe('getSession', () => {
		it('should return null when no session exists', async () => {
			entityManager.findOne.mockResolvedValueOnce(null);

			const result = await repository.getSession(validThreadId);

			expect(result).toBeNull();
			expect(entityManager.findOne).toHaveBeenCalledWith(WorkflowBuilderSession, {
				where: { workflowId, userId },
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
				workflowId,
				userId,
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
			entity.workflowId = workflowId;
			entity.userId = userId;
			entity.messages = [];
			entity.previousSummary = null;
			entityManager.findOne.mockResolvedValueOnce(entity);

			const result = await repository.getSession(validThreadId);

			expect(result!.previousSummary).toBeUndefined();
		});

		it('should return empty messages array when messages fail validation', async () => {
			const entity = new WorkflowBuilderSession();
			entity.id = 'session-id';
			entity.workflowId = workflowId;
			entity.userId = userId;
			entity.messages = [];
			entity.previousSummary = null;
			entityManager.findOne.mockResolvedValueOnce(entity);

			const result = await repository.getSession(validThreadId);

			expect(result!.messages).toEqual([]);
		});
	});

	describe('saveSession', () => {
		it('should upsert session with serialized messages', async () => {
			const messages = [new HumanMessage('Hello'), new AIMessage('Hi there!')];

			await repository.saveSession(validThreadId, {
				messages,
				previousSummary: 'Summary',
				updatedAt: new Date(),
			});

			expect(mockQueryBuilder.into).toHaveBeenCalledWith(WorkflowBuilderSession);
			expect(mockQueryBuilder.values).toHaveBeenCalledWith({
				id: expect.any(String),
				workflowId,
				userId,
				messages: expect.any(Array),
				previousSummary: 'Summary',
				activeVersionCardId: null,
				resumeAfterRestoreMessageId: null,
			});
			expect(mockQueryBuilder.orUpdate).toHaveBeenCalledWith(
				['messages', 'previousSummary', 'activeVersionCardId', 'resumeAfterRestoreMessageId'],
				['workflowId', 'userId'],
			);
			expect(mockExecute).toHaveBeenCalled();
		});

		it('should upsert session when the thread id carries the -code suffix', async () => {
			await repository.saveSession(codeBuilderThreadId, {
				messages: [],
				updatedAt: new Date(),
			});

			expect(mockQueryBuilder.values).toHaveBeenCalledWith(
				expect.objectContaining({ workflowId, userId }),
			);
		});

		it('should set previousSummary to null when undefined', async () => {
			await repository.saveSession(validThreadId, {
				messages: [],
				updatedAt: new Date(),
			});

			expect(mockQueryBuilder.values).toHaveBeenCalledWith(
				expect.objectContaining({ previousSummary: null }),
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
		it('should delete session by workflowId and userId', async () => {
			entityManager.delete.mockResolvedValueOnce({ affected: 1 } as never);

			await repository.deleteSession(validThreadId);

			expect(entityManager.delete).toHaveBeenCalledWith(WorkflowBuilderSession, {
				workflowId,
				userId,
			});
		});

		it('should delete session for a -code suffix thread id', async () => {
			entityManager.delete.mockResolvedValueOnce({ affected: 1 } as never);

			await repository.deleteSession(codeBuilderThreadId);

			expect(entityManager.delete).toHaveBeenCalledWith(WorkflowBuilderSession, {
				workflowId,
				userId,
			});
		});

		it('should throw error for invalid thread ID', async () => {
			await expect(repository.deleteSession('invalid')).rejects.toThrow(
				'Invalid thread ID format: invalid',
			);
		});
	});
});
