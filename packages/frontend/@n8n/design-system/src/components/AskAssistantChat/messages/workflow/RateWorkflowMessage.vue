<script setup lang="ts">
import { ref } from 'vue';
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
	if (rating === 'thumbsUp') {
		emit('thumbsUp');
		showSuccess.value = true;
	} else {
		emit('thumbsDown');
		showFeedback.value = true;
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
		<template #title>{{ message.content }}</template>
		<div v-if="!showFeedback && !showSuccess" :class="$style.buttons">
			<n8n-icon-button type="tertiary" icon="thumbs-up" @click="onRateButton('thumbsUp')" />
			<n8n-icon-button type="tertiary" icon="thumbs-down" @click="onRateButton('thumbsDown')" />
		</div>
		<div v-if="showFeedback" :class="$style.feedback">
			<n8n-input
				v-model="feedback"
				:class="$style.feedbackInput"
				type="textarea"
				placeholder="Build me a workflow to do X"
				:read-only="false"
				:resize="'none'"
				:rows="5"
			/>
			<n8n-button native-type="submit" @click="onSubmitFeedback">Submit feedback</n8n-button>
		</div>

		<div v-if="showSuccess" :class="$style.success">Thank you for your feedback!</div>
	</BaseWorkflowMessage>
</template>

<style lang="scss" module>
.buttons {
	display: flex;
	gap: var(--spacing-2xs);
}
</style>
