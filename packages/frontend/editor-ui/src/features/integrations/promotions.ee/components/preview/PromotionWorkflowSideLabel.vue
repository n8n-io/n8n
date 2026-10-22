<script setup lang="ts">
import type { PromotionDirection } from '@n8n/api-types';
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import type { DetailSide } from '../../promotionPreview.content';
import { isBranchSide } from '../../promotionPreview.workflow';

const props = defineProps<{
	side: DetailSide;
	direction: PromotionDirection;
	branchName?: string;
}>();
const i18n = useI18n();
const label = computed(() =>
	isBranchSide(props.side, props.direction)
		? i18n.baseText(`promotions.preview.branch.${props.direction}`, {
				interpolate: { branch: props.branchName ?? '' },
			})
		: i18n.baseText('promotions.preview.side.instance'),
);
</script>

<template>
	<span :class="$style.badge">
		<span :class="[$style.dot, $style[side]]" />
		<N8nText color="text-dark" size="small" compact>{{ label }}</N8nText>
	</span>
</template>

<style module lang="scss">
.badge {
	composes: sourceBadge from '../../../../workflows/workflowDiff/workflowDiff.module.scss';
}
.dot {
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	border-radius: var(--radius--full);
	flex-shrink: 0;
}
.before {
	background-color: var(--color--mint-600);
}
.after {
	background-color: var(--color--yellow-500);
}
</style>
