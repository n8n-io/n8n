<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
const i18n = useI18n();
</script>

<template>
	<div :class="$style.container" data-test-id="ai">
		<h1>{{ i18n.baseText('settings.ai') }}</h1>
		<p>{{ i18n.baseText('settings.ai.description') }}</p>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--m);
}
</style>
