<script setup lang="ts">
import { computed } from 'vue';

import N8nChatActions from '../../N8nChatActions/ChatActions.vue';
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
		<N8nChatActions
			v-if="message.showRating && !isUserMessage"
			:content="message.content"
			:show-copy="false"
			:show-read-aloud="false"
			:show-rating="true"
			:show-rating-feedback="message.showFeedback"
			@rating="onRate"
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
