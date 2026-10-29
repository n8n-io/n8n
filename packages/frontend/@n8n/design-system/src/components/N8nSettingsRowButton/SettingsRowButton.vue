<script setup lang="ts">
import N8nIcon from '../N8nIcon';

export interface SettingsRowButtonProps {
	/** Prevents interaction with the button. */
	disabled?: boolean;
	/** Rotates the trailing chevron to show an expanded menu or region. */
	expanded?: boolean;
}

defineOptions({ name: 'N8nSettingsRowButton' });

withDefaults(defineProps<SettingsRowButtonProps>(), {
	disabled: false,
	expanded: false,
});

defineSlots<{
	/** Content shown inside the button. */
	default: () => unknown;
}>();
</script>

<template>
	<button type="button" :class="$style.button" :disabled="disabled" :aria-expanded="expanded">
		<slot />
		<N8nIcon :class="[$style.chevron, { [$style.expanded]: expanded }]" icon="chevron-down" />
	</button>
</template>

<style lang="scss" module>
@use '../../css/mixins/motion';

.button {
	display: flex;
	flex: 0 0 auto;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--5xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border: none;
	border-radius: var(--radius);
	background: transparent;
	color: var(--text-color--subtle);
	cursor: pointer;
}

.button:hover:not(:disabled) {
	background: var(--background--hover);
}

.button:focus-visible {
	outline: var(--focus--border-width, 2px) solid var(--focus--border-color);
	outline-offset: calc(-1 * var(--focus--border-width, 2px));
}

.button:disabled {
	cursor: not-allowed;
}

.chevron {
	transition: transform motion.$blur-motion-duration motion.$blur-motion-easing;
}

.expanded {
	transform: rotate(180deg);
}

@media (prefers-reduced-motion: reduce) {
	.chevron {
		transition: none;
	}
}
</style>
