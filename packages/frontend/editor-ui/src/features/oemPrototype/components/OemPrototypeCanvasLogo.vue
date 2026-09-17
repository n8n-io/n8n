<script setup lang="ts">
import { N8nLogo } from '@n8n/design-system';
</script>

<template>
	<a
		:class="$style.logo"
		data-test-id="oem-prototype-canvas-logo"
		href="https://docs.n8n.io/"
		target="_blank"
		rel="noopener noreferrer"
		aria-label="n8n"
	>
		<N8nLogo size="small" :collapsed="false" />
	</a>
</template>

<style lang="scss" module>
.logo {
	position: absolute;
	// These offsets are part of the API-317 prototype specification.
	top: 20px;
	left: 18px;
	z-index: 10;
	display: flex;
	align-items: center;
	// Keep the 32px icon, 2px gap, and 26px wordmark independent of sidebar styles.
	width: 60px;
	height: 26px;
	color: inherit;
	text-decoration: none;

	:global([data-test-id='n8n-logo']) {
		flex: none;
		justify-content: flex-start;
		width: 60px;
		height: 26px;
		gap: 2px;
	}

	:global(svg) {
		display: block;
		flex: none;
		height: 26px;
		margin-left: 0;
	}

	:global(svg:first-child) {
		width: 32px;
	}

	:global(svg:nth-child(2)) {
		width: 26px;
		margin-left: 0;
	}
}
</style>
