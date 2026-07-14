<script setup lang="ts">
import { computed } from 'vue';
import { APPROVAL_TOOL_NAME, N8N_CHAT_ACTION_TOOL_NAME } from '@n8n/api-types';
import type { AgentsChatInteractionRenderer } from '@/features/ai/shared/agentsChat/interactionRegistry';
import InteractionRenderer from '@/features/ai/shared/agentsChat/components/InteractionRenderer.vue';
import type { InteractivePayload } from '@/features/ai/shared/agentsChat/types';
import ApprovalCard from './ApprovalCard.vue';
import N8nChatActionCard from './N8nChatActionCard.vue';

/**
 * Single dispatch point for the interactive cards. `approval` and
 * `chat_action` dispatch by `toolName` — their payload shape isn't shared
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
		@submit="onSubmit"
	/>
</template>
