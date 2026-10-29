import type { User, UserRepository } from '@n8n/db';
import { BadRequestError, NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { AgentMemoryEntriesService } from '../agent-memory-entries.service';
import type { AgentMemoryEntryEntity } from '../entities/agent-memory-entry.entity';
import type { N8nMemory, N8nMemoryImpl } from '../integrations/n8n-memory';
import type { AgentMemoryEntryRepository } from '../repositories/agent-memory-entry.repository';
import type { AgentRepository } from '../repositories/agent.repository';

function makeEntry(id: string, resourceId: string, createdAt: string): AgentMemoryEntryEntity {
	return { id, resourceId, content: `fact ${id}`, createdAt: new Date(createdAt) } as never;
}

function makeService() {
	const agentRepository = mock<AgentRepository>();
	agentRepository.findByIdAndProjectId.mockResolvedValue({ id: 'agent-1' } as never);
	const memoryEntryRepository = mock<AgentMemoryEntryRepository>();
	const memory = mock<N8nMemoryImpl>();
	const n8nMemory = mock<N8nMemory>();
	n8nMemory.getImplementation.mockReturnValue(memory);
	const userRepository = mock<UserRepository>();
	const service = new AgentMemoryEntriesService(
		agentRepository,
		memoryEntryRepository,
		n8nMemory,
		userRepository,
	);
	return { service, agentRepository, memoryEntryRepository, memory, userRepository };
}

describe('AgentMemoryEntriesService', () => {
	describe('list', () => {
		it('maps entries with their newest source and a next cursor', async () => {
			const { service, memoryEntryRepository, memory } = makeService();
			memoryEntryRepository.listActiveByAgent.mockResolvedValue([
				makeEntry('e2', 'integration:slack:U1', '2026-10-02T10:00:00.000Z'),
				makeEntry('e1', 'integration:slack:U1', '2026-10-01T10:00:00.000Z'),
			]);
			memoryEntryRepository.countActiveByAgent.mockResolvedValue(14);
			memory.getEntrySourcesWithMessageContext.mockResolvedValue([
				{ memoryEntryId: 'e2', threadId: 't1', author: { id: 'U0', name: 'Old' } },
				{
					memoryEntryId: 'e2',
					threadId: 't2',
					author: { id: 'U1', name: 'Sin' },
					origin: {
						source: 'slack',
						integration: {
							type: 'slack',
							workspaceId: 'W1',
							conversationKind: 'channel',
							channelId: 'C1',
							channelName: 'finance-ops',
						},
					},
				},
			] as never);

			const page = await service.list('agent-1', 'project-1', 'viewer-1', { limit: '1' });

			expect(memoryEntryRepository.listActiveByAgent).toHaveBeenCalledWith(
				'agent-1',
				2,
				undefined,
				{},
			);
			expect(page.total).toBe(14);
			expect(page.nextCursor).toBe('2026-10-02T10:00:00.000Z|e2');
			expect(page.items).toEqual([
				{
					id: 'e2',
					content: 'fact e2',
					createdAt: '2026-10-02T10:00:00.000Z',
					source: { kind: 'slack', userName: 'Sin', place: '#finance-ops' },
					otherSourceCount: 1,
				},
			]);
		});

		it('marks the viewer on their own n8n chat memories', async () => {
			const { service, memoryEntryRepository, memory, userRepository } = makeService();
			memoryEntryRepository.listActiveByAgent.mockResolvedValue([
				makeEntry('e1', 'system-chat:viewer-1', '2026-10-01T10:00:00.000Z'),
			]);
			memoryEntryRepository.countActiveByAgent.mockResolvedValue(1);
			memory.getEntrySourcesWithMessageContext.mockResolvedValue([]);
			userRepository.findManyByIds.mockResolvedValue([
				{ id: 'viewer-1', firstName: 'Robin', lastName: 'B', email: 'r@example.com' } as User,
			]);

			const page = await service.list('agent-1', 'project-1', 'viewer-1', {});

			expect(page.nextCursor).toBeNull();
			expect(page.items[0].source).toEqual({ kind: 'build', userName: 'Robin B', isViewer: true });
		});

		it('shows no name for a chat owner without a first or last name', async () => {
			const { service, memoryEntryRepository, memory, userRepository } = makeService();
			memoryEntryRepository.listActiveByAgent.mockResolvedValue([
				makeEntry('e1', 'n8n-chat-production:other', '2026-10-01T10:00:00.000Z'),
			]);
			memoryEntryRepository.countActiveByAgent.mockResolvedValue(1);
			memory.getEntrySourcesWithMessageContext.mockResolvedValue([]);
			userRepository.findManyByIds.mockResolvedValue([
				{ id: 'other', email: 'private@example.com' } as User,
			]);

			const page = await service.list('agent-1', 'project-1', 'viewer-1', {});

			expect(page.items[0].source).toEqual({ kind: 'n8n-chat' });
		});

		it('rejects a malformed cursor', async () => {
			const { service } = makeService();

			await expect(
				service.list('agent-1', 'project-1', 'viewer-1', { cursor: 'nonsense' }),
			).rejects.toThrow(BadRequestError);
		});

		it('passes the cursor to the repository', async () => {
			const { service, memoryEntryRepository, memory } = makeService();
			memoryEntryRepository.listActiveByAgent.mockResolvedValue([]);
			memoryEntryRepository.countActiveByAgent.mockResolvedValue(0);
			memory.getEntrySourcesWithMessageContext.mockResolvedValue([]);

			await service.list('agent-1', 'project-1', 'viewer-1', {
				cursor: '2026-10-02T10:00:00.000Z|e2',
			});

			expect(memoryEntryRepository.listActiveByAgent).toHaveBeenCalledWith(
				'agent-1',
				26,
				{ createdAt: new Date('2026-10-02T10:00:00.000Z'), id: 'e2' },
				{},
			);
		});

		it('shows the newest source that matches the filter', async () => {
			const { service, memoryEntryRepository, memory } = makeService();
			memoryEntryRepository.listActiveByAgent.mockResolvedValue([
				makeEntry('e1', 'slack:agent-1:W1:channel:C1', '2026-10-01T10:00:00.000Z'),
			]);
			memoryEntryRepository.countActiveByAgent.mockResolvedValue(1);
			const slackSource = (threadId: string, channelId: string, channelName: string) => ({
				memoryEntryId: 'e1',
				threadId,
				author: { id: 'U1', name: 'Sin' },
				origin: {
					source: 'slack',
					integration: {
						type: 'slack',
						workspaceId: 'W1',
						conversationKind: 'channel',
						channelId,
						channelName,
					},
				},
			});
			memory.getEntrySourcesWithMessageContext.mockResolvedValue([
				slackSource('t1', 'C1', 'general'),
				slackSource('t2', 'C2', 'random'),
			] as never);

			const page = await service.list('agent-1', 'project-1', 'viewer-1', {
				source: 'slack',
				sourceFacet: 'channel',
				sourceFacetId: 'C1',
			});

			expect(page.items[0].source).toMatchObject({ place: '#general' });
		});

		it('passes the source filter to the list and the count', async () => {
			const { service, memoryEntryRepository, memory } = makeService();
			memoryEntryRepository.listActiveByAgent.mockResolvedValue([]);
			memoryEntryRepository.countActiveByAgent.mockResolvedValue(0);
			memory.getEntrySourcesWithMessageContext.mockResolvedValue([]);

			await service.list('agent-1', 'project-1', 'viewer-1', {
				source: 'slack',
				sourceFacet: 'channel',
				sourceFacetId: 'C1',
			});

			const filter = {
				sourceMessage: { integrationType: 'slack', field: 'channelId', value: 'C1' },
			};
			expect(memoryEntryRepository.listActiveByAgent).toHaveBeenCalledWith(
				'agent-1',
				26,
				undefined,
				filter,
			);
			expect(memoryEntryRepository.countActiveByAgent).toHaveBeenCalledWith('agent-1', filter);
		});
	});

	describe('delete', () => {
		it('marks the entry as deleted', async () => {
			const { service, memoryEntryRepository } = makeService();
			memoryEntryRepository.markDeleted.mockResolvedValue(true);

			await service.delete('agent-1', 'project-1', 'e1');

			expect(memoryEntryRepository.markDeleted).toHaveBeenCalledWith('agent-1', 'e1');
		});

		it('throws when the entry is not an active entry of the agent', async () => {
			const { service, memoryEntryRepository } = makeService();
			memoryEntryRepository.markDeleted.mockResolvedValue(false);

			await expect(service.delete('agent-1', 'project-1', 'e1')).rejects.toThrow(NotFoundError);
		});

		it('throws when the agent is not in the project', async () => {
			const { service, agentRepository, memoryEntryRepository } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(null);

			await expect(service.delete('agent-1', 'project-1', 'e1')).rejects.toThrow(NotFoundError);
			expect(memoryEntryRepository.markDeleted).not.toHaveBeenCalled();
		});
	});

	describe('deleteCapture', () => {
		it('deletes the capture', async () => {
			const { service, memoryEntryRepository } = makeService();
			memoryEntryRepository.deleteCandidate.mockResolvedValue(true);

			await service.deleteCapture('agent-1', 'project-1', 'c1');

			expect(memoryEntryRepository.deleteCandidate).toHaveBeenCalledWith('agent-1', 'c1', {});
		});

		it('throws when the capture is not pending or completed', async () => {
			const { service, memoryEntryRepository } = makeService();
			memoryEntryRepository.deleteCandidate.mockResolvedValue(false);

			await expect(service.deleteCapture('agent-1', 'project-1', 'c1')).rejects.toThrow(
				NotFoundError,
			);
		});

		it('throws when the agent is not in the project', async () => {
			const { service, agentRepository, memoryEntryRepository } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(null);

			await expect(service.deleteCapture('agent-1', 'project-1', 'c1')).rejects.toThrow(
				NotFoundError,
			);
			expect(memoryEntryRepository.deleteCandidate).not.toHaveBeenCalled();
		});
	});
});
