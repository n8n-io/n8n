<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { v4 as uuidv4 } from 'uuid';
import { useI18n } from '@n8n/i18n';
import { generateNanoId } from '@n8n/utils/generate-nano-id';

import { useToast } from '@n8n/composables/useToast';
import {
	INSTANCE_AI_PENDING_AGENT_ID_STATE,
	INSTANCE_AI_PENDING_AGENT_METADATA_KEY,
	INSTANCE_AI_THREAD_VIEW,
} from '@/features/ai/instanceAi/constants';
import { useInstanceAiStore } from '@/features/ai/instanceAi/instanceAi.store';
import { AGENTS_LIST_VIEW, PROJECT_AGENTS } from '../constants';

/** Shape `generateNanoId` produces, and the only shape the create API accepts. */
const MINTED_AGENT_ID = /^[0-9A-Za-z]{16}$/;

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

	// The entry point mints the id when it reports the click, so the "clicked"
	// and "created" events share a join key. It travels in history state rather
	// than the URL; a hand-authored query is ignored rather than carried into a
	// create the backend would reject.
	const historyState = history.state as Record<string, unknown>;
	const clickedAgentId = historyState[INSTANCE_AI_PENDING_AGENT_ID_STATE];
	const agentId =
		typeof clickedAgentId === 'string' && MINTED_AGENT_ID.test(clickedAgentId)
			? clickedAgentId
			: generateNanoId();
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
