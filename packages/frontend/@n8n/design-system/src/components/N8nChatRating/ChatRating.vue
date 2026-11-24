<script setup lang="ts">
import { useI18n } from '../../composables/useI18n';
import N8nIconButton from '../N8nIconButton';
import N8nTooltip from '../N8nTooltip';
import type { ChatRatingValue } from './ChatRating.types';

defineOptions({ name: 'N8nChatRating' });

/**
 * Thumbs for a chat message. The parent keeps the rating. When it is set, a
 * thank-you note replaces the thumbs.
 */
defineProps<{ rating?: ChatRatingValue }>();

const emit = defineEmits<{ rate: [rating: ChatRatingValue] }>();

const { t } = useI18n();
</script>

<template>
	<p v-if="rating" :class="$style.success" data-test-id="message-rating-success">
		{{ t('assistantChat.rating.success') }}
	</p>
	<div v-else :class="$style.thumbs">
		<N8nTooltip :content="t('assistantChat.rating.thumbsUp')" placement="bottom">
			<N8nIconButton
				variant="ghost"
				size="small"
				icon="thumbs-up"
				icon-size="medium"
				:aria-label="t('assistantChat.rating.thumbsUp')"
				data-test-id="message-thumbs-up-button"
				@click="emit('rate', 'up')"
			/>
		</N8nTooltip>
		<N8nTooltip :content="t('assistantChat.rating.thumbsDown')" placement="bottom">
			<N8nIconButton
				variant="ghost"
				size="small"
				icon="thumbs-down"
				icon-size="medium"
				:aria-label="t('assistantChat.rating.thumbsDown')"
				data-test-id="message-thumbs-down-button"
				@click="emit('rate', 'down')"
			/>
		</N8nTooltip>
	</div>
</template>

<style lang="scss" module>
/* The same spacing as the chat actions around it. */
.thumbs {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.success {
	margin: 0;
	color: var(--text-color);
	font-size: var(--font-size--2xs);
}
</style>
