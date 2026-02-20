import type { Embeddings } from '@langchain/core/embeddings';
import { ApplicationError, type ISupplyDataFunctions, type SupplyData } from 'n8n-workflow';

import { LangchainVectorStoreAdapter } from '../adapters/langchain-vector-store';
import { isBaseVectorStore } from '../guards';
import type { VectorStore } from '../types/vector-store';
import { logWrapper } from '../utils/log-wrapper';

export interface SupplyVectorStoreOptions {
	closeFunction?: () => Promise<void>;
}

export function supplyVectorStore(
	ctx: ISupplyDataFunctions,
	embeddings: Embeddings,
	store: VectorStore,
	options?: SupplyVectorStoreOptions,
): SupplyData {
	if (!isBaseVectorStore(store)) {
		throw new ApplicationError(
			'Invalid vector store: must implement VectorStore interface with addDocuments, similaritySearch, and deleteDocuments methods',
		);
	}

	if (!store.provider || typeof store.provider !== 'string' || store.provider.trim() === '') {
		throw new ApplicationError('Vector store must have a valid provider name (non-empty string)');
	}

	if (!store.storeId || typeof store.storeId !== 'string' || store.storeId.trim() === '') {
		throw new ApplicationError('Vector store must have a valid storeId (non-empty string)');
	}

	const adapter = new LangchainVectorStoreAdapter(store, embeddings, ctx);
	const wrappedStore = logWrapper(adapter, ctx);

	return {
		response: wrappedStore,
		closeFunction: options?.closeFunction,
	};
}
