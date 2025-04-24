<script setup lang="ts">
import { ref } from 'vue';

import { useI18n } from '@n8n/design-system/composables/useI18n';

import BaseWorkflowMessage from './BaseWorkflowMessage.vue';
import type { ChatUI } from '../../../../types/assistant';

interface Props {
	message: ChatUI.RateWorkflowMessage & { id: string; read: boolean };
	isFirstOfRole: boolean;
	user?: {
		firstName: string;
		lastName: string;
	};
}

const { t } = useI18n();
const emit = defineEmits<{
	thumbsUp: [];
	thumbsDown: [];
	submitFeedback: [string];
}>();
defineProps<Props>();

const feedback = ref('');
const showFeedback = ref(false);
const showSuccess = ref(false);

function onRateButton(rating: 'thumbsUp' | 'thumbsDown') {
	showFeedback.value = true;
	if (rating === 'thumbsUp') {
		emit('thumbsUp');
	} else {
		emit('thumbsDown');
	}
}

function onSubmitFeedback() {
	emit('submitFeedback', feedback.value);
	showFeedback.value = false;
	showSuccess.value = true;
}
</script>

<template>
	<BaseWorkflowMessage :message="message" :is-first-of-role="isFirstOfRole" :user="user">
		<div :class="$style.content">
			<p v-if="!showSuccess">{{ message.content }}</p>
			<div v-if="!showFeedback && !showSuccess" :class="$style.buttons">
				<n8n-button
					type="secondary"
					size="small"
					:label="t('assistantChat.builder.thumbsUp')"
					data-test-id="message-thumbs-up-button"
					icon="thumbs-up"
					@click="onRateButton('thumbsUp')"
				/>
				<n8n-button
					type="secondary"
					size="small"
					data-test-id="message-thumbs-down-button"
					:label="t('assistantChat.builder.thumbsDown')"
					icon="thumbs-down"
					@click="onRateButton('thumbsDown')"
				/>
			</div>
			<div v-if="showFeedback" :class="$style.feedbackTextArea">
				<n8n-input
					v-model="feedback"
					:class="$style.feedbackInput"
					type="textarea"
					:placeholder="t('assistantChat.builder.feedbackPlaceholder')"
					data-test-id="message-feedback-input"
					:read-only="false"
					resize="none"
					:rows="5"
				/>
				<div :class="$style.feedbackTextArea__footer">
					<n8n-button
						native-type="submit"
						type="secondary"
						size="small"
						data-test-id="message-submit-feedback-button"
						@click="onSubmitFeedback"
					>
						{{ t('assistantChat.builder.submit') }}
					</n8n-button>
				</div>
			</div>

			<p v-if="showSuccess" :class="$style.success">{{ t('assistantChat.builder.success') }}</p>
		</div>
	</BaseWorkflowMessage>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-2xs);
}
.buttons {
	display: flex;
	gap: var(--spacing-2xs);
}
.feedbackTextArea {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-2xs);

	:global(.el-textarea__inner) {
		resize: none;
		font-family: var(--font-family);
		font-size: var(--font-size-2xs);
	}
}
.feedbackTextArea__footer {
	display: flex;
	justify-content: flex-end;
}
</style>
