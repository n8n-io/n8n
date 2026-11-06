import type { AgentJsonVectorStoreConfig } from '@n8n/api-types';

import { createKnowledgeTelemetryHmac } from '@/modules/knowledge/knowledge-telemetry';

/** The parts that name one set of stored documents. A Pinecone namespace is its own set. */
function vectorStoreIdentity(store: AgentJsonVectorStoreConfig): string[] {
	switch (store.provider) {
		case 'pinecone':
			return store.namespace ? [store.indexName, store.namespace] : [store.indexName];
		case 'qdrant':
			return [store.collectionName];
		case 'supabase':
		case 'postgres':
			return [store.tableName];
	}
}

export function buildVectorStoreFingerprints(
	stores: AgentJsonVectorStoreConfig[],
	instanceSecret: string,
): string[] {
	const fingerprints = stores.map((store) =>
		createKnowledgeTelemetryHmac(instanceSecret)
			.update(JSON.stringify([store.provider, ...vectorStoreIdentity(store)]))
			.digest('hex'),
	);
	return [...new Set(fingerprints)].sort();
}
