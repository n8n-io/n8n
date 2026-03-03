<script setup lang="ts">
import { useCssModule } from 'vue';

defineOptions({
	name: 'N8nCanvasPill',
});

const $style = useCssModule();
</script>

<template>
	<div :class="$style.pill">
		<slot name="icon" />
		<span :class="$style.text">
			<slot />
		</span>
	</div>
</template>

<style lang="scss" module>
.pill {
	display: flex;
	height: 40px;
	padding: 0 var(--spacing--sm) 0 var(--spacing--xs);
	justify-content: center;
	align-items: center;
	gap: var(--spacing--2xs);
	border-radius: 22px;
	border: var(--border-width) solid var(--color--neutral-850);
	background: rgba(65, 66, 68, 0.92);
	cursor: default;

	// Disable text selection
	-moz-user-select: none;
	-webkit-user-select: none;
	user-select: none;
}

.text {
	color: white;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	white-space: nowrap;
}
</style>
