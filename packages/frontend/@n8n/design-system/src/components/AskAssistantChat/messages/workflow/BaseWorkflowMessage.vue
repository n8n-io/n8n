<script setup lang="ts">
import AssistantLoadingMessage from '@n8n/design-system/components/AskAssistantLoadingMessage/AssistantLoadingMessage.vue';
import type { ChatUI } from '../../../../types/assistant';
import BaseMessage from '../BaseMessage.vue';

interface Props {
	message: ChatUI.AssistantMessage;
	isFirstOfRole: boolean;
	user?: {
		firstName: string;
		lastName: string;
	};
	nextStep?: string;
}

defineProps<Props>();
</script>

<template>
	<BaseMessage :message="message" :is-first-of-role="isFirstOfRole" :user="user">
		<div :class="$style.workflowMessage">
			<div :class="$style.message">
				<slot name="icon"></slot>
				<div :class="$style.content">
					<div :class="$style.title">
						<slot name="title"></slot>
					</div>
					<div :class="$style.details">
						<slot></slot>
					</div>
				</div>
			</div>

			<AssistantLoadingMessage v-if="nextStep" :message="nextStep" :class="$style.nextStep" />
		</div>
	</BaseMessage>
</template>

<style lang="scss" module>
.workflowMessage {
	display: flex;
	flex-direction: column;
}
.message {
	display: flex;
	gap: var(--spacing-s);
	padding: var(--spacing-2xs);
	background-color: var(--color-background-light);
	border-radius: var(--border-radius-base);
}
.nextStep {
	flex: 1;
	width: 100%;
}
.content {
	flex: 1;
}

.title {
	font-weight: var(--font-weight-bold);
	margin-bottom: var(--spacing-4xs);
}

.details {
	color: var(--color-text-base);
	font-size: var(--font-size-2xs);
}
</style>
