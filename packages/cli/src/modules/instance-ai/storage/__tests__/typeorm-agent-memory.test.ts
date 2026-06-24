import type { Logger } from '@n8n/backend-common';
import type { AgentDbMessage } from '@n8n/instance-ai';
import { mock } from 'jest-mock-extended';

import type { InstanceAiMessage } from '../../entities/instance-ai-message.entity';
import type { InstanceAiThread } from '../../entities/instance-ai-thread.entity';
import type { InstanceAiMessageRepository } from '../../repositories/instance-ai-message.repository';
import type { InstanceAiObservationCursorRepository } from '../../repositories/instance-ai-observation-cursor.repository';
import type { InstanceAiObservationLockRepository } from '../../repositories/instance-ai-observation-lock.repository';
import type { InstanceAiObservationRepository } from '../../repositories/instance-ai-observation.repository';
import type { InstanceAiResourceRepository } from '../../repositories/instance-ai-resource.repository';
import type { InstanceAiThreadRepository } from '../../repositories/instance-ai-thread.repository';
import { TypeORMAgentMemory } from '../typeorm-agent-memory';

function makeMessageRow(overrides: Partial<InstanceAiMessage> = {}): InstanceAiMessage {
	return {
		id: 'message-1',
		threadId: 'thread-1',
		resourceId: 'user-1',
		content: '{"not":"an-agent-message"}',
		role: 'unknown',
		type: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	} as InstanceAiMessage;
}

function createMemory(deps: {
	threadRepo?: InstanceAiThreadRepository;
	messageRepo?: InstanceAiMessageRepository;
	resourceRepo?: InstanceAiResourceRepository;
	observationRepo?: InstanceAiObservationRepository;
	observationCursorRepo?: InstanceAiObservationCursorRepository;
	observationLockRepo?: InstanceAiObservationLockRepository;
	logger?: Logger;
}) {
	const scopedLogger = mock<Logger>();
	const logger =
		deps.logger ??
		mock<Logger>({
			scoped: jest.fn(() => scopedLogger),
		});

	return {
		memory: new TypeORMAgentMemory(
			deps.threadRepo ?? mock<InstanceAiThreadRepository>(),
			deps.messageRepo ?? mock<InstanceAiMessageRepository>(),
			deps.resourceRepo ?? mock<InstanceAiResourceRepository>(),
			deps.observationRepo ?? mock<InstanceAiObservationRepository>(),
			deps.observationCursorRepo ?? mock<InstanceAiObservationCursorRepository>(),
			deps.observationLockRepo ?? mock<InstanceAiObservationLockRepository>(),
			logger,
		),
		scopedLogger,
	};
}

function getToolInputs(message: AgentDbMessage | undefined): unknown[] {
	if (!message || !('content' in message)) return [];
	return message.content.filter((part) => part.type === 'tool-call').map((part) => part.input);
}

describe('TypeORMAgentMemory', () => {
	it('logs and skips invalid native message rows', async () => {
		const messageRepo = mock<InstanceAiMessageRepository>();
		messageRepo.find.mockResolvedValueOnce([makeMessageRow()]);
		const { memory, scopedLogger } = createMemory({ messageRepo });

		await expect(memory.getMessages('thread-1')).resolves.toEqual([]);

		expect(scopedLogger.warn).toHaveBeenCalledWith(
			'Skipping invalid Instance AI message row',
			expect.objectContaining({
				messageId: 'message-1',
				threadId: 'thread-1',
				resourceId: 'user-1',
			}),
		);
	});

	it('normalizes persisted tool-call input when reading native message rows', async () => {
		const messageRepo = mock<InstanceAiMessageRepository>();
		messageRepo.find.mockResolvedValueOnce([
			makeMessageRow({
				content: JSON.stringify({
					role: 'assistant',
					content: [
						{
							type: 'tool-call',
							toolCallId: 'tc-json',
							toolName: 'nodes',
							input: '{"action":"search"}',
							state: 'resolved',
							output: {},
						},
						{
							type: 'tool-call',
							toolCallId: 'tc-array',
							toolName: 'batch',
							input: ['a', 'b'],
							state: 'resolved',
							output: {},
						},
						{
							type: 'tool-call',
							toolCallId: 'tc-null',
							toolName: 'noop',
							input: null,
							state: 'resolved',
							output: {},
						},
					],
				}),
			}),
		]);
		const { memory } = createMemory({ messageRepo });

		const [message] = await memory.getMessages('thread-1');
		expect(getToolInputs(message)).toEqual([{ action: 'search' }, { value: ['a', 'b'] }, {}]);
	});

	it('normalizes tool-call input before saving native message rows', async () => {
		const messageRepo = mock<InstanceAiMessageRepository>();
		messageRepo.create.mockImplementation((entity) => entity as InstanceAiMessage);
		const { memory } = createMemory({ messageRepo });
		const message: AgentDbMessage = {
			id: 'message-1',
			createdAt: new Date('2026-06-04T09:00:00.000Z'),
			role: 'assistant',
			content: [
				{
					type: 'tool-call',
					toolCallId: 'tc-string',
					toolName: 'legacy',
					input: 'plain-text',
					state: 'resolved',
					output: {},
				},
			],
		};

		await memory.saveMessages({
			threadId: 'thread-1',
			resourceId: 'user-1',
			messages: [message],
		});

		const [createdEntity] = messageRepo.create.mock.calls[0] as Array<{ content?: string }>;
		const persisted = JSON.parse(createdEntity.content ?? '{}') as AgentDbMessage;
		expect(getToolInputs(persisted)[0]).toEqual({
			value: 'plain-text',
		});
	});

	it('persists rows keyed by message id so re-saving the same id upserts (no duplicate)', async () => {
		// The runtime saves a turn's input eagerly and again at end of turn, so the same
		// message id is written twice. The store must key each row on the message id (the
		// primary key) so TypeORM's save() updates the existing row instead of duplicating.
		const messageRepo = mock<InstanceAiMessageRepository>();
		messageRepo.create.mockImplementation((entity) => entity as InstanceAiMessage);
		const { memory } = createMemory({ messageRepo });

		const message: AgentDbMessage = {
			id: 'message-1',
			createdAt: new Date('2026-06-04T09:00:00.000Z'),
			role: 'user',
			content: [{ type: 'text', text: 'hello' }],
		};

		await memory.saveMessages({ threadId: 'thread-1', resourceId: 'user-1', messages: [message] });
		await memory.saveMessages({ threadId: 'thread-1', resourceId: 'user-1', messages: [message] });

		const savedIds = messageRepo.save.mock.calls.map(([entities]) => {
			const [entity] = entities as Array<{ id: string }>;
			return entity.id;
		});
		// Both writes target the same primary key, so the DB upserts a single row.
		expect(savedIds).toEqual(['message-1', 'message-1']);
	});

	it('deletes hidden sub-agent threads and associated working-memory resources by resource prefix', async () => {
		const threadRepo = mock<InstanceAiThreadRepository>();
		const resourceRepo = mock<InstanceAiResourceRepository>();
		threadRepo.find.mockResolvedValueOnce([
			{
				id: '00000000-0000-4000-8000-000000000002',
				resourceId: 'instance-ai-subagent:00000000-0000-4000-8000-000000000001:builder',
			},
		] as InstanceAiThread[]);
		const { memory } = createMemory({ threadRepo, resourceRepo });

		await memory.deleteThreadsByResourceIdPrefix(
			'instance-ai-subagent:00000000-0000-4000-8000-000000000001:',
		);

		expect(threadRepo.find).toHaveBeenCalledWith({
			where: { resourceId: expect.anything() },
		});
		expect(resourceRepo.delete).toHaveBeenCalledTimes(2);
		expect(threadRepo.delete).toHaveBeenCalledWith({ id: expect.anything() });
	});

	it('saveThreadWithProject writes the thread and its project binding together', async () => {
		const threadRepo = mock<InstanceAiThreadRepository>();
		threadRepo.findOneBy.mockResolvedValueOnce(null);
		threadRepo.create.mockImplementation((entity) => entity as InstanceAiThread);
		threadRepo.save.mockImplementation(async (entity) => ({
			...(entity as InstanceAiThread),
			createdAt: new Date('2026-01-01T00:00:00.000Z'),
			updatedAt: new Date('2026-01-01T00:00:00.000Z'),
		}));
		const { memory } = createMemory({ threadRepo });

		await memory.saveThreadWithProject(
			{ id: 'thread-1', resourceId: 'user-1', title: '' },
			'project-1',
		);

		// projectId is part of the inserted row — not a follow-up update.
		expect(threadRepo.create).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'thread-1', resourceId: 'user-1', projectId: 'project-1' }),
		);
		expect(threadRepo.save).toHaveBeenCalledTimes(1);
	});

	it('saveThreadWithProject rejects a conflicting project binding instead of rebinding', async () => {
		const threadRepo = mock<InstanceAiThreadRepository>();
		threadRepo.findOneBy.mockResolvedValueOnce({
			id: 'thread-1',
			resourceId: 'user-1',
			title: 'Existing',
			metadata: null,
			projectId: 'project-original',
			createdAt: new Date('2026-01-01T00:00:00.000Z'),
			updatedAt: new Date('2026-01-01T00:00:00.000Z'),
		} as InstanceAiThread);
		const { memory } = createMemory({ threadRepo });

		await expect(
			memory.saveThreadWithProject(
				{ id: 'thread-1', resourceId: 'user-1', title: '' },
				'project-other',
			),
		).rejects.toThrow('different project binding');

		// The existing binding stands; nothing is written.
		expect(threadRepo.create).not.toHaveBeenCalled();
		expect(threadRepo.save).not.toHaveBeenCalled();
	});

	it('saveThreadWithProject rejects an existing thread owned by another resource', async () => {
		const threadRepo = mock<InstanceAiThreadRepository>();
		threadRepo.findOneBy.mockResolvedValueOnce({
			id: 'thread-1',
			resourceId: 'user-2',
			title: 'Existing',
			metadata: null,
			projectId: 'project-1',
			createdAt: new Date('2026-01-01T00:00:00.000Z'),
			updatedAt: new Date('2026-01-01T00:00:00.000Z'),
		} as InstanceAiThread);
		const { memory } = createMemory({ threadRepo });

		await expect(
			memory.saveThreadWithProject(
				{ id: 'thread-1', resourceId: 'user-1', title: '' },
				'project-1',
			),
		).rejects.toThrow('Not authorized');

		expect(threadRepo.save).not.toHaveBeenCalled();
	});

	it('saveThreadWithProject returns the existing thread when owner and project match', async () => {
		const threadRepo = mock<InstanceAiThreadRepository>();
		threadRepo.findOneBy.mockResolvedValueOnce({
			id: 'thread-1',
			resourceId: 'user-1',
			title: 'Existing',
			metadata: null,
			projectId: 'project-1',
			createdAt: new Date('2026-01-01T00:00:00.000Z'),
			updatedAt: new Date('2026-01-01T00:00:00.000Z'),
		} as InstanceAiThread);
		const { memory } = createMemory({ threadRepo });

		const result = await memory.saveThreadWithProject(
			{ id: 'thread-1', resourceId: 'user-1', title: '' },
			'project-1',
		);

		// Idempotent retry (same owner + project) reuses the row without writing.
		expect(result.id).toBe('thread-1');
		expect(threadRepo.create).not.toHaveBeenCalled();
		expect(threadRepo.save).not.toHaveBeenCalled();
	});

	it('saveThread derives a sub-agent thread project from its parent', async () => {
		const threadRepo = mock<InstanceAiThreadRepository>();
		const parentThreadId = '00000000-0000-4000-8000-000000000001';
		threadRepo.findOneBy.mockResolvedValueOnce(null).mockResolvedValueOnce({
			id: parentThreadId,
			resourceId: 'user-1',
			title: '',
			metadata: null,
			projectId: 'project-1',
			createdAt: new Date('2026-01-01T00:00:00.000Z'),
			updatedAt: new Date('2026-01-01T00:00:00.000Z'),
		} as InstanceAiThread);
		threadRepo.create.mockImplementation((entity) => entity as InstanceAiThread);
		threadRepo.save.mockImplementation(async (entity) => ({
			...(entity as InstanceAiThread),
			createdAt: new Date('2026-01-01T00:00:00.000Z'),
			updatedAt: new Date('2026-01-01T00:00:00.000Z'),
		}));
		const { memory } = createMemory({ threadRepo });

		await memory.saveThread({
			id: 'sub-thread-1',
			resourceId: `instance-ai-subagent:${parentThreadId}:workflow-builder`,
			title: '',
		});

		expect(threadRepo.create).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'sub-thread-1', projectId: 'project-1' }),
		);
	});

	it('saveThread rejects creating a thread with no derivable project', async () => {
		const threadRepo = mock<InstanceAiThreadRepository>();
		threadRepo.findOneBy.mockResolvedValue(null);
		const { memory } = createMemory({ threadRepo });

		await expect(
			memory.saveThread({ id: 'orphan-thread', resourceId: 'user-without-project', title: '' }),
		).rejects.toThrow('without a project');

		expect(threadRepo.save).not.toHaveBeenCalled();
	});
});
