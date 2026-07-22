<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { N8nText } from '@n8n/design-system';

const i18n = useI18n();
</script>

<template>
	<div data-test-id="workflow-review-request-detail-stub">
		<N8nText color="text-light" size="medium">
			{{ i18n.baseText('workflowReviews.detail.placeholder') }}
		</N8nText>
	</div>
</template>
