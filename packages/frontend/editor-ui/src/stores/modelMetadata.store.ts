import { defineStore } from 'pinia';
import { getModelMetadata, type GetModelMetadataOptions } from '@/api/modelMetadata';
import type { IModelMetadata } from 'n8n-workflow';
import { useRootStore } from '@n8n/stores/useRootStore';

interface ModelMetadataState {
	cache: Map<string, IModelMetadata | null>;
}

export const useModelMetadataStore = defineStore('modelMetadata', {
	state: (): ModelMetadataState => ({
		cache: new Map(),
	}),

	actions: {
		async getModelMetadata(options: GetModelMetadataOptions): Promise<IModelMetadata | null> {
			const cacheKey = `${options.provider}_${options.modelId}_${options.nodeType || ''}`;

			// Check cache first
			if (this.cache.has(cacheKey)) {
				return this.cache.get(cacheKey) || null;
			}

			// Fetch from API
			const rootStore = useRootStore();
			const metadata = await getModelMetadata(rootStore.restApiContext.baseUrl, options);

			// Cache result (including null for 404s to avoid repeated failed requests)
			this.cache.set(cacheKey, metadata);

			return metadata;
		},

		clearCache() {
			this.cache.clear();
		},
	},
});
