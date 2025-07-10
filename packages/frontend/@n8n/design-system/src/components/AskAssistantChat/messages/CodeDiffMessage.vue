<script setup lang="ts">
import BaseMessage from './BaseMessage.vue';
import type { ChatUI } from '../../../types/assistant';
import CodeDiff from '../../CodeDiff/CodeDiff.vue';

interface Props {
	message: {
		role: 'assistant';
		type: 'code-diff';
		description?: string;
		codeDiff?: string;
		replacing?: boolean;
		replaced?: boolean;
		error?: boolean;
		suggestionId: string;
		id: string;
		read: boolean;
		quickReplies?: ChatUI.QuickReply[];
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
	codeReplace: [];
	codeUndo: [];
}>();
</script>

<template>
	<BaseMessage :message="message" :is-first-of-role="isFirstOfRole" :user="user">
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
