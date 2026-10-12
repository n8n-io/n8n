<script setup lang="ts">
import { useId } from 'vue';
import { N8nButton, N8nSpinner, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import CanvasBackgroundStripedPattern from '@/features/workflows/canvas/components/elements/background/CanvasBackgroundStripedPattern.vue';
import type { AgentEditingContext } from '../composables/useAgentEditing';

defineProps<{ editing: AgentEditingContext }>();

const i18n = useI18n();
const patternId = useId();
</script>

<template>
	<div :class="$style.overlay" data-testid="agent-editing-overlay">
		<svg :class="$style.stripes" width="100%" height="100%" aria-hidden="true">
			<defs>
				<CanvasBackgroundStripedPattern :id="patternId" :x="0" :y="0" :zoom="1" />
			</defs>
			<rect width="100%" height="100%" :fill="`url(#${patternId})`" />
		</svg>
		<div :class="$style.status">
			<div :class="$style.label" role="status" aria-live="polite">
				<N8nSpinner size="small" aria-hidden="true" />
				<N8nText size="small">
					{{ i18n.baseText('instanceAi.agentPreview.building') }}
				</N8nText>
			</div>
			<N8nButton
				:class="[$style.takeOver, editing.takingOver && $style.takingOver]"
				:disabled="editing.takingOver"
				:loading="editing.takingOver"
				variant="outline"
				size="small"
				data-testid="agent-editing-take-over"
				@click="editing.takeOver"
			>
				{{ i18n.baseText('agents.builder.editing.takeOver') }}
			</N8nButton>
		</div>
	</div>
</template>

<style module lang="scss">
.overlay {
	position: absolute;
	inset: 0;
	z-index: 2;
	cursor: not-allowed;
	user-select: none;
	background: color-mix(in srgb, var(--background--surface) 60%, transparent);
}

.stripes {
	position: absolute;
	inset: 0;
	pointer-events: none;
}

.status {
	position: relative;
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--xs);
	width: fit-content;
	max-width: calc(100% - var(--spacing--lg) * 2);
	margin: var(--spacing--lg) auto;
	padding: var(--spacing--xs) var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--background--surface);
	box-shadow: var(--shadow--md);
}

.label {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.takeOver {
	opacity: 0;
}

.overlay:hover .takeOver,
.overlay:focus-within .takeOver,
.takingOver {
	opacity: 1;
}

@media (hover: none) {
	.takeOver {
		opacity: 1;
	}
}
</style>
