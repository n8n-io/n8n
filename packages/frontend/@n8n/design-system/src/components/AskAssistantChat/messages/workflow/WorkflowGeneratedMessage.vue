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
		<template #title>🎉 Generated Workflow</template>
		<div v-if="message.codeSnippet" :class="$style.codeSnippet">
			<TextMessage
				:message="{ ...message, content: '', type: 'text' }"
				:is-first-of-role="false"
				:user="user"
			/>
			<n8n-button type="tertiary" size="mini" @click="onInsertWorkflow">
				Insert into workflow
			</n8n-button>
		</div>
	</BaseWorkflowMessage>
</template>

<style lang="scss" module>
.code {
	white-space: pre-wrap;
}
</style>
