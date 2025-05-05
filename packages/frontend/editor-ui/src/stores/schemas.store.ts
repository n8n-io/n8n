import { STORES } from '@/constants';
import { defineStore } from 'pinia';
import { useRootStore } from '@/stores/root.store';

import * as schemaApi from '@/api/schemas';
import { ref } from 'vue';
import type { CreateSchemaDto, Schema } from '@n8n/api-types';

export const useSchemaStore = defineStore(STORES.SCHEMA, () => {
	const schemas = ref<Schema[]>([]);

	const rootStore = useRootStore();

	// const apiKeysSortByCreationDate = computed(() =>
	// 	apiKeys.value.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
	// );

	// const apiKeysById = computed(() => {
	// 	return apiKeys.value.reduce(
	// 		(acc, apiKey) => {
	// 			acc[apiKey.id] = apiKey;
	// 			return acc;
	// 		},
	// 		{} as Record<string, ApiKey>,
	// 	);
	// });

	const getAndCacheApiKeys = async () => {
		if (schemas.value.length) return schemas.value;
		schemas.value = await schemaApi.getSchemas(rootStore.restApiContext);
		return schemas.value;
	};

	const createSchema = async (payload: CreateSchemaDto) => {
		const newSchema = await schemaApi.createSchema(rootStore.restApiContext, payload);
		schemas.value.push(newSchema);
		return newSchema;
	};

	return {
		getAndCacheApiKeys,
		createSchema,
	};
});
