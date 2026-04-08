<script lang="ts" setup>
/**
 * Pill label for AI Gateway / free-credits affordances (light green fill, dark green text).
 * Same structural pattern as BetaTag / PreviewTag — small presentational component in the design system.
 */
defineOptions({ name: 'N8nAiGatewayCreditsTag' });

withDefaults(
	defineProps<{
		/** When set and default slot is empty, renders this string. */
		text?: string;
		/** Pointer + hover styling (e.g. credential “Top up” control). */
		clickable?: boolean;
		/** Match hover appearance without relying on :hover (e.g. alternate label visible). */
		pressed?: boolean;
	}>(),
	{
		text: undefined,
		clickable: false,
		pressed: false,
	},
);

defineEmits<{
	click: [event: MouseEvent];
}>();
</script>

<template>
	<span
		:class="[$style.root, clickable && $style.clickable, pressed && $style.pressed]"
		@click="$emit('click', $event)"
	>
		<slot>{{ text }}</slot>
	</span>
</template>

<style lang="scss" module>
/* Padding + radius match `BetaTag` / `PreviewTag` (small) for consistent chip scale */
.root {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	padding: var(--spacing--5xs) var(--spacing--4xs);
	border: none;
	border-radius: 16px;
	background-color: var(--color--green-100);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--medium);
	color: var(--color--green-900);
	white-space: nowrap;
	box-shadow: none;
}

.clickable {
	cursor: pointer;
	user-select: none;
	transition:
		background-color 0.15s ease,
		color 0.15s ease;

	&:hover {
		background-color: var(--color--green-200);
		color: var(--color--green-950);
	}
}

.pressed {
	background-color: var(--color--green-200);
	color: var(--color--green-950);
}
</style>
