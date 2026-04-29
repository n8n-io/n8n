<script setup lang="ts">
import { computed } from 'vue';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import {
	AGENT_APPROVAL_INTERACTION_TYPE,
	ASK_CREDENTIAL_TOOL_NAME,
	ASK_LLM_TOOL_NAME,
	ASK_QUESTION_TOOL_NAME,
} from '@n8n/api-types';
import InstanceAiApprovalCard from '@/features/ai/instanceAi/components/InstanceAiApprovalCard.vue';
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

const locale = useI18n();

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

function stringifyApprovalArgs(args: unknown): string {
	if (args === undefined || args === null) return '';
	if (typeof args === 'object' && !Array.isArray(args) && Object.keys(args).length === 0) return '';

	try {
		return JSON.stringify(args, null, 2);
	} catch {
		return String(args);
	}
}

function getApprovalMessage(
	payload: Extract<InteractivePayload, { interactionType: typeof AGENT_APPROVAL_INTERACTION_TYPE }>,
) {
	const args = stringifyApprovalArgs(payload.input.args);
	if (!args) {
		return locale.baseText('agents.chat.approval.message' as BaseTextKey, {
			interpolate: { tool: payload.input.toolName },
		});
	}

	return locale.baseText('agents.chat.approval.messageWithArgs' as BaseTextKey, {
		interpolate: { tool: payload.input.toolName, args },
	});
}
</script>

<template>
	<InstanceAiApprovalCard
		v-if="payload.interactionType === AGENT_APPROVAL_INTERACTION_TYPE"
		:title="payload.input.toolName"
		:message="getApprovalMessage(payload)"
		:disabled="disabled"
		@deny="onSubmit({ approved: false })"
		@approve="onSubmit({ approved: true })"
	/>
	<AskCredentialCard
		v-else-if="payload.interactionType === ASK_CREDENTIAL_TOOL_NAME && projectId && agentId"
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
		v-else-if="payload.interactionType === ASK_LLM_TOOL_NAME"
		:purpose="payload.input.purpose"
		:disabled="disabled"
		:resolved-value="payload.resolvedValue"
		@submit="onSubmit"
	/>
	<AskQuestionCard
		v-else-if="payload.interactionType === ASK_QUESTION_TOOL_NAME"
		:question="payload.input.question"
		:options="payload.input.options"
		:allow-multiple="payload.input.allowMultiple"
		:disabled="disabled"
		:resolved-value="payload.resolvedValue"
		@submit="onSubmit"
	/>
</template>
