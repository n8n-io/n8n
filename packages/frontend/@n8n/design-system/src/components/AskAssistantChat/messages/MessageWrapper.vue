<!-- eslint-disable @typescript-eslint/naming-convention -->
<!-- eslint-disable @typescript-eslint/no-unsafe-return Needed to fix types issue with imported components to satisfy Component type -->
<script setup lang="ts">
import { computed, type Component } from 'vue';

import { getSupportedMessageComponent } from './helpers';
import type { ChatUI, RatingFeedback } from '../../../types/assistant';

export interface Props {
	message: ChatUI.AssistantMessage;
	isFirstOfRole: boolean;
	user?: {
		firstName: string;
		lastName: string;
	};
	streaming?: boolean;
	isLastMessage?: boolean;
	color?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
	codeReplace: [];
	codeUndo: [];
	feedback: [RatingFeedback];
}>();

const messageComponent = computed<Component | null>(() => {
	return getSupportedMessageComponent(props.message.type);
});
</script>

<template>
	<div>
		<component
			:is="messageComponent"
			v-if="messageComponent"
			:message="message"
			:is-first-of-role="isFirstOfRole"
			:user="user"
			:streaming="streaming"
			:is-last-message="isLastMessage"
			:color="color"
			@code-replace="emit('codeReplace')"
			@code-undo="emit('codeUndo')"
			@feedback="(feedback: RatingFeedback) => emit('feedback', feedback)"
		/>
		<slot
			v-else-if="message.type === 'custom'"
			name="custom-message"
			:message="message"
			:is-first-of-role="isFirstOfRole"
			:user="user"
			:streaming="streaming"
			:is-last-message="isLastMessage"
		/>
	</div>
</template>
