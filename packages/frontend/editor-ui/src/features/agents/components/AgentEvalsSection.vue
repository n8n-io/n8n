<script setup lang="ts">
/**
 * Container for the agent's eval surface. Today it only renders the first-run
 * state; the case list and review views mount here as they land, which is why
 * the empty state is a branch rather than the whole component.
 */
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

defineProps<{
	disabled?: boolean;
	generating?: boolean;
}>();

const emit = defineEmits<{
	generate: [];
}>();

const i18n = useI18n();
</script>

<template>
	<div :class="$style.section" data-testid="agent-evals-section">
		<div :class="$style.emptyState" data-testid="agent-evals-empty-state">
			<div :class="$style.iconBadge">
				<N8nIcon icon="sparkles" size="xlarge" />
			</div>
			<N8nText tag="h3" size="large" color="text-dark" bold :class="$style.title">
				{{ i18n.baseText('agents.builder.agentEvals.empty.title') }}
			</N8nText>
			<N8nText size="medium" color="text-base" :class="$style.description">
				{{ i18n.baseText('agents.builder.agentEvals.empty.description') }}
			</N8nText>
			<N8nButton
				variant="solid"
				size="large"
				type="button"
				icon="sparkles"
				:disabled="disabled"
				:loading="generating"
				data-testid="agent-evals-generate-button"
				@click="emit('generate')"
			>
				{{ i18n.baseText('agents.builder.agentEvals.empty.generate') }}
			</N8nButton>
		</div>
	</div>
</template>

<style lang="scss" module>
.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	width: 100%;
}

/* Vertical rhythm is a single uniform gap, matching the design — no per-child
   margins, so adding the case list later can't inherit odd spacing. */
.emptyState {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--xs);
	width: 100%;
	box-sizing: border-box;
	padding: var(--spacing--2xl) var(--spacing--lg);
	border: var(--border-width) dashed var(--border-color);
	border-radius: var(--radius);
	text-align: center;
}

.iconBadge {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--xs);
	color: var(--color--text);
	background-color: var(--background--active);
	border-radius: var(--radius);
}

.title {
	margin: 0;
}

/* Caps the measure at the design's 400px so the copy wraps to three lines
   instead of stretching the full panel width. */
.description {
	display: block;
	max-width: 25rem;
}
</style>
