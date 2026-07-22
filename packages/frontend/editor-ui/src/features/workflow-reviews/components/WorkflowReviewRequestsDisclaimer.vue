<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { N8nText } from '@n8n/design-system';

const i18n = useI18n();
</script>

<template>
	<div :class="$style.disclaimer" data-test-id="workflow-reviews-disclaimer">
		<N8nText color="text-light" size="medium">
			{{ i18n.baseText('workflowReviews.disclaimer.body') }}
		</N8nText>
	</div>
</template>

<style lang="scss" module>
.disclaimer {
	max-width: 40rem;
}
</style>
