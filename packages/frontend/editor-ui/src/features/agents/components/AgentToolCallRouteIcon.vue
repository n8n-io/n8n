<script setup lang="ts">
import { N8nIcon, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import type { ToolCallSimulation } from '../toolCallSimulation.types';
import { getToolCallDisplay } from '../utils/toolCallSimulation';

/**
 * A small icon for how one tool call ran in a test run. The label is its accessible name
 * and its tooltip. A simulator gap gets its own icon and label, so it does not read as an
 * agent failure. Renders nothing for a route this client does not know.
 */
const props = defineProps<{
	simulation: Pick<ToolCallSimulation, 'route' | 'reason'>;
}>();

const i18n = useI18n();

const display = computed(() => getToolCallDisplay(props.simulation));
const label = computed(() => (display.value ? i18n.baseText(display.value.labelKey) : ''));
</script>

<template>
	<N8nTooltip v-if="display" as-child placement="top" :content="label">
		<span
			role="img"
			:aria-label="label"
			:class="[$style.icon, $style[display.variant]]"
			:data-route="simulation.route"
			:data-variant="display.variant"
			data-test-id="agent-tool-call-route-icon"
		>
			<N8nIcon :icon="display.icon" size="small" aria-hidden="true" />
		</span>
	</N8nTooltip>
</template>

<style module>
.icon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	width: var(--height--2xs);
	height: var(--height--2xs);
	border-radius: var(--radius--sm);
	color: var(--text-color--subtler);
}

.simulated {
	color: var(--text-color--subtler);
	background-color: var(--background--subtle);
}

.simulated_made_up {
	color: var(--icon-color--warning);
	background-color: color-mix(in srgb, var(--background--warning) 60%, transparent);
}

.blocked {
	color: var(--icon-color--danger);
	/* Slightly stronger than the other routes: a full tint, not a faded one. */
	background-color: var(--background--danger);
}

/* A gap in the simulator, not an agent failure: neutral, not red. */
.simulator_gap {
	color: var(--text-color--subtle);
	background-color: var(--background--subtle);
}
</style>
