<script setup lang="ts">
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useI18n } from '@n8n/i18n';
import { onBeforeUnmount, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { VIEWS } from '@/app/constants';
import { useAgentReturnContextStore } from '@/features/agents/agentReturnContext.store';
import BackToWorkflowBanner from '@/features/agents/components/BackToWorkflowBanner.vue';

const documentTitle = useDocumentTitle();
const locale = useI18n();
const router = useRouter();
const returnContext = useAgentReturnContextStore();

onMounted(async () => {
	documentTitle.set(locale.baseText('agents.heading'));
});

// Clear when leaving the agent feature so a stale banner never leaks into an
// unrelated agent opened later. Switching agents within the feature keeps the
// context (the round-trip is still in progress).
onBeforeUnmount(() => {
	returnContext.clear();
});

async function onBackToWorkflow() {
	const ctx = returnContext.context;
	if (!ctx) return;
	returnContext.clear();
	await router.push({
		name: VIEWS.WORKFLOW,
		params: { workflowId: ctx.workflowId, ...(ctx.nodeId ? { nodeId: ctx.nodeId } : {}) },
	});
}
</script>

<template>
	<div :class="$style.agentView">
		<BackToWorkflowBanner v-if="returnContext.context" @back="onBackToWorkflow" />
		<RouterView />
	</div>
</template>

<style module>
.agentView {
	display: flex;
	flex-direction: column;
	height: 100%;
	width: 100%;
	min-height: 0;
}
</style>
