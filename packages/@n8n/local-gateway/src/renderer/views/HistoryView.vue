<script setup lang="ts">
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const i18n = useI18n();
</script>

<template>
	<div :class="$style.empty">
		<N8nText color="text-light" size="small">{{
			i18n.baseText('desktopAssistant.history.empty')
		}}</N8nText>
	</div>
</template>

<style module>
.empty {
	display: flex;
	flex: 1;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--2xl) var(--spacing--md);
}
</style>
