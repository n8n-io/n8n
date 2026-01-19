<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { N8nText } from '@n8n/design-system';

const i18n = useI18n();
</script>

<template>
	<div :class="$style.page">
		<N8nText tag="h1" size="xlarge">{{ i18n.baseText('ce.testExtension.page.title') }}</N8nText>
		<N8nText tag="p">{{ i18n.baseText('ce.testExtension.page.content') }}</N8nText>
		<router-link to="/home/workflows" :class="$style.link">
			{{ i18n.baseText('ce.testExtension.page.backLink') }}
		</router-link>
	</div>
</template>

<style module>
.page {
	padding: var(--spacing--xl);
}

.link {
	display: inline-block;
	margin-top: var(--spacing--sm);
	color: var(--color--primary);
	font-size: var(--font-size--sm);
}
</style>
