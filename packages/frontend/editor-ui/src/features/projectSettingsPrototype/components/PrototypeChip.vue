<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';
import { computed } from 'vue';
import { chipHidden, panelOpen, shellLabel, variantLabel } from '../params';

/**
 * The chip in the bottom-right corner: names the shell and the navigation
 * variant on screen and opens the parameters panel, so a reviewer finds the
 * panel without being told about Alt+P. `?ps.chip=0` hides it for usability
 * sessions.
 */
const variant = computed(() => variantLabel());
const shell = computed(() => shellLabel());
</script>

<template>
	<button
		v-if="!chipHidden && !panelOpen"
		type="button"
		:class="$style.chip"
		data-theme="dark"
		aria-haspopup="dialog"
		:aria-expanded="panelOpen"
		data-test-id="proto-chip"
		@click="panelOpen = true"
	>
		<N8nIcon icon="sliders-horizontal" size="small" :class="$style.icon" />
		<span :class="$style.srOnly">Prototype parameters.</span>
		<span>{{ variant }}</span>
		<span :class="$style.shell">{{ shell }}</span>
	</button>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/utils' as utils;

.chip {
	position: fixed;
	inset-block-end: var(--spacing--sm);
	inset-inline-end: var(--spacing--sm);
	z-index: calc(var(--modals--z, 2000) + 40);
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
	height: var(--spacing--xl);
	padding: 0 var(--spacing--xs) 0 var(--spacing--2xs);
	border: none;
	border-radius: var(--radius--full, 999px);
	background-color: var(--background--surface);
	box-shadow: var(--shadow--outline), var(--shadow--md);
	color: var(--text-color);
	cursor: pointer;
	font-family: var(--font-family);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
	line-height: 1;
	white-space: nowrap;
	transition: scale var(--duration--snappy) var(--easing--ease-out);

	&:hover {
		background-color: var(--background--hover);
	}

	&:active {
		scale: 0.97;
	}

	&:focus-visible {
		outline: var(--focus--border-width, 2px) solid var(--focus--border-color, currentColor);
		outline-offset: 2px;
	}
}

.icon,
.shell {
	color: var(--text-color--subtle);
}

.srOnly {
	@include utils.utils-sr-only;
}

@media (prefers-reduced-motion: reduce) {
	.chip {
		transition: none;

		&:active {
			scale: none;
		}
	}
}
</style>
