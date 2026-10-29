<script setup lang="ts">
import { loadAppView } from '@n8n/frontend-module-apps';
import { defineAsyncComponent } from 'vue';

defineProps<{ projectId: string; appId: string; refreshKey: number }>();

const emit = defineEmits<{ deleted: [appId: string] }>();

const AppView = defineAsyncComponent(loadAppView);
</script>

<template>
	<AppView
		:key="`${appId}:${refreshKey}`"
		:project-id="projectId"
		:app-id="appId"
		data-test-id="instance-ai-app-preview"
		@deleted="emit('deleted', $event)"
	/>
</template>
