<script setup lang="ts">
import type { WorkflowSuggestion } from '../../types/assistant';

interface Props {
	suggestions?: WorkflowSuggestion[];
	disabled?: boolean;
	streaming?: boolean;
}

const emit = defineEmits<{
	suggestionClick: [suggestion: WorkflowSuggestion];
}>();

const props = withDefaults(defineProps<Props>(), {
	suggestions: () => [],
	disabled: false,
	streaming: false,
});

function onSuggestionClick(suggestion: WorkflowSuggestion) {
	if (props.disabled || props.streaming) return;
	emit('suggestionClick', suggestion);
}
</script>

<template>
	<article :class="$style.container" data-test-id="workflow-suggestions">
		<!-- Prompt input slot -->
		<section :class="$style.promptContainer">
			<slot name="prompt-input" />
		</section>

		<!-- Suggestion pills section -->
		<section
			v-if="suggestions.length > 0 && !streaming"
			:class="$style.pillsContainer"
			role="group"
			aria-label="Workflow suggestions"
		>
			<button
				v-for="suggestion in suggestions"
				:key="suggestion.id"
				:class="$style.suggestionPill"
				:disabled="streaming || disabled"
				type="button"
				@click="onSuggestionClick(suggestion)"
			>
				{{ suggestion.summary }}
			</button>
		</section>

		<!-- Footer slot for optional content like "or" divider -->
		<slot name="footer" />
	</article>
</template>

<style lang="scss" module>
/* Layout */
.container {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--md);
	max-width: 710px;
	width: 100%;
}

/* Prompt Input Section */
.promptContainer {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	align-self: stretch;
}

/* Suggestion Pills Section */
.pillsContainer {
	display: flex;
	justify-content: center;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	flex-wrap: wrap;
}

.suggestionPill {
	display: flex;
	padding: var(--spacing--4xs) var(--spacing--2xs);
	justify-content: center;
	align-items: center;
	gap: var(--spacing--2xs);
	border-radius: 56px;
	border: var(--border);
	background: var(--color--background--light-3);
	cursor: pointer;
	transition: all 0.2s ease;
	font-size: var(--font-size--2xs);
	color: var(--color--text--shade-1);
	font-weight: var(--font-weight--regular);

	&:hover:not(:disabled) {
		color: var(--color--primary);
		border-color: var(--color--primary);
		background: var(--color--background--light-3);
	}

	&:disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}
}
</style>
