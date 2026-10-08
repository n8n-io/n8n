<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue';
import { N8N_CHAT_ACTION_TOOL_NAME, WAIT_TOOL_NAME } from '@n8n/api-types';
import type { AgentsChatInteractionRenderer } from '@/features/ai/shared/agentsChat/interactionRegistry';
import InteractionRenderer from '@/features/ai/shared/agentsChat/components/InteractionRenderer.vue';
import type { InteractivePayload } from '@/features/ai/shared/agentsChat/types';
import { ASSISTANT_CONFIRMATION_TOOL_NAME } from '@/features/ai/shared/agentsChat/assistantConfirmation';
import N8nChatActionCard from './N8nChatActionCard.vue';

// Only the n8n Assistant session renders these, so load them on demand. The wrapper applies
// the rules of shared chats around the Assistant card.
const AssistantConfirmationCard = defineAsyncComponent(
	async () => await import('@/features/ai/instanceAi/sharing/SharedThreadCard.vue'),
);

/**
 * Single dispatch point for inline cards. `chat_action` and `wait`
 * dispatch by `toolName` — their payload shape isn't shared
 * with any other surface, so `toolName` is a reliable, TS-narrowing
 * discriminant for both `matches` and `getProps`.
 */
const props = defineProps<{
	payload: InteractivePayload;
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

const interactiveRenderers = [
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
	{
		// A workflow tool parked on a Wait node posts the same card contract, so
		// it renders through the same component.
		key: 'wait',
		component: N8nChatActionCard,
		matches: (payload) => payload.toolName === WAIT_TOOL_NAME,
		getProps: (payload) => {
			if (payload.toolName !== WAIT_TOOL_NAME) return {};
			return {
				input: payload.input,
				resolvedValue: payload.resolvedValue,
			};
		},
	},
	{
		key: 'assistant_confirmation',
		component: AssistantConfirmationCard,
		matches: (payload) => payload.toolName === ASSISTANT_CONFIRMATION_TOOL_NAME,
		getProps: (payload) => {
			if (payload.toolName !== ASSISTANT_CONFIRMATION_TOOL_NAME) return {};
			return {
				input: payload.input,
				call: payload.call,
				// An answered automation card stays and reads the result of its tool call.
				resolvedValue: payload.resolvedValue,
				toolCallId: payload.toolCallId,
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
		@submit="onSubmit"
	/>
</template>
