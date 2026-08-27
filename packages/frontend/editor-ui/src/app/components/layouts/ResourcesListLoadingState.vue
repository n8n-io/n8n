<script lang="ts" setup>
import { N8nLoading } from '@n8n/design-system';
</script>

<template>
	<div :class="$style.container">
		<N8nLoading :rows="3" variant="p" />
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	justify-content: center;
	height: 100%;
	width: 100%;
	max-width: 480px;
	margin: 0 auto;
	padding: var(--spacing--2xl);
}
</style>
