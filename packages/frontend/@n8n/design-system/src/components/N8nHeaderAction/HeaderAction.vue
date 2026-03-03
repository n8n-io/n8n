<script setup lang="ts">
import { TOOLTIP_DELAY_MS } from '../../constants';
import type { IconName } from '../N8nIcon/icons';
import N8nIconButton from '../N8nIconButton/IconButton.vue';
import N8nTooltip from '../N8nTooltip/Tooltip.vue';

export interface Props {
	/**
	 * The icon to display
	 */
	icon: IconName;
	/**
	 * Accessible label for the button
	 */
	label: string;
	/**
	 * Optional tooltip text (if not provided, no tooltip is shown)
	 */
	tooltip?: string;
	/**
	 * Whether this is a danger action (e.g., delete)
	 */
	danger?: boolean;
	/**
	 * Test ID for the button
	 */
	testId?: string;
}

withDefaults(defineProps<Props>(), {
	tooltip: undefined,
	danger: false,
	testId: undefined,
});

const emit = defineEmits<{
	click: [event: MouseEvent];
}>();
</script>

<template>
	<N8nTooltip :disabled="!tooltip" :show-after="TOOLTIP_DELAY_MS">
		<template #content>{{ tooltip || label }}</template>
		<N8nIconButton
			variant="ghost"
			size="small"
			icon-size="large"
			:icon="icon"
			:aria-label="label"
			:data-test-id="testId"
			:class="danger ? $style.dangerAction : undefined"
			v-bind="$attrs"
			@click.stop="emit('click', $event)"
		/>
	</N8nTooltip>
</template>

<style lang="scss" module>
.dangerAction {
	&:hover {
		--button--color--text--hover: var(--color--danger);
	}
}
</style>
