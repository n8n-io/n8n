<script lang="ts" setup>
import { useI18n } from '@/composables/useI18n';
import { N8nCard, N8nHeading, N8nText } from '@n8n/design-system';

defineProps<{
	entityType: 'credential' | 'workflow';
}>();

const locale = useI18n();
</script>

<template>
	<div style="display: flex; align-items: center; justify-content: center">
		<N8nCard style="max-width: 400px; padding: 32px">
			<N8nHeading size="xlarge" align="center" tag="h2" color="text-dark" class="mb-xs">
				{{ locale.baseText(`generic.${entityType}`) }} not found
			</N8nHeading>
			<N8nText color="text-base" tag="p" align="center">
				We couldn’t find the {{ locale.baseText(`generic.${entityType}`).toLocaleLowerCase() }} you
				were looking for. Make sure you have the correct URL.
			</N8nText>
		</N8nCard>
	</div>
</template>
