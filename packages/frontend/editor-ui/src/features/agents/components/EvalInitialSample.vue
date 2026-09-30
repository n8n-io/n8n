<script setup lang="ts">
import ChatBubble from './ChatBubble.vue';
import AgentAnswerCard from './AgentAnswerCard.vue';

defineProps<{
	previewInput: string;
	previewOutput: string;
}>();
</script>

<template>
	<div :class="$style.evalPreview">
		<div :class="$style.evalPreviewUserMessage">
			<ChatBubble :text="previewInput" />
		</div>

		<AgentAnswerCard
			data-test-id="instance-ai-test-agent-preview-output"
			:source="previewOutput ?? ''"
		/>
	</div>
</template>

<style module lang="scss">
.evalPreview {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
	background-color: var(--run-data--color--background);
	background-image: repeating-linear-gradient(
		135deg,
		oklch(0% 0 0 / 0.025) 0 5px,
		transparent 5px 10px
	);

	&UserMessage {
		width: 300px;
		align-self: flex-end;
	}
}
</style>
