<script setup lang="ts">
import type { AppResponse } from '@n8n/api-types';
import { N8nBadge } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

const props = defineProps<{ app: AppResponse }>();

const i18n = useI18n();

const isPublished = computed(() => props.app.publishedVersionId !== null);
</script>

<template>
	<N8nBadge :variant="isPublished ? 'success' : 'outline'" data-test-id="app-publication">
		{{ i18n.baseText(isPublished ? 'apps.card.published' : 'apps.card.draft') }}
	</N8nBadge>
</template>
