import { mock } from 'vitest-mock-extended';

import { makeKnowledgeAvailabilityService } from '@/modules/knowledge/__tests__/test-utils/knowledge-availability.service';
import type {
	AgentFileRepository,
	AgentKnowledgeTotals,
} from '@/modules/knowledge/repositories/knowledge-file.repository';

import { AgentKnowledgeSnapshotService } from '../agent-knowledge-snapshot.service';
import type { AgentRepository, PublishedAgentVectorStores } from '../repositories/agent.repository';

describe('AgentKnowledgeSnapshotService', () => {
	function makeService(
		pages: PublishedAgentVectorStores[][],
		fileTotals: Record<string, AgentKnowledgeTotals> = {},
		{ isKnowledgeActive = true } = {},
	) {
		const agentRepository = mock<AgentRepository>();
		const agentFileRepository = mock<AgentFileRepository>();

		for (const page of pages) {
			agentRepository.findPublishedVectorStoreProvidersPage.mockResolvedValueOnce(page);
		}

		agentRepository.findPublishedVectorStoreProvidersPage.mockResolvedValue([]);
		agentFileRepository.getKnowledgeTotalsByAgentIds.mockImplementation(
			async (agentIds) =>
				new Map(
					agentIds
						.filter((agentId) => fileTotals[agentId] !== undefined)
						.map((agentId) => [agentId, fileTotals[agentId]]),
				),
		);

		return {
			service: new AgentKnowledgeSnapshotService(
				agentRepository,
				agentFileRepository,
				makeKnowledgeAvailabilityService({ isKnowledgeActive }),
			),
			agentRepository,
			agentFileRepository,
		};
	}

	it('counts each kind of knowledge of the published agents', async () => {
		const { service } = makeService(
			[
				[
					{ agentId: 'files-only', vectorStoreProviders: [] },
					{ agentId: 'vector-stores-only', vectorStoreProviders: ['pinecone', 'qdrant'] },
					{ agentId: 'both', vectorStoreProviders: ['pinecone'] },
					{ agentId: 'no-knowledge', vectorStoreProviders: [] },
				],
			],
			{
				'files-only': { fileCount: 2, totalBytes: 300 },
				both: { fileCount: 1, totalBytes: 50 },
			},
		);

		await expect(service.collect()).resolves.toEqual({
			published_agent_count: 4,
			published_with_files_count: 2,
			published_with_vector_stores_count: 2,
			published_with_both_count: 1,
			knowledge_file_count: 3,
			knowledge_total_bytes: 350,
			vector_store_count: 3,
			vector_store_providers: { pinecone: 2, qdrant: 1 },
		});
	});

	it('counts no files and does not read the file totals when the knowledge module is inactive', async () => {
		const { service, agentFileRepository } = makeService(
			[
				[
					{ agentId: 'files-only', vectorStoreProviders: [] },
					{ agentId: 'both', vectorStoreProviders: ['pinecone'] },
				],
			],
			{
				'files-only': { fileCount: 2, totalBytes: 300 },
				both: { fileCount: 1, totalBytes: 50 },
			},
			{ isKnowledgeActive: false },
		);

		await expect(service.collect()).resolves.toEqual({
			published_agent_count: 2,
			published_with_files_count: 0,
			published_with_vector_stores_count: 1,
			published_with_both_count: 0,
			knowledge_file_count: 0,
			knowledge_total_bytes: 0,
			vector_store_count: 1,
			vector_store_providers: { pinecone: 1 },
		});
		expect(agentFileRepository.getKnowledgeTotalsByAgentIds).not.toHaveBeenCalled();
	});

	it('returns zero counts when no agent is published', async () => {
		const { service } = makeService([]);

		await expect(service.collect()).resolves.toEqual({
			published_agent_count: 0,
			published_with_files_count: 0,
			published_with_vector_stores_count: 0,
			published_with_both_count: 0,
			knowledge_file_count: 0,
			knowledge_total_bytes: 0,
			vector_store_count: 0,
			vector_store_providers: {},
		});
	});

	it('reads the next page after a full page and counts the agents of all pages', async () => {
		const fullPage = Array.from({ length: 500 }, (_, index) => ({
			agentId: `agent-${String(index).padStart(3, '0')}`,
			vectorStoreProviders: [],
		}));

		const { service, agentRepository } = makeService([
			fullPage,
			[{ agentId: 'agent-500', vectorStoreProviders: [] }],
		]);

		const snapshot = await service.collect();

		expect(snapshot.published_agent_count).toBe(501);

		expect(agentRepository.findPublishedVectorStoreProvidersPage).toHaveBeenNthCalledWith(
			1,
			null,
			500,
		);

		expect(agentRepository.findPublishedVectorStoreProvidersPage).toHaveBeenNthCalledWith(
			2,
			'agent-499',
			500,
		);

		expect(agentRepository.findPublishedVectorStoreProvidersPage).toHaveBeenCalledTimes(2);
	});

	it('stops reading pages once the signal aborts', async () => {
		const fullPage = Array.from({ length: 500 }, (_, index) => ({
			agentId: `agent-${String(index).padStart(3, '0')}`,
			vectorStoreProviders: [],
		}));

		const { service, agentRepository } = makeService([]);

		const abortController = new AbortController();
		agentRepository.findPublishedVectorStoreProvidersPage.mockImplementationOnce(async () => {
			abortController.abort();
			return fullPage;
		});

		await service.collect(abortController.signal);

		expect(agentRepository.findPublishedVectorStoreProvidersPage).toHaveBeenCalledTimes(1);
	});
});
