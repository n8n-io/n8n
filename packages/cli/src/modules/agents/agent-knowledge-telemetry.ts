import type { AgentJsonVectorStoreConfig } from '@n8n/api-types';
import { createHmac } from 'node:crypto';

const KNOWLEDGE_TELEMETRY_KEY_LABEL = 'agent-knowledge-telemetry';

/**
 * Make sure a knowledge code cannot be matched to a known file or source name outside this instance.
 * The derived key keeps these codes apart from other uses of the instance secret.
 */
export function createKnowledgeTelemetryHmac(instanceSecret: string) {
	const key = createHmac('sha256', instanceSecret).update(KNOWLEDGE_TELEMETRY_KEY_LABEL).digest();
	return createHmac('sha256', key);
}

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
