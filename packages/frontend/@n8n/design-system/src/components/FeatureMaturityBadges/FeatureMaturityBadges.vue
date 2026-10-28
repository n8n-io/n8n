<script setup lang="ts">
import {
	showsFeatureMaturityBadges,
	type FeatureMaturityId,
} from '@n8n/frontend-constants/feature-maturity';
import { computed } from 'vue';

import type { BadgeSize } from '../N8nBadge/Badge.type';
import N8nEnterpriseReadinessBadge from '../EnterpriseReadinessBadge/EnterpriseReadinessBadge.vue';
import N8nPreviewBadge from '../PreviewBadge/PreviewBadge.vue';

import {
	featureMaturityTestId,
	readFeatureMaturity,
	useEnterprisePlan,
} from './featureMaturityState';

defineOptions({ name: 'N8nFeatureMaturityBadges' });

const props = withDefaults(
	defineProps<{
		/**
		 * Feature id from `featureMaturity`. The component reads the flags, the plan,
		 * and the badge size. Pass this instead of the individual flags.
		 */
		feature?: FeatureMaturityId;
		/**
		 * `title` uses the larger badge. `enable` uses the smaller badge.
		 * The page chooses which component renders the badges.
		 */
		placement?: 'title' | 'enable';
		/** Show the Preview badge. Ignored when `feature` is set. */
		preview?: boolean;
		/** Label for the Preview badge. Ignored when `feature` is set. */
		previewText?: string;
		/** The feature lacks full enterprise support. Ignored when `feature` is set. */
		limitedEnterpriseSupport?: boolean;
		/** Documentation page for the enterprise badge tooltip. Ignored when `feature` is set. */
		docsUrl?: string;
		/**
		 * The instance is on an enterprise plan.
		 * Overrides the plan the app provides. Omit it to use that plan.
		 */
		enterprisePlan?: boolean;
		/** Badge size. The title placement defaults to `xsmall`. Every other placement defaults to `xxsmall`. */
		size?: BadgeSize;
		/**
		 * Prefix for the badge test ids.
		 * Produces `${testId}-preview-badge` and `${testId}-enterprise-readiness-badge`.
		 * A `feature` id supplies this when the prop is omitted.
		 */
		testId?: string;
	}>(),
	{
		feature: undefined,
		placement: undefined,
		preview: false,
		previewText: undefined,
		limitedEnterpriseSupport: false,
		docsUrl: undefined,
		enterprisePlan: undefined,
		size: undefined,
		testId: undefined,
	},
);

const providedEnterprisePlan = useEnterprisePlan();

const entry = computed(() => (props.feature ? readFeatureMaturity(props.feature) : undefined));
const resolvedPreview = computed(() => entry.value?.preview ?? props.preview);
const resolvedLimitedEnterpriseSupport = computed(
	() => entry.value?.limitedEnterpriseSupport ?? props.limitedEnterpriseSupport,
);
const resolvedDocsUrl = computed(() => entry.value?.docsUrl ?? props.docsUrl);
const resolvedEnterprisePlan = computed(() => props.enterprisePlan ?? providedEnterprisePlan.value);
const resolvedTestId = computed(
	() => props.testId ?? (props.feature ? featureMaturityTestId(props.feature) : undefined),
);
const resolvedSize = computed(
	() => props.size ?? (props.placement === 'title' ? 'xsmall' : 'xxsmall'),
);
const resolvedPreviewText = computed(() => (props.feature ? undefined : props.previewText));

const showEnterpriseBadge = computed(
	() => resolvedLimitedEnterpriseSupport.value && resolvedEnterprisePlan.value,
);
const visible = computed(() => {
	if (entry.value) return showsFeatureMaturityBadges(entry.value, resolvedEnterprisePlan.value);
	return resolvedPreview.value || showEnterpriseBadge.value;
});
const previewTestId = computed(() =>
	resolvedTestId.value ? `${resolvedTestId.value}-preview-badge` : undefined,
);
const enterpriseTestId = computed(() =>
	resolvedTestId.value ? `${resolvedTestId.value}-enterprise-readiness-badge` : undefined,
);
</script>

<template>
	<span v-if="visible" :class="$style.badges">
		<N8nPreviewBadge
			v-if="resolvedPreview"
			:size="resolvedSize"
			:text="resolvedPreviewText"
			v-bind="previewTestId ? { 'data-test-id': previewTestId } : {}"
		/>
		<N8nEnterpriseReadinessBadge
			v-if="showEnterpriseBadge"
			:size="resolvedSize"
			:docs-url="resolvedDocsUrl"
			v-bind="enterpriseTestId ? { 'data-test-id': enterpriseTestId } : {}"
		/>
	</span>
</template>

<style lang="scss" module>
.badges {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}
</style>
