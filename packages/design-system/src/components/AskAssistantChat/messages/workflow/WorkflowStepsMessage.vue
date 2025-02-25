<script setup lang="ts">
import BaseWorkflowMessage from './BaseWorkflowMessage.vue';
import type { ChatUI } from '../../../../types/assistant';

interface Props {
	message: ChatUI.GeneratedStepsMessage & { id: string; read: boolean };
	isFirstOfRole: boolean;
	user?: {
		firstName: string;
		lastName: string;
	};
}

defineProps<Props>();
</script>

<template>
	<BaseWorkflowMessage :message="message" :is-first-of-role="isFirstOfRole" :user="user">
		<template #icon>
			<n8n-icon icon="list" size="medium" />
		</template>
		<template #title> Generated Workflow Steps </template>
		<ol :class="$style.stepsList">
			<li v-for="step in message.steps" :key="step">{{ step }}</li>
		</ol>
	</BaseWorkflowMessage>
</template>

<style lang="scss" module>
.stepsList {
	list-style-position: inside;
	margin: 0;
	padding: 0;

	li {
		margin-bottom: var(--spacing-4xs);
		line-height: var(--font-line-height-loose);
	}
}
</style>
