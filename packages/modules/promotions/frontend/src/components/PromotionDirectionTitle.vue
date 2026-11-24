<script setup lang="ts">
import type { PromotionDirection } from '@n8n/api-types';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { promotionDirectionIcon } from '../promotionsSettings.utils';

defineProps<{ direction: PromotionDirection }>();

const i18n = useI18n();
</script>

<template>
	<div :class="$style.title">
		<N8nIcon :icon="promotionDirectionIcon[direction]" color="text-dark" size="small" />
		<N8nText bold size="medium" color="text-dark">
			{{ i18n.baseText(`settings.promotions.environments.${direction}.title`) }}
		</N8nText>
	</div>
</template>

<style lang="scss" module>
.title {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
</style>
