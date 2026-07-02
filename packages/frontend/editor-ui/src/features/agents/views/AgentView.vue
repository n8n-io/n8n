<script setup lang="ts">
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useI18n } from '@n8n/i18n';
import { computed, onBeforeUnmount, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { VIEWS } from '@/app/constants';
import { useAgentReturnContextStore } from '@/features/agents/agentReturnContext.store';
import BackToWorkflowBanner from '@/features/agents/components/BackToWorkflowBanner.vue';

const documentTitle = useDocumentTitle();
const locale = useI18n();
const route = useRoute();
const router = useRouter();
const returnContext = useAgentReturnContextStore();

const routeAgentId = computed(() => {
	const id = route.params.agentId;
	return Array.isArray(id) ? id[0] : id;
});

// Show the banner only on the pages of the agent the round-trip navigated to.
const showBackBanner = computed(
	() => !!returnContext.context && returnContext.context.agentId === routeAgentId.value,
);

onMounted(async () => {
	documentTitle.set(locale.baseText('agents.heading'));
});

// Clear the round-trip context when leaving the agent feature entirely. This
// parent route wraps the builder/preview/sessions, so switching agents or
// sub-pages keeps it mounted; it only unmounts on a real exit. Without this an
// abandoned round-trip (e.g. browser back) would resurface the banner the next
// time the same agent is opened.
onBeforeUnmount(() => returnContext.clear());

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
		<BackToWorkflowBanner v-if="showBackBanner" @back="onBackToWorkflow" />
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
