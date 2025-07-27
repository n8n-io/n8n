<!-- eslint-disable @typescript-eslint/naming-convention -->
<!-- eslint-disable @typescript-eslint/no-unsafe-return Needed to fix types issue with imported components to satisfy Component type -->
<script setup lang="ts">
import { computed, type Component } from 'vue';

import BlockMessage from './BlockMessage.vue';
import CodeDiffMessage from './CodeDiffMessage.vue';
import ErrorMessage from './ErrorMessage.vue';
import EventMessage from './EventMessage.vue';
import TextMessage from './TextMessage.vue';
import ToolMessage from './ToolMessage.vue';
import type { ChatUI, RatingFeedback } from '../../../types/assistant';

interface Props {
	message: ChatUI.AssistantMessage;
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
	feedback: [RatingFeedback];
}>();

const messageComponent = computed<Component | null>(() => {
	switch (props.message.type) {
		case 'text':
			return TextMessage;
		case 'block':
			return BlockMessage;
		case 'code-diff':
			return CodeDiffMessage;
		case 'error':
			return ErrorMessage;
		case 'event':
			return EventMessage;
		case 'tool':
			return ToolMessage;
		case 'agent-suggestion':
		case 'workflow-updated':
			return null;
		default:
			return null;
	}
});
</script>

<template>
	<component
		:is="messageComponent"
		v-if="messageComponent"
		:message="message"
		:is-first-of-role="isFirstOfRole"
		:user="user"
		:streaming="streaming"
		:is-last-message="isLastMessage"
		@code-replace="emit('codeReplace')"
		@code-undo="emit('codeUndo')"
		@feedback="(feedback: RatingFeedback) => emit('feedback', feedback)"
	/>
</template>
