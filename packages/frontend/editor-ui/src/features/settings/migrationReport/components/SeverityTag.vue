<script setup lang="ts">
import { N8nBadge } from '@n8n/design-system';

defineOptions({ name: 'SeverityTag' });

defineProps<{
	severity: 'low' | 'medium' | 'critical';
}>();

const tagsI18n = {
	critical: 'Critical',
	medium: 'Medium',
	low: 'Low',
} as const;

const badgeVariants = {
	critical: 'danger',
	medium: 'warning',
	low: 'outline',
} as const;
</script>

<template>
	<N8nBadge :variant="badgeVariants[severity]">{{ tagsI18n[severity] }}</N8nBadge>
</template>
