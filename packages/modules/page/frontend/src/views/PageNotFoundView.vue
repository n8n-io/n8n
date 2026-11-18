<script setup lang="ts">
import { N8nEmptyState } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const i18n = useI18n();
</script>

<template>
	<div :class="$style.view" data-test-id="page-not-found">
		<N8nEmptyState
			:icon="{ type: 'icon', value: 'file-text' }"
			:heading="i18n.baseText('page.editor.notFound.heading')"
			:description="i18n.baseText('page.editor.notFound.description')"
		/>
	</div>
</template>

<style lang="scss" module>
.view {
	display: flex;
	justify-content: center;
	width: 100%;
	padding: var(--spacing--3xl) var(--spacing--2xl);
}
</style>
