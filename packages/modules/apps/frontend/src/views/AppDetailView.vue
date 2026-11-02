<script setup lang="ts">
import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { PROJECT_APPS } from '../apps.constants';

const route = useRoute();
const router = useRouter();
const assistant = capabilityRegistry.use(capabilities.createAppAssistantHandoff)();

onMounted(async () => {
	const projectId = String(route.params.projectId);
	const opened = await assistant.openApp({
		projectId: String(route.params.projectId),
		appId: String(route.params.appId),
	});
	if (!opened) await router.replace({ name: PROJECT_APPS, params: { projectId } });
});
</script>

<template>
	<div data-test-id="app-assistant-handoff" />
</template>
