import type {
	CreateKnowledgeCollectionDto,
	KnowledgeCollectionAgentDto,
	KnowledgeCollectionDto,
	KnowledgeCollectionFileDto,
	KnowledgeCollectionFileListResponse,
} from '@n8n/api-types';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';

import * as api from './collections.api';

/** The knowledge collections in Settings > Context > Collections. */
export const useCollectionsStore = defineStore('contextCollections', () => {
	const rootStore = useRootStore();

	const collections = ref<KnowledgeCollectionDto[]>([]);
	const count = ref(0);
	const loading = ref(false);

	// Only the newest read commits, so a slow earlier read cannot overwrite a later one.
	let latestRead = 0;

	async function fetchCollections() {
		const read = ++latestRead;
		loading.value = true;
		try {
			const response = await api.fetchCollections(rootStore.restApiContext);
			if (read === latestRead) {
				collections.value = response.data;
				count.value = response.count;
			}

			return response;
		} catch (error) {
			// A newer read owns the result, so an older failure reports nothing.
			if (read === latestRead) {
				throw error;
			}

			return undefined;
		} finally {
			if (read === latestRead) {
				loading.value = false;
			}
		}
	}

	async function createCollection(
		projectId: string,
		payload: CreateKnowledgeCollectionDto,
	): Promise<KnowledgeCollectionDto> {
		return await api.createCollection(rootStore.restApiContext, projectId, payload);
	}

	async function getCollection(
		projectId: string,
		collectionId: string,
	): Promise<KnowledgeCollectionDto> {
		return await api.getCollection(rootStore.restApiContext, projectId, collectionId);
	}

	async function listCollectionFiles(
		projectId: string,
		collectionId: string,
	): Promise<KnowledgeCollectionFileListResponse> {
		return await api.listCollectionFiles(rootStore.restApiContext, projectId, collectionId);
	}

	async function uploadCollectionFiles(
		projectId: string,
		collectionId: string,
		files: File[],
	): Promise<KnowledgeCollectionFileDto[]> {
		return await api.uploadCollectionFiles(
			rootStore.restApiContext,
			projectId,
			collectionId,
			files,
		);
	}

	async function deleteCollectionFile(
		projectId: string,
		collectionId: string,
		fileId: string,
	): Promise<void> {
		await api.deleteCollectionFile(rootStore.restApiContext, projectId, collectionId, fileId);
	}

	async function listCollectionAgents(
		projectId: string,
		collectionId: string,
	): Promise<KnowledgeCollectionAgentDto[]> {
		return await api.listCollectionAgents(rootStore.restApiContext, projectId, collectionId);
	}

	return {
		collections,
		count,
		loading,
		fetchCollections,
		createCollection,
		getCollection,
		listCollectionFiles,
		uploadCollectionFiles,
		deleteCollectionFile,
		listCollectionAgents,
	};
});
