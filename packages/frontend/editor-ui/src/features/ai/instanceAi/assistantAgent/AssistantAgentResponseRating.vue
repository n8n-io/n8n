<script setup lang="ts">
import { N8nIconButton, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import type { AssistantAgentRating } from './assistantAgentFeedback.api';

/**
 * The thumbs of an Assistant agent answer, after the copy and read-aloud
 * actions of the chat. After a rating, a thank-you note replaces them.
 */
const props = defineProps<{ rating?: AssistantAgentRating }>();

const emit = defineEmits<{ rate: [rating: AssistantAgentRating] }>();

const i18n = useI18n();
</script>

<template>
	<div :class="$style.rating" data-test-id="assistant-agent-rating">
		<p v-if="props.rating" :class="$style.thanks" data-test-id="assistant-agent-rating-thanks">
			{{ i18n.baseText('instanceAi.assistantAgent.rating.thanks') }}
		</p>
		<template v-else>
			<N8nTooltip
				:content="i18n.baseText('instanceAi.assistantAgent.rating.helpful')"
				placement="bottom"
			>
				<N8nIconButton
					variant="ghost"
					size="small"
					icon="thumbs-up"
					icon-size="medium"
					:aria-label="i18n.baseText('instanceAi.assistantAgent.rating.helpful')"
					data-test-id="assistant-agent-rating-up"
					@click="emit('rate', 'up')"
				/>
			</N8nTooltip>
			<N8nTooltip
				:content="i18n.baseText('instanceAi.assistantAgent.rating.notHelpful')"
				placement="bottom"
			>
				<N8nIconButton
					variant="ghost"
					size="small"
					icon="thumbs-down"
					icon-size="medium"
					:aria-label="i18n.baseText('instanceAi.assistantAgent.rating.notHelpful')"
					data-test-id="assistant-agent-rating-down"
					@click="emit('rate', 'down')"
				/>
			</N8nTooltip>
		</template>
	</div>
</template>

<style lang="scss" module>
/* The same spacing as the chat actions before it. */
.rating {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.thanks {
	margin: 0;
	color: var(--text-color);
	font-size: var(--font-size--2xs);
}
</style>
