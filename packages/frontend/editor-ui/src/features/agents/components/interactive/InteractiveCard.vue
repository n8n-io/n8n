<script setup lang="ts">
import { computed } from 'vue';
import {
	APPROVAL_TOOL_NAME,
	ASK_CREDENTIAL_TOOL_NAME,
	ASK_LLM_TOOL_NAME,
	ASK_QUESTION_TOOL_NAME,
	N8N_CHAT_ACTION_TOOL_NAME,
} from '@n8n/api-types';
import type {
	AgentsChatInteractionContext,
	AgentsChatInteractionRenderer,
} from '@/features/ai/shared/agentsChat/interactionRegistry';
import InteractionRenderer from '@/features/ai/shared/agentsChat/components/InteractionRenderer.vue';
import type { InteractivePayload } from '../../composables/agentChatMessages';
import AskCredentialCard from './AskCredentialCard.vue';
import AskLlmCard from './AskLlmCard.vue';
import AskQuestionCard from './AskQuestionCard.vue';
import ApprovalCard from './ApprovalCard.vue';
import N8nChatActionCard from './N8nChatActionCard.vue';

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

function hasCredentialContext(
	context: AgentsChatInteractionContext | undefined,
): context is AgentsChatInteractionContext & { projectId: string; agentId: string } {
	return typeof context?.projectId === 'string' && typeof context.agentId === 'string';
}

const interactiveRenderers = [
	{
		key: 'approval',
		component: ApprovalCard,
		matches: (payload) => payload.toolName === APPROVAL_TOOL_NAME,
		getProps: (payload) => {
			if (payload.toolName !== APPROVAL_TOOL_NAME) return {};
			return {
				input: payload.input,
				resolvedValue: payload.resolvedValue,
			};
		},
	},
	{
		key: 'ask_credential',
		component: AskCredentialCard,
		matches: (payload, context) =>
			payload.toolName === ASK_CREDENTIAL_TOOL_NAME && hasCredentialContext(context),
		getProps: (payload, context) => {
			if (payload.toolName !== ASK_CREDENTIAL_TOOL_NAME || !hasCredentialContext(context))
				return {};
			return {
				purpose: payload.input.purpose,
				credentialType: payload.input.credentialType,
				nodeType: payload.input.nodeType,
				credentialSlot: payload.input.credentialSlot,
				projectId: context.projectId,
				agentId: context.agentId,
				resolvedValue: payload.resolvedValue,
			};
		},
	},
	{
		key: 'ask_llm',
		component: AskLlmCard,
		matches: (payload) => payload.toolName === ASK_LLM_TOOL_NAME,
		getProps: (payload, context) => {
			if (payload.toolName !== ASK_LLM_TOOL_NAME) return {};
			return {
				purpose: payload.input.purpose,
				resolvedValue: payload.resolvedValue,
				projectId: context?.projectId,
			};
		},
	},
	{
		key: 'ask_question',
		component: AskQuestionCard,
		matches: (payload) => payload.toolName === ASK_QUESTION_TOOL_NAME,
		getProps: (payload) => {
			if (payload.toolName !== ASK_QUESTION_TOOL_NAME) return {};
			return {
				question: payload.input.question,
				options: payload.input.options,
				allowMultiple: payload.input.allowMultiple,
				resolvedValue: payload.resolvedValue,
			};
		},
	},
	{
		key: 'chat_action',
		component: N8nChatActionCard,
		matches: (payload) => payload.toolName === N8N_CHAT_ACTION_TOOL_NAME,
		getProps: (payload) => {
			if (payload.toolName !== N8N_CHAT_ACTION_TOOL_NAME) return {};
			return {
				input: payload.input,
				resolvedValue: payload.resolvedValue,
			};
		},
	},
] satisfies AgentsChatInteractionRenderer[];

function onSubmit(resumeData: unknown) {
	emit('submit', resumeData);
}
</script>

<template>
	<InteractionRenderer
		:payload="payload"
		:renderers="interactiveRenderers"
		:disabled="disabled"
		:context="{ projectId, agentId }"
		@submit="onSubmit"
	/>
</template>
