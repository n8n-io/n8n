<script setup lang="ts">
import { computed } from 'vue';
import {
	ASK_CREDENTIAL_TOOL_NAME,
	ASK_LLM_TOOL_NAME,
	ASK_QUESTION_TOOL_NAME,
} from '@n8n/api-types';
import type { InteractivePayload } from '../../composables/agentChatMessages';
import AskCredentialCard from './AskCredentialCard.vue';
import AskLlmCard from './AskLlmCard.vue';
import AskQuestionCard from './AskQuestionCard.vue';

/**
 * Single dispatch point for the interactive cards. Switches by `toolName` so
 * `AgentChatMessageList` doesn't repeat the narrowing helpers / non-null
 * assertions for every per-card branch.
 *
 * `projectId` / `agentId` are only required when rendering AskCredentialCard
 * (which talks to the credentials API). Other cards ignore them.
 */
const props = defineProps<{
	payload: InteractivePayload;
	projectId?: string;
	agentId?: string;
}>();

const emit = defineEmits<{
	submit: [resumeData: unknown];
}>();

/**
 * Disabled when the card is already resolved OR when it's still open but has
 * no `runId` to resume against. The latter happens when a stale interactive
 * card from the open checkpoint can't be matched to a backend suspension —
 * normally an after-effect of expired or pruned checkpoint state.
 */
const disabled = computed(() => !!props.payload.resolvedAt || !props.payload.runId);

function onSubmit(resumeData: unknown) {
	emit('submit', resumeData);
}
</script>

<template>
	<AskCredentialCard
		v-if="payload.toolName === ASK_CREDENTIAL_TOOL_NAME && projectId && agentId"
		:purpose="payload.input.purpose"
		:credential-type="payload.input.credentialType"
		:node-type="payload.input.nodeType"
		:credential-slot="payload.input.slot"
		:project-id="projectId"
		:agent-id="agentId"
		:disabled="disabled"
		:resolved-value="payload.resolvedValue"
		@submit="onSubmit"
	/>
	<AskLlmCard
		v-else-if="payload.toolName === ASK_LLM_TOOL_NAME"
		:purpose="payload.input.purpose"
		:disabled="disabled"
		:resolved-value="payload.resolvedValue"
		@submit="onSubmit"
	/>
	<AskQuestionCard
		v-else-if="payload.toolName === ASK_QUESTION_TOOL_NAME"
		:question="payload.input.question"
		:options="payload.input.options"
		:allow-multiple="payload.input.allowMultiple"
		:disabled="disabled"
		:resolved-value="payload.resolvedValue"
		@submit="onSubmit"
	/>
</template>
