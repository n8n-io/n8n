import type { User, UserRepository } from '@n8n/db';
import { BadRequestError, NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { AgentMemoryEntriesService } from '../agent-memory-entries.service';
import type { AgentMemoryQueryEmbedder } from '../agent-memory-query-embedder';
import type { AgentMemoryEntryEntity } from '../entities/agent-memory-entry.entity';
import type { N8nMemory, N8nMemoryImpl } from '../integrations/n8n-memory';
import type { AgentMemoryEntryRepository } from '../repositories/agent-memory-entry.repository';
import type { AgentRepository } from '../repositories/agent.repository';

const viewer = { id: 'viewer-1' } as User;

function makeEntry(
	id: string,
	resourceId: string,
	createdAt: string,
	content = `fact ${id}`,
): AgentMemoryEntryEntity {
	const date = new Date(createdAt);
	return {
		id,
		resourceId,
		content,
		status: 'active',
		createdAt: date,
		updatedAt: date,
		lastSeenAt: date,
	} as never;
}

function makeService() {
	const agentRepository = mock<AgentRepository>();
	agentRepository.findByIdAndProjectId.mockResolvedValue({ id: 'agent-1' } as never);
	const memoryEntryRepository = mock<AgentMemoryEntryRepository>();
	const memory = mock<N8nMemoryImpl>();
	const n8nMemory = mock<N8nMemory>();
	n8nMemory.getImplementation.mockReturnValue(memory);
	const userRepository = mock<UserRepository>();
	const queryEmbedder = mock<AgentMemoryQueryEmbedder>();
	const service = new AgentMemoryEntriesService(
		agentRepository,
		memoryEntryRepository,
		n8nMemory,
		userRepository,
		queryEmbedder,
	);
	return { service, agentRepository, memoryEntryRepository, memory, userRepository, queryEmbedder };
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

			const page = await service.list('agent-1', 'project-1', viewer, { limit: '1' });

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

			const page = await service.list('agent-1', 'project-1', viewer, {});

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

			const page = await service.list('agent-1', 'project-1', viewer, {});

			expect(page.items[0].source).toEqual({ kind: 'n8n-chat' });
		});

		it('rejects a malformed cursor', async () => {
			const { service } = makeService();

			await expect(
				service.list('agent-1', 'project-1', viewer, { cursor: 'nonsense' }),
			).rejects.toThrow(BadRequestError);
		});

		it('passes the cursor to the repository', async () => {
			const { service, memoryEntryRepository, memory } = makeService();
			memoryEntryRepository.listActiveByAgent.mockResolvedValue([]);
			memoryEntryRepository.countActiveByAgent.mockResolvedValue(0);
			memory.getEntrySourcesWithMessageContext.mockResolvedValue([]);

			await service.list('agent-1', 'project-1', viewer, {
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

			const page = await service.list('agent-1', 'project-1', viewer, {
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

			await service.list('agent-1', 'project-1', viewer, {
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

	describe('search', () => {
		it('finds nothing when the agent has no embedder', async () => {
			const { service, memoryEntryRepository, memory, queryEmbedder } = makeService();
			memoryEntryRepository.findActiveForSearch.mockResolvedValue([
				makeEntry(
					'e1',
					'integration:slack:U1',
					'2026-10-02T10:00:00.000Z',
					'Uses EU data residency',
				),
			]);
			memory.getEntrySourcesWithMessageContext.mockResolvedValue([]);
			queryEmbedder.embed.mockResolvedValue(undefined);

			const page = await service.list('agent-1', 'project-1', viewer, { search: 'residency' });

			expect(memoryEntryRepository.listActiveByAgent).not.toHaveBeenCalled();
			expect(page).toEqual({ items: [], total: 0, nextCursor: null });
		});

		it('ranks by similarity, newest first on ties, without a minimum score', async () => {
			const { service, memoryEntryRepository, memory, queryEmbedder } = makeService();
			const withEmbedding = (id: string, createdAt: string, content: string, x: number) => ({
				...makeEntry(id, 'integration:slack:U1', createdAt, content),
				embedding: [x, Math.sqrt(1 - x ** 2)],
				embeddingModel: 'model-a',
			});
			memoryEntryRepository.findActiveForSearch.mockResolvedValue([
				// Shares the word "tea" with the query, but is the least similar.
				withEmbedding('keyword', '2026-10-03T10:00:00.000Z', 'Tea time', 0.1),
				withEmbedding('older', '2026-10-01T10:00:00.000Z', 'Likes coffee', 0.3),
				withEmbedding('newer', '2026-10-02T10:00:00.000Z', 'Drinks espresso', 0.3),
				withEmbedding('best', '2026-09-01T10:00:00.000Z', 'Prefers black coffee', 0.9),
				{
					...makeEntry('other-model', 'integration:slack:U1', '2026-10-04T10:00:00.000Z', 'Tea'),
					embedding: [1, 0],
					embeddingModel: 'model-b',
				},
			] as never);
			memory.getEntrySourcesWithMessageContext.mockResolvedValue([]);
			queryEmbedder.embed.mockResolvedValue({ embedding: [1, 0], model: 'model-a' });

			const page = await service.list('agent-1', 'project-1', viewer, { search: 'tea drinks' });

			expect(page.items.map(({ id }) => id)).toEqual(['best', 'newer', 'older', 'keyword']);
		});

		it('returns at most 50 results', async () => {
			const { service, memoryEntryRepository, memory, queryEmbedder } = makeService();
			memoryEntryRepository.findActiveForSearch.mockResolvedValue(
				Array.from({ length: 60 }, (_, index) => ({
					...makeEntry(`e${index}`, 'integration:slack:U1', '2026-10-01T10:00:00.000Z', 'fact'),
					embedding: [1, 0],
					embeddingModel: 'model-a',
				})) as never,
			);
			memory.getEntrySourcesWithMessageContext.mockResolvedValue([]);
			queryEmbedder.embed.mockResolvedValue({ embedding: [1, 0], model: 'model-a' });

			const page = await service.list('agent-1', 'project-1', viewer, { search: 'fact' });

			expect(page.items).toHaveLength(50);
			expect(page).toMatchObject({ total: 50, nextCursor: null });
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
});
