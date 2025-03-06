import * as schemaPreviewApi from '@/api/schemaPreview';
import { createResultError, createResultOk, type Result } from 'n8n-workflow';
import { defineStore } from 'pinia';
import { reactive } from 'vue';
import { useRootStore } from './root.store';
import type { JSONSchema7 } from 'json-schema';

export const useSchemaPreviewStore = defineStore('schemaPreview', () => {
	// Type cast to avoid 'Type instantiation is excessively deep and possibly infinite'
	const schemaPreviews = reactive<Map<string, Result<JSONSchema7, Error>>>(new Map()) as Map<
		string,
		Result<JSONSchema7, Error>
	>;

	const rootStore = useRootStore();

	function getSchemaPreviewKey({
		nodeType,
		version,
		operation,
		resource,
	}: schemaPreviewApi.GetSchemaPreviewOptions) {
		return `${nodeType}_${version}_${resource ?? 'all'}_${operation ?? 'all'}`;
	}

	async function getSchemaPreview(
		options: schemaPreviewApi.GetSchemaPreviewOptions,
	): Promise<Result<JSONSchema7, Error>> {
		const key = getSchemaPreviewKey(options);
		const cached = schemaPreviews.get(key);
		if (cached) return cached;

		try {
			const preview = await schemaPreviewApi.getSchemaPreview(rootStore.baseUrl, options);
			const result = createResultOk(preview);
			schemaPreviews.set(key, result);
			return result;
		} catch (error) {
			const result = createResultError(error);
			schemaPreviews.set(key, result);
			return result;
		}
	}

	return { getSchemaPreview };
});
