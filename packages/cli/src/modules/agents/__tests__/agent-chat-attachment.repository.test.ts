import { TransactionRunner } from '@n8n/db';
import { In, LessThan, Not } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { mockEntityManager } from '@test/mocking';

import { AgentChatAttachment } from '../entities/agent-chat-attachment.entity';
import { AgentChatAttachmentRepository } from '../repositories/agent-chat-attachment.repository';

const entityManager = mockEntityManager(AgentChatAttachment);
const mockDataSource = { manager: entityManager };

describe('AgentChatAttachmentRepository', () => {
	let repository: AgentChatAttachmentRepository;

	beforeEach(() => {
		vi.clearAllMocks();
		repository = new AgentChatAttachmentRepository(
			mockDataSource as never,
			mock<TransactionRunner>(),
		);
	});

	describe('findFromSourceCreatedBefore', () => {
		it('finds the oldest attachments from the source before the cutoff, up to the limit', async () => {
			const attachments = [new AgentChatAttachment()];
			const find = entityManager.find.mockResolvedValue(attachments);
			const before = new Date('2026-06-01T00:00:00.000Z');

			const result = await repository.findFromSourceCreatedBefore(
				{ agentId: 'agent-1', source: 'whatsapp' },
				before,
				50,
				{},
			);

			expect(find).toHaveBeenCalledWith(AgentChatAttachment, {
				where: { agentId: 'agent-1', source: 'whatsapp', createdAt: LessThan(before) },
				order: { createdAt: 'ASC' },
				take: 50,
			});
			expect(result).toBe(attachments);
		});
	});

	describe('findByHashesInThread', () => {
		it('finds the files of the tree with the hashes, newest first', async () => {
			const find = entityManager.find.mockResolvedValue([]);

			await repository.findByHashesInThread(['h1'], { projectId: 'p-1', threadId: 'root' }, {});

			expect(find).toHaveBeenCalledWith(AgentChatAttachment, {
				where: { contentHash: In(['h1']), projectId: 'p-1', threadId: 'root' },
				order: { createdAt: 'DESC' },
			});
		});

		it('skips the query without hashes', async () => {
			expect(
				await repository.findByHashesInThread([], { projectId: 'p-1', threadId: 'root' }, {}),
			).toEqual([]);
			expect(entityManager.find).not.toHaveBeenCalled();
		});
	});

	describe('findInThreadNewestFirst', () => {
		it('finds the files of the tree without the source, newest first', async () => {
			const find = entityManager.find.mockResolvedValue([]);

			await repository.findInThreadNewestFirst(
				{ projectId: 'p-1', threadId: 'root' },
				'n8n_chat_production',
				{},
			);

			expect(find).toHaveBeenCalledWith(AgentChatAttachment, {
				where: { projectId: 'p-1', threadId: 'root', source: Not('n8n_chat_production') },
				order: { createdAt: 'DESC' },
			});
		});

		it('finds files of all sources when no source is excluded', async () => {
			const find = entityManager.find.mockResolvedValue([]);

			await repository.findInThreadNewestFirst(
				{ projectId: 'p-1', threadId: 'root' },
				undefined,
				{},
			);

			expect(find).toHaveBeenCalledWith(AgentChatAttachment, {
				where: { projectId: 'p-1', threadId: 'root' },
				order: { createdAt: 'DESC' },
			});
		});
	});
});
