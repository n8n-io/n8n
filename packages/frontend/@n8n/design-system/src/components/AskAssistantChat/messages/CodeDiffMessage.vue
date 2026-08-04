<script setup lang="ts">
import BaseMessage from './BaseMessage.vue';
import type { ChatUI, RatingFeedback } from '../../../types/assistant';
import CodeDiff from '../../CodeDiff/CodeDiff.vue';

interface Props {
	message: ChatUI.CodeDiffMessage & { id: string; read: boolean };
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
	codeReplace: [];
	codeUndo: [];
	feedback: [RatingFeedback];
}>();
</script>

<template>
	<BaseMessage
		:message="message"
		:is-first-of-role="isFirstOfRole"
		:user="user"
		@feedback="(feedback: RatingFeedback) => emit('feedback', feedback)"
	>
		<CodeDiff
			:title="message.description"
			:content="message.codeDiff"
			:replacing="message.replacing"
			:replaced="message.replaced"
			:error="message.error"
			:streaming="streaming && isLastMessage"
			@replace="emit('codeReplace')"
			@undo="emit('codeUndo')"
		/>
	</BaseMessage>
</template>
