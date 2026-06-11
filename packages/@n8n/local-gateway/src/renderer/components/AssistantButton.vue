<script setup lang="ts">
/**
 * The assistant-chrome button (the design-system N8nButton is themed for the
 * editor, not the `--da-*` palette). `danger` marks destructive actions red.
 * Click handlers and `disabled` fall through to the native button.
 */
withDefaults(defineProps<{ variant?: 'solid' | 'subtle'; danger?: boolean }>(), {
	variant: 'subtle',
	danger: false,
});
</script>

<template>
	<button
		type="button"
		:class="[
			$style.btn,
			variant === 'solid' ? $style.solid : $style.subtle,
			{ [$style.danger]: danger },
		]"
	>
		<slot />
	</button>
</template>

<style module>
.btn {
	padding: 9px 14px;
	font: inherit;
	font-size: 13px;
	font-weight: 600;
	white-space: nowrap;
	cursor: pointer;
	border-radius: var(--da-radius-sm);
}

.btn:disabled {
	cursor: default;
	opacity: 0.6;
}

.btn:focus-visible {
	outline: var(--da-focus-ring);
	outline-offset: var(--da-focus-ring-offset);
}

.solid {
	color: #fff;
	background: var(--da-accent);
	border: none;
}

.solid:hover:not(:disabled) {
	background: var(--da-accent-press);
}

.solid:active:not(:disabled) {
	transform: scale(0.98);
}

.solid.danger {
	background: var(--da-red);
}

.solid.danger:hover:not(:disabled) {
	background: var(--da-red);
	filter: brightness(0.9);
}

.subtle {
	color: var(--da-text);
	background: var(--da-surface-2);
	border: 1px solid var(--da-border);
}

.subtle:hover:not(:disabled) {
	background: var(--da-surface);
	border-color: var(--da-border-strong);
}

.subtle.danger {
	color: var(--da-red);
}
</style>
