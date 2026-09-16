<script setup lang="ts">
import { computed } from 'vue';

import type { ChatUI, RatingFeedback } from '../../../types/assistant';
import N8nChatActions from '../../N8nChatActions/ChatActions.vue';

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
const messageContent = computed(() =>
	'content' in props.message && typeof props.message.content === 'string'
		? props.message.content
		: '',
);

function onRate(rating: RatingFeedback) {
	emit('feedback', rating);
}
</script>

<template>
	<div :class="$style.message">
		<slot></slot>
		<N8nChatActions
			v-if="message.showRating && !isUserMessage"
			:content="messageContent"
			:show-copy="false"
			:show-read-aloud="false"
			:show-rating="true"
			:on-rating="onRate"
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
