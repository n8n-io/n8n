<script setup lang="ts">
import { useId } from 'vue';

const strokeMaskId = useId();
</script>

<template>
	<svg viewBox="0 0 320 96" fill="none" aria-hidden="true" focusable="false">
		<rect x="224" width="96" height="96" rx="16" :class="$style.node" />
		<rect x="224.5" y="0.5" width="95" height="95" rx="15.5" stroke="currentColor" />
		<circle cx="224" cy="48" r="7.5" :class="$style.node" />
		<circle cx="224" cy="48" r="7" stroke="currentColor" />
		<path
			d="M40 0H80C88.84 0 96 7.16 96 16V80C96 88.84 88.84 96 80 96H40C17.91 96 0 78.09 0 56V40C0 17.91 17.91 0 40 0Z"
			:class="$style.node"
		/>
		<mask :id="strokeMaskId" fill="white">
			<path
				d="M40 0H80C88.84 0 96 7.16 96 16V80C96 88.84 88.84 96 80 96H40C17.91 96 0 78.09 0 56V40C0 17.91 17.91 0 40 0Z"
			/>
		</mask>
		<path
			d="M40 0H80C88.84 0 96 7.16 96 16V80C96 88.84 88.84 96 80 96H40C17.91 96 0 78.09 0 56V40C0 17.91 17.91 0 40 0Z"
			stroke-width="2"
			stroke="currentColor"
			:mask="`url(#${strokeMaskId})`"
		/>
		<circle cx="96" cy="48" r="7.5" :class="$style.node" />
		<circle cx="96" cy="48" r="7" stroke="currentColor" />
		<path d="M211 44L217 48L211 52V44Z" fill="currentColor" />
		<rect x="103" y="47.5" width="108" height="1" fill="currentColor" />
	</svg>
</template>

<style module lang="scss">
.node {
	fill: var(--canvas-node--color--background, var(--node--color--background));
}
</style>
