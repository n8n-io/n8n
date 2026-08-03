<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { v4 as uuidv4 } from 'uuid';
import { useI18n } from '@n8n/i18n';
import { generateNanoId } from '@n8n/utils/generate-nano-id';

import { useToast } from '@n8n/composables/useToast';
import {
	INSTANCE_AI_PENDING_AGENT_METADATA_KEY,
	INSTANCE_AI_THREAD_VIEW,
} from '@/features/ai/instanceAi/constants';
import { useInstanceAiStore } from '@/features/ai/instanceAi/instanceAi.store';
import { AGENTS_LIST_VIEW, PROJECT_AGENTS } from '../constants';

const route = useRoute();
const router = useRouter();
const i18n = useI18n();
const toast = useToast();
const instanceAiStore = useInstanceAiStore();

/**
 * Opens a new-agent artifact without persisting anything. The agent id is
 * minted here and carried on the thread so both paths that can create the
 * agent — a config edit in the artifact, or an agent-building chat request —
 * create it under the same id. Nothing reaches the database until one of them
 * happens, so abandoning the thread leaves no empty agent behind.
 */
onMounted(async () => {
	const projectId = route.query.projectId;
	if (typeof projectId !== 'string' || !projectId) {
		const errorMessage = i18n.baseText('agentSelector.createAgentFailed');
		toast.showError(new Error(errorMessage), errorMessage);
		await router.replace({ name: AGENTS_LIST_VIEW });
		return;
	}

	const agentId = generateNanoId();
	const threadId = uuidv4();
	try {
		await instanceAiStore.syncThread(threadId, projectId, {
			source: 'agent_builder_page',
			origin: 'internal',
			sourceContext: { agentId },
		});
		await instanceAiStore.updateThreadMetadata(threadId, {
			[INSTANCE_AI_PENDING_AGENT_METADATA_KEY]: { projectId, agentId },
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
