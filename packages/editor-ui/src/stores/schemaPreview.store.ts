import * as schemaPreviewApi from '@/api/schemaPreview';
import { createResultError, createResultOk, type Result } from 'n8n-workflow';
import { defineStore } from 'pinia';
import { reactive } from 'vue';
import { useRootStore } from './root.store';
import type { Schema } from '@/Interface';

export const useSchemaPreviewStore = defineStore('schemaPreview', () => {
	// Type cast to avoid 'Type instantiation is excessively deep and possibly infinite'
	const schemaPreviews = reactive<Map<string, Schema>>(new Map()) as Map<string, Schema>;

	const rootStore = useRootStore();

	function getSchemaPreviewKey({
		nodeName,
		version,
		operation,
		resource,
	}: schemaPreviewApi.GetSchemaPreviewOptions) {
		return `${nodeName}_${version}_${resource ?? 'all'}_${operation ?? 'all'}`;
	}

	async function getSchemaPreview(
		options: schemaPreviewApi.GetSchemaPreviewOptions,
	): Promise<Result<Schema, Error>> {
		const key = getSchemaPreviewKey(options);
		const cached = schemaPreviews.get(key);
		if (cached) return createResultOk(cached);

		try {
			const preview = await schemaPreviewApi.getSchemaPreview(rootStore.baseUrl, options);
			schemaPreviews.set(key, preview);
			return createResultOk(preview);
		} catch (error) {
			return createResultError(error);
		}
	}

	return { getSchemaPreview };
});
