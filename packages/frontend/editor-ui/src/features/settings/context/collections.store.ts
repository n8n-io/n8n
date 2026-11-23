import type { CreateKnowledgeCollectionDto, KnowledgeCollectionDto } from '@n8n/api-types';
import { defineStore } from 'pinia';
import { useRootStore } from '@n8n/stores/useRootStore';

import * as api from './collections.api';

/** The knowledge collections in Settings > Context > Collections. */
export const useCollectionsStore = defineStore('contextCollections', () => {
	const rootStore = useRootStore();

	async function createCollection(
		projectId: string,
		payload: CreateKnowledgeCollectionDto,
	): Promise<KnowledgeCollectionDto> {
		return await api.createCollection(rootStore.restApiContext, projectId, payload);
	}

	return { createCollection };
});
