<script setup lang="ts">
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const i18n = useI18n();
</script>

<template>
	<N8nText size="small" color="text-light" data-test-id="workflow-review-activity-unknown">
		{{ i18n.baseText('workflowReviews.detail.activity.unknownEntry') }}
	</N8nText>
</template>
