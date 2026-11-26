<script setup lang="ts">
import { computed, inject, onMounted, provide } from 'vue';

import type { ToolCall } from '@/features/ai/shared/agentsChat/types';

import PreferenceCard from '../components/PreferenceCard.vue';
import { PREFERENCE_CARD_HOST, type PreferenceCardHost } from '../preferenceCardHost';
import { ASSISTANT_AGENT_PROJECT_ID } from './assistantAgentThreads';
import { ASSISTANT_PREFERENCE_CARDS, toPreferenceCardToolCall } from './assistantPreferenceCards';

const props = defineProps<{ toolCall: ToolCall }>();

const cards = inject(ASSISTANT_PREFERENCE_CARDS, null);
const threadProjectId = inject(ASSISTANT_AGENT_PROJECT_ID, undefined);

/** A chat without the card state shows the tool result, and nothing can change it. */
const readOnlyHost: PreferenceCardHost = {
	projectId: () => threadProjectId,
	undo: async () => false,
	edit: async () => null,
};
provide(PREFERENCE_CARD_HOST, cards?.host ?? readOnlyHost);

onMounted(() => {
	void cards?.load();
});

const toolCall = computed(() =>
	toPreferenceCardToolCall(props.toolCall, cards?.get(props.toolCall.toolCallId)),
);
const readOnly = computed(() => !cards?.isLatest(props.toolCall.toolCallId));
</script>

<template>
	<!-- The current Assistant card. The Agents runtime keeps no run id for a finished call. -->
	<PreferenceCard :tool-call="toolCall" run-id="" :read-only="readOnly" />
</template>
