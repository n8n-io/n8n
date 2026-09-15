<script setup lang="ts">
import { computed } from 'vue';

import {
	findInteractionRenderer,
	type AgentsChatInteractionRenderer,
} from '../interactionRegistry';
import type { AgentsChatInteraction } from '../types';

const props = defineProps<{
	payload: AgentsChatInteraction;
	renderers: AgentsChatInteractionRenderer[];
	disabled?: boolean;
}>();

const emit = defineEmits<{
	submit: [resumeData: unknown];
}>();

const renderer = computed(() => findInteractionRenderer(props.payload, props.renderers));

const rendererProps = computed(() => {
	if (!renderer.value?.getProps) {
		return {
			payload: props.payload,
		};
	}

	return renderer.value.getProps(props.payload);
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
