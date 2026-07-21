<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';

import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { createAgent } from '../composables/useAgentApi';
import { upsertProjectAgentsListCache } from '../composables/useProjectAgentsList';
import { AGENTS_LIST_VIEW, AGENT_BUILDER_VIEW, PROJECT_AGENTS } from '../constants';

const route = useRoute();
const router = useRouter();
const i18n = useI18n();
const rootStore = useRootStore();
const telemetry = useTelemetry();
const toast = useToast();

onMounted(async () => {
	const projectId = route.query.projectId;
	if (typeof projectId !== 'string' || !projectId) {
		const errorMessage = i18n.baseText('agentSelector.createAgentFailed');
		toast.showError(new Error(errorMessage), errorMessage);
		await router.replace({ name: AGENTS_LIST_VIEW });
		return;
	}

	try {
		const agent = await createAgent(
			rootStore.restApiContext,
			projectId,
			i18n.baseText('agents.new.defaultName'),
		);
		upsertProjectAgentsListCache(projectId, agent);
		telemetry.track('User created agent', {
			agent_id: agent.id,
			source: 'create_blank',
		});
		await router.replace({
			name: AGENT_BUILDER_VIEW,
			params: { projectId, agentId: agent.id },
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('agentSelector.createAgentFailed'));
		await router.replace({ name: PROJECT_AGENTS, params: { projectId } });
	}
});
</script>

<template>
	<div></div>
</template>
