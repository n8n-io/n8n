<script setup lang="ts">
import { computed } from 'vue';

import MessageRating from './MessageRating.vue';
import type { ChatUI, RatingFeedback } from '../../../types/assistant';

interface Props {
	message: ChatUI.AssistantMessage;
	isFirstOfRole: boolean;
	user?: {
		firstName: string;
		lastName: string;
	};
}

const props = defineProps<Props>();

const emit = defineEmits<{
	feedback: [RatingFeedback];
}>();

const isUserMessage = computed(() => props.message.role === 'user');

function onRate(rating: RatingFeedback) {
	emit('feedback', rating);
}
</script>

<template>
	<div :class="$style.message">
		<slot></slot>
		<MessageRating
			v-if="message.showRating && !isUserMessage"
			:minimal="message.ratingStyle === 'minimal'"
			:show-feedback="message.showFeedback"
			@feedback="onRate"
		/>
	</div>
</template>

<style lang="scss" module>
.message {
	margin-bottom: var(--spacing--sm);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
}
</style>
