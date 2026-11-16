<script setup lang="ts">
import type { FeatureMaturityId } from '@n8n/frontend-constants/feature-maturity';
import { computed } from 'vue';

import { useI18n } from '../../composables/useI18n';
import N8nBadge from '../N8nBadge';
import N8nTooltip from '../N8nTooltip';

import { resolveFeatureMaturityBadges, useEnterprisePlan } from './featureMaturityState';

defineOptions({ name: 'N8nFeatureMaturityBadges' });

const props = withDefaults(
	defineProps<{
		/**
		 * Feature id from `featureMaturity`. The entry decides which badges render.
		 * Omit it to draw only the Preview badge.
		 */
		feature?: FeatureMaturityId;
		/** Hide the Preview badge at this callsite. */
		hidePreview?: boolean;
		/** Hide the Limited enterprise readiness badge at this callsite. */
		hideEnterprise?: boolean;
		/**
		 * Prefix for the badge test ids.
		 * Produces `${testId}-preview-badge` and `${testId}-enterprise-readiness-badge`.
		 * A `feature` id supplies this when the prop is omitted.
		 */
		testId?: string;
	}>(),
	{
		feature: undefined,
		hidePreview: false,
		hideEnterprise: false,
		testId: undefined,
	},
);

const { t } = useI18n();
const enterprisePlan = useEnterprisePlan();

const resolved = computed(() => {
	// A callsite with no feature id draws the Preview badge on its own.
	if (props.feature === undefined) {
		return {
			showPreview: !props.hidePreview,
			showEnterprise: false,
			testId: props.testId,
		};
	}

	const badges = resolveFeatureMaturityBadges(props.feature, enterprisePlan.value, {
		preview: props.hidePreview,
		enterprise: props.hideEnterprise,
	});
	return { ...badges, testId: props.testId ?? badges.testId };
});
const visible = computed(() => resolved.value.showPreview || resolved.value.showEnterprise);
const previewTestId = computed(() =>
	resolved.value.testId ? `${resolved.value.testId}-preview-badge` : undefined,
);
const enterpriseTestId = computed(() =>
	resolved.value.testId ? `${resolved.value.testId}-enterprise-readiness-badge` : undefined,
);
</script>

<template>
	<span v-if="visible" :class="$style.badges">
		<N8nBadge
			v-if="resolved.showPreview"
			size="xxsmall"
			:class="$style.previewBadge"
			:data-test-id="previewTestId"
		>
			{{ t('previewBadge.preview') }}
		</N8nBadge>
		<N8nTooltip
			v-if="resolved.showEnterprise"
			placement="top"
			as-child
			:content="t('enterpriseReadinessBadge.tooltip')"
		>
			<N8nBadge
				variant="outline"
				size="xxsmall"
				:class="$style.enterpriseBadge"
				:data-test-id="enterpriseTestId"
				tabindex="0"
			>
				{{ t('enterpriseReadinessBadge.limited') }}
			</N8nBadge>
		</N8nTooltip>
	</span>
</template>

<style lang="scss" module>
@use '../../css/mixins/focus';

.badges {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.previewBadge {
	border-style: dashed;
	border-width: 1.5px;
	--n8n-badge--text-color: var(--text-color--subtle);
}

.enterpriseBadge {
	cursor: default;
	outline: none;

	&:focus-visible {
		@include focus.focus-ring-with-border;
	}
}
</style>
