<script setup lang="ts">
import { computed, inject } from 'vue';
import { N8N_CHAT_ACTION_TOOL_NAME, WAIT_TOOL_NAME } from '@n8n/api-types';
import {
	AGENTS_CHAT_INTERACTION_EXTENSIONS,
	type AgentsChatInteractionRenderer,
} from '@/features/ai/shared/agentsChat/interactionRegistry';
import { INTERACTION_EXTENSION_TOOL_NAME } from '@/features/ai/shared/agentsChat/constants';
import InteractionRenderer from '@/features/ai/shared/agentsChat/components/InteractionRenderer.vue';
import type {
	AgentsChatInteraction,
	InteractivePayload,
} from '@/features/ai/shared/agentsChat/types';
import N8nChatActionCard from './N8nChatActionCard.vue';

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

const builtInRenderers = [
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
] satisfies AgentsChatInteractionRenderer[];

const extensions = inject(AGENTS_CHAT_INTERACTION_EXTENSIONS, undefined);

/** The chat's host extensions render their own cards, keyed by `extensionKey`. */
const interactiveRenderers = computed<AgentsChatInteractionRenderer[]>(() => [
	...builtInRenderers,
	...(extensions?.value ?? []).map((extension) => ({
		key: extension.key,
		component: extension.component,
		matches: (payload: AgentsChatInteraction) =>
			payload.toolName === INTERACTION_EXTENSION_TOOL_NAME &&
			payload.extensionKey === extension.key,
		getProps: (payload: AgentsChatInteraction) =>
			extension.getProps?.(payload.input) ?? { input: payload.input },
	})),
]);

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
