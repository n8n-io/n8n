<script setup lang="ts">
import { N8nHeading, N8nText } from '@n8n/design-system';
import { useRoute } from 'vue-router';

const route = useRoute();
const eventId = route.params.id;
</script>

<template>
	<div :class="$style.container">
		<N8nHeading tag="h1" size="2xlarge">事件详情</N8nHeading>
		<N8nText>事件 ID: {{ eventId }}</N8nText>
		<div :class="$style.placeholder">🔍 功能开发中...</div>
	</div>
</template>

<style lang="scss" module>
.container {
	padding: var(--spacing--xl);
}

.placeholder {
	margin-top: var(--spacing--xl);
	padding: var(--spacing--3xl);
	background: var(--color--background);
	border: 2px dashed var(--color--foreground);
	border-radius: var(--radius--lg);
	text-align: center;
	font-size: var(--font-size--xl);
	color: var(--color--text--tint-2);
}
</style>
