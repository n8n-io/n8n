<script setup lang="ts">
import { N8nText, N8nTooltip } from '@n8n/design-system';
import { computed } from 'vue';

/**
 * The label of a menu row. It goes in the `item-label` slot of a dropdown or context menu.
 * A row with a tooltip shows it after a short delay.
 */
const props = defineProps<{
	label: string;
	/** The class from the slot. It keeps the menu styles, such as the red destructive row. */
	labelClass?: string;
	disabled?: boolean;
	/** A destructive row takes the color of the row. */
	destructive?: boolean;
	tooltip?: string;
}>();

const color = computed(() =>
	props.disabled ? 'text-xlight' : props.destructive ? undefined : 'text-dark',
);
</script>

<template>
	<N8nTooltip v-if="tooltip" as-child placement="left" :show-after="500" :content="tooltip">
		<N8nText :class="labelClass" size="medium" :color="color">
			{{ label }}
		</N8nText>
	</N8nTooltip>
	<N8nText
		v-else
		:class="labelClass"
		:title="label.length >= 20 ? label : undefined"
		size="medium"
		:color="color"
	>
		{{ label }}
	</N8nText>
</template>
