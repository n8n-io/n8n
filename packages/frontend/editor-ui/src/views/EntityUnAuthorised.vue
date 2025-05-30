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
				You need access
			</N8nHeading>
			<N8nText color="text-base" tag="p" align="center">
				You don't have permission to view this
				{{ locale.baseText(`generic.${entityType}`).toLocaleLowerCase() }}. Please contact the
				person who shared this link to request access.
			</N8nText>
		</N8nCard>
	</div>
</template>
