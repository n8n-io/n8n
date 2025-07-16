<script setup lang="ts">
import BaseMessage from './BaseMessage.vue';
import { useMessageRating } from './useMessageRating';
import type { ChatUI } from '../../../types/assistant';
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

const props = defineProps<Props>();

const emit = defineEmits<{
	codeReplace: [];
	codeUndo: [];
	rate: [rating: 'up' | 'down', feedback?: string];
}>();

const { ratingProps } = useMessageRating(props.message);
</script>

<template>
	<BaseMessage
		:message="message"
		:is-first-of-role="isFirstOfRole"
		:user="user"
		v-bind="ratingProps"
		@rate="(rating, feedback) => emit('rate', rating, feedback)"
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
