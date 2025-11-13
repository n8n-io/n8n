import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { useRootStore } from '@n8n/stores/useRootStore';
import * as scimApi from '@n8n/rest-api-client/api/scim';

export const useScimStore = defineStore('scim', () => {
	const rootStore = useRootStore();

	const scimToken = ref('');
	const scimBaseUrl = ref('');

	const isTokenObfuscated = computed(() => {
		return scimToken.value.startsWith('***') || scimToken.value.startsWith('******');
	});

	const loadScimToken = async () => {
		try {
			const response = await scimApi.getScimToken(rootStore.restApiContext);
			scimToken.value = response.token;
			scimBaseUrl.value = response.baseUrl;
		} catch (error) {
			// Token doesn't exist yet, which is fine
			console.debug('No SCIM token found', error);
		}
	};

	const generateScimToken = async () => {
		const response = await scimApi.generateScimToken(rootStore.restApiContext);
		scimToken.value = response.token;
		scimBaseUrl.value = response.baseUrl;
	};

	const deleteScimToken = async () => {
		await scimApi.deleteScimToken(rootStore.restApiContext);
		scimToken.value = '';
		scimBaseUrl.value = '';
	};

	return {
		scimToken,
		scimBaseUrl,
		isTokenObfuscated,
		loadScimToken,
		generateScimToken,
		deleteScimToken,
	};
});
