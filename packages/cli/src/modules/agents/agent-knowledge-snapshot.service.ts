import { Service } from '@n8n/di';

import {
	AgentFileRepository,
	type AgentKnowledgeTotals,
} from './repositories/agent-file.repository';
import { AgentRepository, type PublishedAgentVectorStores } from './repositories/agent.repository';

const PAGE_SIZE = 500;

export interface AgentKnowledgeSnapshot {
	published_agent_count: number;
	published_with_files_count: number;
	published_with_vector_stores_count: number;
	published_with_both_count: number;
	knowledge_file_count: number;
	knowledge_total_bytes: number;
	vector_store_count: number;
	vector_store_providers: Record<string, number>;
}

/** Counts the knowledge that the published agents of this instance use. */
@Service()
export class AgentKnowledgeSnapshotService {
	constructor(
		private readonly agentRepository: AgentRepository,
		private readonly agentFileRepository: AgentFileRepository,
	) {}

	/** Stops reading pages once `signal` aborts. The counts are then incomplete. */
	async collect(signal?: AbortSignal): Promise<AgentKnowledgeSnapshot> {
		const snapshot = emptySnapshot();

		for await (const page of this.publishedAgentPages(signal)) {
			const agentIds = page.map((agent) => agent.agentId);
			const totalsByAgentId = await this.agentFileRepository.getKnowledgeTotalsByAgentIds(agentIds);

			for (const agent of page) {
				const fileTotals = totalsByAgentId.get(agent.agentId);
				addAgentDataToSnapshot(snapshot, agent, fileTotals);
			}
		}

		return snapshot;
	}

	/** A page with fewer than PAGE_SIZE agents is the last one. */
	private async *publishedAgentPages(
		signal?: AbortSignal,
	): AsyncGenerator<PublishedAgentVectorStores[]> {
		let afterId: string | null = null;
		let page: PublishedAgentVectorStores[];

		do {
			page = await this.agentRepository.findPublishedVectorStoreProvidersPage(afterId, PAGE_SIZE);

			if (page.length > 0) {
				yield page;
				afterId = page[page.length - 1].agentId;
			}
		} while (page.length === PAGE_SIZE && !signal?.aborted);
	}
}

function emptySnapshot(): AgentKnowledgeSnapshot {
	return {
		published_agent_count: 0,
		published_with_files_count: 0,
		published_with_vector_stores_count: 0,
		published_with_both_count: 0,
		knowledge_file_count: 0,
		knowledge_total_bytes: 0,
		vector_store_count: 0,
		vector_store_providers: {},
	};
}

function addAgentDataToSnapshot(
	snapshot: AgentKnowledgeSnapshot,
	{ vectorStoreProviders }: PublishedAgentVectorStores,
	fileTotals: AgentKnowledgeTotals | undefined,
) {
	const hasFiles = fileTotals !== undefined && fileTotals.fileCount > 0;
	const hasVectorStores = vectorStoreProviders.length > 0;

	snapshot.published_agent_count++;

	if (hasFiles) {
		snapshot.published_with_files_count++;
		snapshot.knowledge_file_count += fileTotals.fileCount;
		snapshot.knowledge_total_bytes += fileTotals.totalBytes;
	}

	if (hasVectorStores) {
		snapshot.published_with_vector_stores_count++;
		snapshot.vector_store_count += vectorStoreProviders.length;
	}

	if (hasFiles && hasVectorStores) {
		snapshot.published_with_both_count++;
	}

	for (const provider of vectorStoreProviders) {
		snapshot.vector_store_providers[provider] =
			(snapshot.vector_store_providers[provider] ?? 0) + 1;
	}
}
