<script setup lang="ts">
import { computed } from 'vue';

import {
	findInteractionRenderer,
	type AgentsChatInteractionContext,
	type AgentsChatInteractionRenderer,
} from '../interactionRegistry';
import type { AgentsChatInteraction } from '../types';

const props = defineProps<{
	payload: AgentsChatInteraction;
	renderers: AgentsChatInteractionRenderer[];
	disabled?: boolean;
	context?: AgentsChatInteractionContext;
}>();

const emit = defineEmits<{
	submit: [resumeData: unknown];
}>();

const renderer = computed(() =>
	findInteractionRenderer(props.payload, props.renderers, props.context),
);

const rendererProps = computed(() => {
	if (!renderer.value?.getProps) {
		return {
			payload: props.payload,
			context: props.context,
		};
	}

	return renderer.value.getProps(props.payload, props.context);
});

function onSubmit(resumeData: unknown) {
	emit('submit', resumeData);
}
</script>

<template>
	<component
		:is="renderer.component"
		v-if="renderer"
		v-bind="rendererProps"
		:disabled="disabled"
		@submit="onSubmit"
	/>
</template>
