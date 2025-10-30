<script setup lang="ts">
import { N8nSpinner } from '@n8n/design-system';
</script>

<template>
	<div :class="$style.wrapper" data-test-id="node-view-loader">
		<div :class="$style.spinner">
			<N8nSpinner />
		</div>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	width: 100%;
	height: 100%;
	position: absolute;
	background-color: var(--color--background--light-2);
}

.spinner {
	margin-bottom: var(--spacing--lg);
	position: absolute;
	left: 50%;
	top: 30%;

	* {
		color: var(--color--primary);
		min-height: 40px;
		min-width: 40px;
	}
}
</style>
