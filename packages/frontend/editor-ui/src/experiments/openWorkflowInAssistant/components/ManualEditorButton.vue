<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { N8nButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import type { ArtifactTab } from '@/features/ai/instanceAi/useCanvasPreview';
import { useOpenWorkflowInAssistantStore } from '../stores/openWorkflowInAssistant.store';

// The host passes its raw tabs so it needs no computeds of its own.
const props = defineProps<{ tabs: ArtifactTab[]; activeTabId?: string }>();

const store = useOpenWorkflowInAssistantStore();
const i18n = useI18n();
const route = useRoute();
const router = useRouter();

const workflowId = computed(() => {
	const tab = props.tabs.find((t) => t.id === props.activeTabId);
	return tab?.type === 'workflow' ? tab.id : null;
});

async function handleClick() {
	if (workflowId.value === null) return;
	store.trackManualEditorOpened(
		workflowId.value,
		typeof route.params.threadId === 'string' ? route.params.threadId : undefined,
	);
	await router.push(`/workflow/${workflowId.value}`);
}
</script>

<template>
	<N8nButton
		v-if="store.isTreatment && workflowId !== null"
		variant="subtle"
		size="small"
		:label="i18n.baseText('experiments.openWorkflowInAssistant.manualEditor')"
		data-test-id="instance-ai-manual-editor-button"
		@click="handleClick"
	/>
</template>
