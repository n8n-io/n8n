<script setup lang="ts">
import { ref } from 'vue';

import { useI18n } from '@n8n/design-system/composables/useI18n';
import type { RatingFeedback } from '@n8n/design-system/types';

import N8nButton from '../../N8nButton';
import N8nIconButton from '../../N8nIconButton';
import N8nInput from '../../N8nInput';

interface Props {
	style?: 'regular' | 'minimal';
	showFeedback?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	style: 'regular',
	showFeedback: true,
});

const emit = defineEmits<{
	feedback: [RatingFeedback];
}>();

const { t } = useI18n();
const showRatingButtons = ref(true);
const showFeedbackArea = ref(false);
const showSuccess = ref(false);
const selectedRating = ref<'up' | 'down' | null>(null);
const feedback = ref('');

function onRateButton(rating: 'up' | 'down') {
	selectedRating.value = rating;
	showRatingButtons.value = false;

	emit('feedback', { rating });
	if (props.showFeedback) {
		showFeedbackArea.value = true;
	} else {
		showSuccess.value = true;
	}
}

function onSubmitFeedback() {
	if (selectedRating.value) {
		emit('feedback', { feedback: feedback.value });
		showFeedbackArea.value = false;
		showSuccess.value = true;
	}
}

function onCancelFeedback() {
	showFeedbackArea.value = false;
	showRatingButtons.value = true;
	selectedRating.value = null;
	feedback.value = '';
}
</script>

<template>
	<div :class="[$style.rating, $style[style]]">
		<div v-if="showRatingButtons" :class="$style.buttons">
			<template v-if="style === 'regular'">
				<N8nButton
					type="secondary"
					size="small"
					:label="t('assistantChat.builder.thumbsUp')"
					data-test-id="message-thumbs-up-button"
					icon="thumbs-up"
					@click="onRateButton('up')"
				/>
				<N8nButton
					type="secondary"
					size="small"
					data-test-id="message-thumbs-down-button"
					:label="t('assistantChat.builder.thumbsDown')"
					icon="thumbs-down"
					@click="onRateButton('down')"
				/>
			</template>
			<template v-else>
				<N8nIconButton
					type="tertiary"
					size="small"
					text
					icon="thumbs-up"
					data-test-id="message-thumbs-up-button"
					@click="onRateButton('up')"
				/>
				<N8nIconButton
					type="tertiary"
					size="small"
					text
					icon="thumbs-down"
					data-test-id="message-thumbs-down-button"
					@click="onRateButton('down')"
				/>
			</template>
		</div>

		<div v-if="showFeedbackArea" :class="$style.feedbackContainer">
			<N8nInput
				v-model="feedback"
				:class="$style.feedbackInput"
				type="textarea"
				:placeholder="t('assistantChat.builder.feedbackPlaceholder')"
				data-test-id="message-feedback-input"
				:read-only="false"
				resize="none"
				:rows="style === 'minimal' ? 3 : 5"
			/>
			<div :class="$style.feedbackActions">
				<N8nButton
					type="secondary"
					size="small"
					:label="t('generic.cancel')"
					@click="onCancelFeedback"
				/>
				<N8nButton
					type="primary"
					size="small"
					data-test-id="message-submit-feedback-button"
					:label="t('assistantChat.builder.submit')"
					@click="onSubmitFeedback"
				/>
			</div>
		</div>

		<p v-if="showSuccess" :class="$style.success">
			{{ t('assistantChat.builder.success') }}
		</p>
	</div>
</template>

<style lang="scss" module>
.rating {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-2xs);
	margin-top: var(--spacing-2xs);
}

.buttons {
	display: flex;
	gap: var(--spacing-2xs);
}

.feedbackContainer {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-2xs);
}

.feedbackInput {
	:global(.el-textarea__inner) {
		resize: none;
		font-family: var(--font-family);
		font-size: var(--font-size-2xs);
	}
}

.feedbackActions {
	display: flex;
	gap: var(--spacing-2xs);
	justify-content: flex-end;
}

.success {
	color: var(--color-success);
	font-size: var(--font-size-2xs);
	margin: 0;
}

/* Minimal style specific */
.minimal {
	margin-top: 0;
	.buttons {
		gap: var(--spacing-3xs);
	}

	.feedbackContainer {
		gap: var(--spacing-3xs);
	}

	.feedbackInput {
		:global(.el-textarea__inner) {
			font-size: var(--font-size-3xs);
		}
	}
}
</style>
