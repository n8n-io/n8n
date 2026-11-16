<script setup lang="ts">
import { computed } from 'vue';

import { useI18n } from '../../composables/useI18n';
import N8nBadge from '../N8nBadge';
import N8nTooltip from '../N8nTooltip';

import { resolveFeatureMaturityBadges, useFeatureMaturityCatalog } from './featureMaturityState';

defineOptions({ name: 'N8nFeatureMaturityBadges' });

const props = withDefaults(
	defineProps<{
		/**
		 * Feature id from the list the app provides.
		 * The entry decides which badges render.
		 * An id that is missing from the list renders nothing and warns in development.
		 * Omit it to draw only the Preview badge. That badge has no test id.
		 *
		 * The id sets the badge test ids. A camelCase id becomes kebab-case.
		 * `agents` renders `agents-preview-badge` and `agents-enterprise-readiness-badge`.
		 * `endUserCredentials` renders `end-user-credentials-preview-badge`.
		 * The enterprise badge uses the same prefix and `-enterprise-readiness-badge`.
		 */
		feature?: string;
		/** Hide the Preview badge at this callsite. */
		hidePreview?: boolean;
		/** Hide the Limited enterprise readiness badge at this callsite. */
		hideEnterprise?: boolean;
	}>(),
	{
		feature: undefined,
		hidePreview: false,
		hideEnterprise: false,
	},
);

const { t } = useI18n();
const catalog = useFeatureMaturityCatalog();

const resolved = computed(() => {
	// A callsite with no feature id draws the Preview badge on its own.
	if (props.feature === undefined) {
		return {
			showPreview: !props.hidePreview,
			showEnterprise: false,
			testId: undefined,
		};
	}

	return resolveFeatureMaturityBadges(catalog.value, props.feature, {
		preview: props.hidePreview,
		enterprise: props.hideEnterprise,
	});
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
