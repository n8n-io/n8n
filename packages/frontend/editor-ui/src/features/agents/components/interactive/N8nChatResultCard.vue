<script setup lang="ts">
import { N8nResultCard } from '@n8n/design-system';

import { useResultCardIcons } from '@/app/composables/useResultCardIcons';
import type { N8nChatResultCardInput } from '@/features/ai/shared/agentsChat/n8nChatInteraction';

/**
 * Result cards in an agent chat: one the agent showed through `chat_action` →
 * `show_card`, or the ones a workflow tool declared in its own output. Same
 * design-system card the Chat Hub renders for workflow agents; here there is
 * no execution to open, so the footer and execution link stay off.
 */
const props = defineProps<{
	input: N8nChatResultCardInput;
	disabled?: boolean;
}>();

const { iconsByCard } = useResultCardIcons(() => props.input.cards);
</script>

<template>
	<div :class="$style.stack" data-testid="n8n-chat-result-cards">
		<N8nResultCard
			v-for="(card, index) in input.cards"
			:key="index"
			:card="card"
			:icons="iconsByCard[index]"
			:class="$style.card"
			data-testid="n8n-chat-result-card"
		/>
	</div>
</template>

<style lang="scss" module>
.stack {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin: var(--spacing--2xs) 0;
}
.card {
	margin: 0;
}
</style>
