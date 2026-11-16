<script setup lang="ts">
import {
	showsFeatureMaturityBadges,
	type FeatureMaturityId,
} from '@n8n/frontend-constants/feature-maturity';
import { computed } from 'vue';

import { useI18n } from '../../composables/useI18n';
import N8nBadge from '../N8nBadge';
import type { BadgeSize } from '../N8nBadge/Badge.type';
import N8nTooltip from '../N8nTooltip';

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

const { t } = useI18n();
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
		<N8nBadge
			v-if="resolvedPreview"
			variant="pink"
			:size="resolvedSize"
			leading-icon="flask-conical"
			:data-test-id="previewTestId"
		>
			{{ resolvedPreviewText ?? t('previewBadge.preview') }}
		</N8nBadge>
		<N8nTooltip v-if="showEnterpriseBadge" placement="top" as-child>
			<N8nBadge
				variant="pink"
				:size="resolvedSize"
				leading-icon="shield-half"
				:class="$style.enterpriseBadge"
				:data-test-id="enterpriseTestId"
				tabindex="0"
			>
				{{ t('enterpriseReadinessBadge.limited') }}
			</N8nBadge>
			<template #content>
				<!-- The tooltip content is a centered column. One paragraph keeps the link in the sentence. -->
				<p :class="$style.tooltipCopy">
					{{ t('enterpriseReadinessBadge.tooltip') }}
					<a
						v-if="resolvedDocsUrl"
						:class="$style.docsLink"
						:href="resolvedDocsUrl"
						target="_blank"
						rel="noopener noreferrer"
					>
						{{ t('maturityBadge.docsLink') }}
					</a>
				</p>
			</template>
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

.enterpriseBadge {
	cursor: default;
	outline: none;

	&:focus-visible {
		@include focus.focus-ring-with-border;
	}
}

.tooltipCopy {
	margin: 0;
	align-self: stretch;
	line-height: inherit;
}

.docsLink {
	color: inherit;
	text-decoration: underline;
}
</style>
