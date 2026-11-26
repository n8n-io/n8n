<script setup lang="ts">
import type { AppPreviewElement } from '@n8n/api-types';
import { loadAppView } from '@n8n/frontend-module-apps';
import { defineAsyncComponent, useTemplateRef, watch } from 'vue';

import { useInstanceAiStore } from '../instanceAi.store';

const props = defineProps<{ projectId: string; appId: string; refreshKey: number }>();

const emit = defineEmits<{ deleted: [appId: string] }>();

const store = useInstanceAiStore();
const AppView = defineAsyncComponent(loadAppView);
const appView = useTemplateRef<{ refresh: () => Promise<void> }>('appView');

watch(
	() => props.refreshKey,
	async () => await appView.value?.refresh(),
);

function addElementToChat(element: AppPreviewElement) {
	store.stageElement({ type: 'element', appId: props.appId, ...element });
	store.requestComposerFocus();
}
</script>

<template>
	<AppView
		ref="appView"
		:key="appId"
		:project-id="projectId"
		:app-id="appId"
		inspectable
		:element-selected="store.hasComposerElementFor(appId)"
		data-test-id="instance-ai-app-preview"
		@deleted="emit('deleted', $event)"
		@element-selected="addElementToChat"
	/>
</template>
