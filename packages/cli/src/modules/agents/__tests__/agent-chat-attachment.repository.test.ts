import { LessThan } from '@n8n/typeorm';

import { mockEntityManager } from '@test/mocking';

import { AgentChatAttachment } from '../entities/agent-chat-attachment.entity';
import { AgentChatAttachmentRepository } from '../repositories/agent-chat-attachment.repository';

const entityManager = mockEntityManager(AgentChatAttachment);
const mockDataSource = { manager: entityManager };

describe('AgentChatAttachmentRepository', () => {
	let repository: AgentChatAttachmentRepository;

	beforeEach(() => {
		vi.clearAllMocks();
		repository = new AgentChatAttachmentRepository(mockDataSource as never);
	});

	describe('findFromSourceCreatedBefore', () => {
		it('finds the oldest attachments from the source before the cutoff, up to the limit', async () => {
			const attachments = [new AgentChatAttachment()];
			const find = vi.spyOn(repository, 'find').mockResolvedValue(attachments);
			const before = new Date('2026-06-01T00:00:00.000Z');

			const result = await repository.findFromSourceCreatedBefore(
				{ agentId: 'agent-1', source: 'whatsapp' },
				before,
				50,
			);

			expect(find).toHaveBeenCalledWith({
				where: { agentId: 'agent-1', source: 'whatsapp', createdAt: LessThan(before) },
				order: { createdAt: 'ASC' },
				take: 50,
			});
			expect(result).toBe(attachments);
		});
	});
});
