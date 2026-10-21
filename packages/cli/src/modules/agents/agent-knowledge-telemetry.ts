import type { AgentJsonVectorStoreConfig } from '@n8n/api-types';
import { createHash } from 'node:crypto';

function vectorStoreIdentity(store: AgentJsonVectorStoreConfig): string {
	switch (store.provider) {
		case 'pinecone':
			return store.indexName;
		case 'qdrant':
			return store.collectionName;
		case 'supabase':
		case 'postgres':
			return store.tableName;
	}
}

export function buildVectorStoreFingerprints(stores: AgentJsonVectorStoreConfig[]): string[] {
	const fingerprints = stores.map((store) =>
		createHash('sha256')
			.update(JSON.stringify([store.provider, vectorStoreIdentity(store)]))
			.digest('hex'),
	);
	return [...new Set(fingerprints)].sort();
}
