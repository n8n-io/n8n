<script setup lang="ts">
import { N8nText } from '@n8n/design-system';
</script>

<template>
	<div :class="$style.NoIssuesContainer">
		<N8nText tag="h3" size="large" color="text-base" class="mb-2xs">
			<slot name="title" />
		</N8nText>
		<N8nText tag="p" size="medium" color="text-light" class="mb-2xl">
			<slot name="description" />
		</N8nText>
	</div>
</template>

<style module>
.NoIssuesContainer {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	text-align: center;
	padding: var(--spacing--4xl) 0;
}
</style>
