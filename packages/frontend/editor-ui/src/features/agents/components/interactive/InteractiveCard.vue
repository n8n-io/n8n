<script setup lang="ts">
import { computed } from 'vue';
import {
	APPROVAL_TOOL_NAME,
	ASK_CREDENTIAL_TOOL_NAME,
	ASK_EMBEDDING_CREDENTIAL_TOOL_NAME,
	ASK_QUESTIONS_TOOL_NAME,
	CONFIGURE_CHANNEL_TOOL_NAME,
	N8N_CHAT_ACTION_TOOL_NAME,
} from '@n8n/api-types';
import type { AgentsChatInteractionRenderer } from '@/features/ai/shared/agentsChat/interactionRegistry';
import InteractionRenderer from '@/features/ai/shared/agentsChat/components/InteractionRenderer.vue';
import type { InteractivePayload } from '@/features/ai/shared/agentsChat/types';
import AskCredentialCard from './AskCredentialCard.vue';
import AskQuestionsCard from './AskQuestionsCard.vue';
import ApprovalCard from './ApprovalCard.vue';
import ConfigureChannelCard from './ConfigureChannelCard.vue';
import N8nChatActionCard from './N8nChatActionCard.vue';

/**
 * Single dispatch point for the interactive cards. `approval` and
 * `chat_action` still dispatch by `toolName` (their payload shape isn't
 * shared with any other surface). `ask_questions`, `ask_credential` /
 * `ask_embedding_credential`, and `configure_channel` MATCH by the PAYLOAD
 * FIELD that's unique to their suspend schema
 * (`inputType`/`credentialRequests`/`channelConfig`) — this is the same
 * shared instance-AI-compatible contract those three suspend with
 * (`agent-interaction.schema.ts`), so matching on it means the agents-builder
 * chat and the AI assistant render the identical card for the identical
 * payload without a per-surface translation step. `getProps` still narrows
 * via `toolName` (a 1:1, schema-guaranteed correspondence with the payload
 * field) since that's the more reliable TS discriminant.
 *
 * `projectId` / `agentId` are only required when rendering the channel card
 * (which talks to the integrations API using them directly). The credential
 * card also accepts `projectId` but works without it.
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

/**
 * Presence checks also confirm `toolName`, not just the input shape. Without
 * it, a malformed/corrupted payload whose `toolName` doesn't correspond to
 * the field it happens to carry would still `match()` here, then fail to
 * narrow in `getProps` (which discriminates strictly on `toolName`) and hand
 * the card `{}` — missing required props it doesn't guard against. Tying the
 * two together means a mismatch fails `matches()` and falls through to "no
 * renderer" (nothing rendered) instead of a props-shape crash.
 */
function hasQuestionsInput(payload: InteractivePayload): boolean {
	return (
		payload.toolName === ASK_QUESTIONS_TOOL_NAME &&
		'inputType' in payload.input &&
		payload.input.inputType === 'questions'
	);
}

function hasCredentialRequestsInput(payload: InteractivePayload): boolean {
	return (
		(payload.toolName === ASK_CREDENTIAL_TOOL_NAME ||
			payload.toolName === ASK_EMBEDDING_CREDENTIAL_TOOL_NAME) &&
		'credentialRequests' in payload.input
	);
}

function hasChannelConfigInput(payload: InteractivePayload): boolean {
	return payload.toolName === CONFIGURE_CHANNEL_TOOL_NAME && 'channelConfig' in payload.input;
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
		key: 'ask_questions',
		component: AskQuestionsCard,
		matches: (payload) => hasQuestionsInput(payload),
		getProps: (payload) => {
			if (payload.toolName !== ASK_QUESTIONS_TOOL_NAME) return {};
			return {
				questions: payload.input.questions,
				introMessage: payload.input.introMessage,
				resolvedValue: payload.resolvedValue,
			};
		},
	},
	{
		key: 'ask_credential',
		component: AskCredentialCard,
		matches: (payload) => hasCredentialRequestsInput(payload),
		getProps: (payload, context) => {
			if (
				payload.toolName !== ASK_CREDENTIAL_TOOL_NAME &&
				payload.toolName !== ASK_EMBEDDING_CREDENTIAL_TOOL_NAME
			) {
				return {};
			}
			return {
				credentialRequests: payload.input.credentialRequests,
				message: payload.input.message,
				projectId: context?.projectId,
				resolvedValue: payload.resolvedValue,
			};
		},
	},
	{
		key: 'configure_channel',
		component: ConfigureChannelCard,
		matches: (payload) => hasChannelConfigInput(payload),
		getProps: (payload) => {
			if (payload.toolName !== CONFIGURE_CHANNEL_TOOL_NAME) return {};
			return {
				integrationType: payload.input.channelConfig.integrationType,
				agentId: payload.input.channelConfig.agentId,
				projectId: payload.input.projectId,
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
