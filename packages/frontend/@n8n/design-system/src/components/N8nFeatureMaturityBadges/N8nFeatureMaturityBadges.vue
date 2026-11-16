<script setup lang="ts">
import { computed } from 'vue';

import { useI18n } from '../../composables/useI18n';
import N8nBadge from '../N8nBadge';
import N8nTooltip from '../N8nTooltip';

import { resolveFeatureMaturityBadges, useFeatureMaturityCatalog } from './featureMaturityState';

defineOptions({ name: 'N8nFeatureMaturityBadges' });

const props = withDefaults(
	defineProps<{
		feature?: string;
		/** Hide the Preview badge at this callsite. */
		/** @default false */
		hidePreview?: boolean;
		/** Hide the Limited enterprise readiness badge at this callsite. */
		/** @default false */
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
			variant="filled"
			size="xxsmall"
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
			<N8nBadge variant="filled" size="xxsmall" :data-test-id="enterpriseTestId" tabindex="0">
				{{ t('enterpriseReadinessBadge.limited') }}
			</N8nBadge>
		</N8nTooltip>
	</span>
</template>

<style lang="scss" module>
.badges {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}
</style>
