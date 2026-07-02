<script setup lang="ts">
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
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

// Clear the round-trip context when actually leaving the agent feature. Uses a
// route-leave guard rather than onBeforeUnmount: this parent component can be
// transiently unmounted+remounted by <Suspense> while an async child-route
// chunk resolves on the first (uncached) navigation in, and an onBeforeUnmount
// clear there would wipe the just-set context — making the "Back to workflow"
// banner blink and vanish. onBeforeRouteLeave fires only on a real route-level
// exit (never on the Suspense swap, never on builder/preview/sessions
// sub-page switches), so the banner survives. Still covers the abandoned
// round-trip (browser back), which would otherwise resurface the banner.
onBeforeRouteLeave(() => {
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
