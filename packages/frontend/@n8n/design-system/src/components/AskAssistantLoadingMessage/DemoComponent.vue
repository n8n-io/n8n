<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

import AssistantLoadingMessage from './AssistantLoadingMessage.vue';
import Notice from '../N8nNotice/Notice.vue';

/**
 * This is a demo component to show how the transitions work in the AssistantLoadingMessage component.
 * It should be only used in the storybook.
 */

withDefaults(
	defineProps<{
		animationType?: 'slide-vertical' | 'slide-horizontal' | 'fade';
	}>(),
	{
		animationType: 'slide-vertical',
	},
);

const messages = [
	'Analyzing the error...',
	'Searching the n8n documentation...',
	'Checking the n8n community for answers..',
];
const currentIndex = ref(0);

const currentMessage = computed(() => {
	return messages[currentIndex.value];
});

const startMessageRotation = () => {
	setInterval(() => {
		currentIndex.value = (currentIndex.value + 1) % messages.length;
	}, 2000);
};

onMounted(() => {
	startMessageRotation();
});
</script>

<template>
	<div>
		<Notice type="warning" content="This component is for demo purposes only" />
		<div :class="$style['loading-message']">
			<AssistantLoadingMessage :message="currentMessage" :animation-type="animationType" />
		</div>
	</div>
</template>

<style module lang="scss">
.loading-message {
	padding: var(--spacing--3xs);
}
</style>
