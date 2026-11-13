<script setup lang="ts">
import { N8nIcon, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import type { ToolCallRoute } from '../toolCallSimulation.types';
import { getToolCallRouteDisplay } from '../utils/toolCallSimulation';

/**
 * A small icon for how one tool call ran in a test run. The route label is its
 * accessible name and its tooltip. Renders nothing for a route this client does not know.
 */
const props = defineProps<{
	route: ToolCallRoute;
}>();

const i18n = useI18n();

const display = computed(() => getToolCallRouteDisplay(props.route));
const label = computed(() => (display.value ? i18n.baseText(display.value.labelKey) : ''));
</script>

<template>
	<N8nTooltip v-if="display" as-child placement="top" :content="label">
		<span
			role="img"
			:aria-label="label"
			:class="[$style.icon, $style[route]]"
			:data-route="route"
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

.real_read {
	color: var(--icon-color--info);
	background-color: color-mix(in srgb, var(--background--info) 60%, transparent);
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
</style>
