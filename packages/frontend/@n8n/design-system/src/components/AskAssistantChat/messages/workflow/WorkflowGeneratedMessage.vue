<script setup lang="ts">
import BaseWorkflowMessage from './BaseWorkflowMessage.vue';
import type { ChatUI } from '../../../../types/assistant';
import TextMessage from '../TextMessage.vue';

interface Props {
	message: ChatUI.WorkflowGeneratedMessage & { id: string; read: boolean };
	isFirstOfRole: boolean;
	user?: {
		firstName: string;
		lastName: string;
	};
}

const props = defineProps<Props>();

const emit = defineEmits<{
	insertWorkflow: [string];
}>();

const onInsertWorkflow = () => {
	emit('insertWorkflow', props.message.codeSnippet);
};
</script>

<template>
	<BaseWorkflowMessage :message="message" :is-first-of-role="isFirstOfRole" :user="user">
		<p>Your workflow was created successfully!</p>
		<p>Fix any missing credential before testing it.</p>
	</BaseWorkflowMessage>
</template>

<style lang="scss" module>
.code {
	white-space: pre-wrap;
}
</style>
