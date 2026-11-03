<script setup lang="ts">
import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { getApp } from '../apps.api';
import { PROJECT_APPS } from '../apps.constants';
import AppView from '../components/AppView.vue';

const route = useRoute();
const router = useRouter();
const rootStore = useRootStore();
const assistant = capabilityRegistry.use(capabilities.createAppAssistantHandoff)();
const projectId = computed(() => String(route.params.projectId));
const appId = computed(() => String(route.params.appId));
const showEditor = ref(!assistant.available.value);
const section = computed({
	get: () => (typeof route.query.section === 'string' ? route.query.section : 'preview'),
	set: (value: string) => {
		void router.replace({
			query: { ...route.query, section: value === 'preview' ? undefined : value },
		});
	},
});

onMounted(async () => {
	if (showEditor.value) return;
	const originRoute = router.currentRoute.value;
	try {
		await getApp(rootStore.restApiContext, projectId.value, appId.value);
	} catch (error) {
		if (router.currentRoute.value !== originRoute) return;
		if (error instanceof ResponseError && error.httpStatusCode === 404) {
			await router.replace({ name: PROJECT_APPS, params: { projectId: projectId.value } });
			return;
		}
	}
	if (router.currentRoute.value !== originRoute) return;
	const opened = await assistant.openApp({
		projectId: projectId.value,
		appId: appId.value,
	});
	if (!opened && router.currentRoute.value === originRoute) {
		showEditor.value = true;
	}
});

function onDeleted() {
	void router.push({ name: PROJECT_APPS, params: { projectId: projectId.value } });
}
</script>

<template>
	<div v-if="showEditor" :class="$style.page">
		<AppView
			v-model:section="section"
			:project-id="projectId"
			:app-id="appId"
			@deleted="onDeleted"
		/>
	</div>
	<div v-else data-test-id="app-assistant-handoff" />
</template>

<style lang="scss" module>
.page {
	width: 100%;
	height: 100%;
	min-height: 0;
}
</style>
