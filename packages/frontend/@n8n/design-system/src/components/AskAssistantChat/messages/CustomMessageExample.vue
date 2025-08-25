<script setup lang="ts">
import BaseMessage from './BaseMessage.vue';
import type { ChatUI, RatingFeedback } from '../../../types/assistant';

interface CustomMessageData {
	title?: string;
	description?: string;
	metadata?: Record<string, unknown>;
}

interface Props {
	message: ChatUI.CustomMessage & {
		data: CustomMessageData;
	};
	isFirstOfRole: boolean;
	user?: {
		firstName: string;
		lastName: string;
	};
	streaming?: boolean;
	isLastMessage?: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
	feedback: [RatingFeedback];
}>();
</script>

<template>
	<BaseMessage
		:message="message"
		:is-first-of-role="isFirstOfRole"
		:user="user"
		@feedback="(feedback) => emit('feedback', feedback)"
	>
		<div :class="$style.customMessage">
			<h3 v-if="message.data.title" :class="$style.title">
				{{ message.data.title }}
			</h3>
			<p v-if="message.data.description" :class="$style.description">
				{{ message.data.description }}
			</p>
			<div v-if="message.data.metadata" :class="$style.metadata">
				<pre>{{ JSON.stringify(message.data.metadata, null, 2) }}</pre>
			</div>
		</div>
	</BaseMessage>
</template>

<style lang="scss" module>
.customMessage {
	padding: var(--spacing-xs);
	background-color: var(--color-background-xlight);
	border-radius: var(--border-radius-base);
	border: var(--border-base);
}

.title {
	font-size: var(--font-size-s);
	font-weight: var(--font-weight-bold);
	margin-bottom: var(--spacing-2xs);
	color: var(--color-text-dark);
}

.description {
	font-size: var(--font-size-2xs);
	color: var(--color-text-base);
	margin-bottom: var(--spacing-xs);
}

.metadata {
	font-size: var(--font-size-3xs);
	font-family: var(--font-family-monospace);
	background-color: var(--color-foreground-xlight);
	padding: var(--spacing-2xs);
	border-radius: var(--border-radius-small);
	overflow-x: auto;

	pre {
		margin: 0;
		color: var(--color-text-light);
	}
}
</style>
