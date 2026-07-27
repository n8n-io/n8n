<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { v4 as uuidv4 } from 'uuid';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { stashPendingAgentAttachment } from '@/features/ai/instanceAi/composables/useInstanceAiHandoff';
import {
	INSTANCE_AI_AGENT_BUILDER_TARGET_METADATA_KEY,
	INSTANCE_AI_THREAD_VIEW,
} from '@/features/ai/instanceAi/constants';
import { useInstanceAiStore } from '@/features/ai/instanceAi/instanceAi.store';
import { createAgent } from '../composables/useAgentApi';
import { upsertProjectAgentsListCache } from '../composables/useProjectAgentsList';
import { AGENTS_LIST_VIEW, PROJECT_AGENTS } from '../constants';

const route = useRoute();
const router = useRouter();
const i18n = useI18n();
const rootStore = useRootStore();
const telemetry = useTelemetry();
const toast = useToast();
const instanceAiStore = useInstanceAiStore();

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
		telemetry.track(TELEMETRY_EVENT.AGENTS.USER_CREATED_AGENT, {
			agent_id: agent.id,
			source: 'create_blank',
		});
		const threadId = uuidv4();
		await instanceAiStore.syncThread(threadId, projectId, {
			source: 'agent_builder_page',
			origin: 'internal',
			sourceContext: { agentId: agent.id },
		});
		await instanceAiStore.updateThreadMetadata(threadId, {
			[INSTANCE_AI_AGENT_BUILDER_TARGET_METADATA_KEY]: {
				agentId: agent.id,
				projectId,
				name: agent.name,
			},
		});
		stashPendingAgentAttachment(threadId, {
			type: 'agent',
			id: agent.id,
			name: agent.name,
			projectId,
		});
		await router.replace({
			name: INSTANCE_AI_THREAD_VIEW,
			params: { threadId },
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
