<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { v4 as uuidv4 } from 'uuid';
import { useI18n } from '@n8n/i18n';
import { generateNanoId } from '@n8n/utils/generate-nano-id';

import { useToast } from '@/app/composables/useToast';
import { stashPendingAgentAttachment } from '@/features/ai/instanceAi/composables/useInstanceAiHandoff';
import {
	INSTANCE_AI_AGENT_BUILDER_TARGET_METADATA_KEY,
	INSTANCE_AI_THREAD_VIEW,
} from '@/features/ai/instanceAi/constants';
import { useInstanceAiStore } from '@/features/ai/instanceAi/instanceAi.store';
import { AGENTS_LIST_VIEW, PROJECT_AGENTS } from '../constants';

const route = useRoute();
const router = useRouter();
const i18n = useI18n();
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

	// The agent is minted here, not created: nothing is written until the first
	// config edit or the builder's first `write_config`, so opening this page and
	// walking away leaves no empty agent behind. Minting the final id up front
	// keeps every reference taken before that first write — the thread binding,
	// the artifact tab, the composer attachment — valid without a later rewrite.
	const agentId = generateNanoId();
	const name = i18n.baseText('agents.new.defaultName');

	try {
		const threadId = uuidv4();
		await instanceAiStore.syncThread(threadId, projectId, {
			source: 'agent_builder_page',
			origin: 'internal',
			sourceContext: { agentId },
		});
		await instanceAiStore.updateThreadMetadata(threadId, {
			[INSTANCE_AI_AGENT_BUILDER_TARGET_METADATA_KEY]: {
				agentId,
				projectId,
				name,
				pending: true,
			},
		});
		stashPendingAgentAttachment(threadId, {
			type: 'agent',
			id: agentId,
			name,
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
