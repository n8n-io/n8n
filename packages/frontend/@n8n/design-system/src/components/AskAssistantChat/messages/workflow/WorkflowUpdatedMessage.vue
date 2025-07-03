<script setup lang="ts">
import BaseWorkflowMessage from './BaseWorkflowMessage.vue';
import type { ChatUI } from '../../../../types/assistant';

interface Props {
	message: (ChatUI.WorkflowGeneratedMessage | ChatUI.WorkflowUpdatedMessage) & {
		id: string;
		read: boolean;
	};
	isFirstOfRole: boolean;
	user?: {
		firstName: string;
		lastName: string;
	};
}

defineProps<Props>();
</script>

<template>
	<BaseWorkflowMessage :message="message" :is-first-of-role="isFirstOfRole" :user="user">
		Workflow Updated
	</BaseWorkflowMessage>
</template>

<style lang="scss" module>
.code {
	white-space: pre-wrap;
}
</style>
