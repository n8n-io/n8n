<script setup lang="ts">
import {
	N8nStatusDot,
	N8nText,
	N8nTooltip,
	N8nBadge,
	type StatusDotVariant,
} from '@n8n/design-system';

/**
 * "Published" chip shown on list cards. Attributes such as `data-test-id`
 * and `data-state` land on the chip element itself, also inside the tooltip.
 */
defineOptions({ inheritAttrs: false });

withDefaults(
	defineProps<{
		label: string;
		variant?: StatusDotVariant;
		/** Explanation for non-standard states; makes the chip a focusable tooltip trigger. */
		tooltip?: string | null;
	}>(),
	{ variant: 'success', tooltip: null },
);
</script>

<template>
	<!-- The tooltip is only mounted for the rare partial/failed states; the
		common published case keeps the plain markup. -->
	<N8nTooltip v-if="tooltip" placement="top" as-child>
		<template #content>{{ tooltip }}</template>
		<!-- tabindex makes the explanation keyboard-reachable: the tooltip opens on focus. -->
		<N8nBadge v-bind="$attrs" :class="$style.indicator" tabindex="0">
			<template #leading>
				<N8nStatusDot :variant="variant" />
			</template>
			{{ label }}
		</N8nBadge>
	</N8nTooltip>
	<N8nBadge v-else v-bind="$attrs" :class="$style.indicator">
		<template #leading>
			<N8nStatusDot :variant="variant" />
		</template>
		{{ label }}
	</N8nBadge>
</template>

<style lang="scss" module>
.indicator {
	gap: var(--spacing--3xs);

	* {
		// This is needed to line height up with ownership badge
		line-height: calc(var(--font-size--sm) + var(--border-width));
	}
}
</style>
