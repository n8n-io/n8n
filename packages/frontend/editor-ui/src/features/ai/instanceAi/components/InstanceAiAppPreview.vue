<script setup lang="ts">
import { loadAppView } from '@n8n/frontend-module-apps';
import { defineAsyncComponent, useTemplateRef, watch } from 'vue';

const props = defineProps<{ projectId: string; appId: string; refreshKey: number }>();

const emit = defineEmits<{ deleted: [appId: string] }>();

const AppView = defineAsyncComponent(loadAppView);
const appView = useTemplateRef<{ refresh: () => Promise<void> }>('appView');

watch(
	() => props.refreshKey,
	async () => await appView.value?.refresh(),
);
</script>

<template>
	<AppView
		ref="appView"
		:key="appId"
		:project-id="projectId"
		:app-id="appId"
		data-test-id="instance-ai-app-preview"
		@deleted="emit('deleted', $event)"
	/>
</template>
