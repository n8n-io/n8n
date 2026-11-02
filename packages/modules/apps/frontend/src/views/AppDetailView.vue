<script setup lang="ts">
import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { getApp } from '../apps.api';
import { PROJECT_APPS } from '../apps.constants';

const route = useRoute();
const router = useRouter();
const rootStore = useRootStore();
const assistant = capabilityRegistry.use(capabilities.createAppAssistantHandoff)();

onMounted(async () => {
	const originRoute = router.currentRoute.value;
	const projectId = String(route.params.projectId);
	const appId = String(route.params.appId);
	try {
		await getApp(rootStore.restApiContext, projectId, appId);
	} catch (error) {
		if (router.currentRoute.value !== originRoute) return;
		if (error instanceof ResponseError && error.httpStatusCode === 404) {
			await router.replace({ name: PROJECT_APPS, params: { projectId } });
			return;
		}
	}
	if (router.currentRoute.value !== originRoute) return;
	const opened = await assistant.openApp({
		projectId,
		appId,
	});
	if (!opened && router.currentRoute.value === originRoute) {
		await router.replace({ name: PROJECT_APPS, params: { projectId } });
	}
});
</script>

<template>
	<div data-test-id="app-assistant-handoff" />
</template>
