<script lang="ts" setup>
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const emit = defineEmits<{
	select: [prompt: string];
}>();

const i18n = useI18n();

const suggestions = [
	{
		icon: 'zap' as const,
		title: i18n.baseText('instanceAi.emptyState.suggestion.build.title'),
		description: i18n.baseText('instanceAi.emptyState.suggestion.build.description'),
		prompt: 'Build a workflow that sends a Slack message when a form is submitted',
	},
	{
		icon: 'table' as const,
		title: i18n.baseText('instanceAi.emptyState.suggestion.data.title'),
		description: i18n.baseText('instanceAi.emptyState.suggestion.data.description'),
		prompt: 'Create a data table for tracking customer feedback',
	},
	{
		icon: 'bug' as const,
		title: i18n.baseText('instanceAi.emptyState.suggestion.debug.title'),
		description: i18n.baseText('instanceAi.emptyState.suggestion.debug.description'),
		prompt: 'Debug my failing workflow and explain what went wrong',
	},
	{
		icon: 'wrench' as const,
		title: i18n.baseText('instanceAi.emptyState.suggestion.modify.title'),
		description: i18n.baseText('instanceAi.emptyState.suggestion.modify.description'),
		prompt: 'Modify my existing workflow to add error handling',
	},
];
</script>

<template>
	<div :class="$style.container" data-test-id="instance-ai-empty-state">
		<div :class="$style.header">
			<N8nText tag="h2" size="xlarge" bold :class="$style.title">
				{{ i18n.baseText('instanceAi.emptyState.title') }}
			</N8nText>
			<N8nText size="medium" color="text-light" :class="$style.subtitle">
				{{ i18n.baseText('instanceAi.emptyState.subtitle') }}
			</N8nText>
		</div>

		<div :class="$style.grid">
			<button
				v-for="(suggestion, idx) in suggestions"
				:key="idx"
				:class="$style.card"
				data-test-id="instance-ai-suggestion-card"
				@click="emit('select', suggestion.prompt)"
			>
				<N8nIcon :icon="suggestion.icon" size="small" :class="$style.cardIcon" />
				<span :class="$style.cardTitle">{{ suggestion.title }}</span>
				<span :class="$style.cardDescription">{{ suggestion.description }}</span>
			</button>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	height: 100%;
	min-height: 300px;
	padding: var(--spacing--xl);
	animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
	from {
		opacity: 0;
		transform: translateY(8px);
	}

	to {
		opacity: 1;
		transform: translateY(0);
	}
}

.header {
	text-align: center;
	margin-bottom: var(--spacing--xl);
}

.title {
	margin-bottom: var(--spacing--3xs);
}

.subtitle {
	max-width: 360px;
}

.grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: var(--spacing--xs);
	max-width: 480px;
	width: 100%;
}

.card {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--4xs);
	padding: var(--spacing--sm);
	background: var(--color--background);
	border: var(--border);
	border-radius: var(--radius--lg);
	cursor: pointer;
	text-align: left;
	font-family: var(--font-family);
	transition:
		border-color 0.15s ease,
		background-color 0.15s ease;

	&:hover {
		border-color: var(--color--primary);
		background: color-mix(in srgb, var(--color--primary) 10%, var(--color--background));
	}
}

.cardIcon {
	color: var(--color--primary);
}

.cardTitle {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	line-height: var(--line-height--md);
}

.cardDescription {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	line-height: var(--line-height--lg);
}
</style>
