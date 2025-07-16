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
import ComposedNodesMessage from './workflow/ComposedNodesMessage.vue';
import WorkflowGeneratedMessage from './workflow/WorkflowGeneratedMessage.vue';
import WorkflowNodesMessage from './workflow/WorkflowNodesMessage.vue';
import WorkflowStepsMessage from './workflow/WorkflowStepsMessage.vue';
import type { ChatUI } from '../../../types/assistant';

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
	rate: [rating: 'up' | 'down', feedback?: string];
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
		case 'workflow-step':
			return WorkflowStepsMessage;
		case 'workflow-node':
			return WorkflowNodesMessage;
		case 'workflow-composed':
			return ComposedNodesMessage;
		case 'workflow-generated':
			return WorkflowGeneratedMessage;
		case 'agent-suggestion':
		case 'workflow-updated':
		case 'rate-workflow':
			return null;
		default:
			return null;
	}
});

// For rate-workflow messages, transform them to text messages with rating enabled
const processedMessage = computed(() => {
	if (props.message.type === 'rate-workflow') {
		return {
			...props.message,
			type: 'text' as const,
			showRating: true,
			ratingStyle: 'regular' as const,
			showFeedback: true,
		};
	}
	return props.message;
});
</script>

<template>
	<component
		:is="messageComponent"
		v-if="messageComponent"
		:message="processedMessage"
		:is-first-of-role="isFirstOfRole"
		:user="user"
		:streaming="streaming"
		:is-last-message="isLastMessage"
		@code-replace="emit('codeReplace')"
		@code-undo="emit('codeUndo')"
		@rate="(rating: 'up' | 'down', feedback?: string) => emit('rate', rating, feedback)"
	/>
</template>
