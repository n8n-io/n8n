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
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	position: absolute;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: var(--color--background--light-2);
}

.spinner {
	margin: 0 auto;

	* {
		color: var(--color--primary);
		min-height: 40px;
		min-width: 40px;
	}
}
</style>
