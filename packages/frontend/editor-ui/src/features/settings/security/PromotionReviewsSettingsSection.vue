<script lang="ts" setup>
import { N8nSettingsSection } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { isNewVariant } from '@/features/workflow-reviews/reviewPrototype.state';

import PromotionReviewsCard from './PromotionReviewsCard.vue';

const i18n = useI18n();
</script>

<template>
	<N8nSettingsSection
		v-if="isNewVariant"
		:title="i18n.baseText('settings.promotions.reviews.title')"
		:description="i18n.baseText('settings.promotions.reviews.description')"
		data-test-id="promotion-reviews-section"
	>
		<PromotionReviewsCard />
	</N8nSettingsSection>
</template>
