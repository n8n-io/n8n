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
	left: 26px;
	z-index: 10;
	display: flex;
	align-items: center;
	color: inherit;
	text-decoration: none;
}
</style>
