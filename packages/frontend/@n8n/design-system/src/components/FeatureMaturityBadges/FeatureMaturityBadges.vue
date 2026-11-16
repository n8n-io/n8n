<script setup lang="ts">
import { computed } from 'vue';

import { useI18n } from '../../composables/useI18n';
import N8nBadge from '../N8nBadge';
import N8nTooltip from '../N8nTooltip';

defineOptions({ name: 'N8nFeatureMaturityBadges' });

const props = withDefaults(
	defineProps<{
		/** Show the Preview badge. */
		showPreview?: boolean;
		/** Show the Limited enterprise readiness badge. */
		showEnterprise?: boolean;
		/**
		 * Prefix for the badge test ids.
		 * Produces `${testId}-preview-badge` and `${testId}-enterprise-readiness-badge`.
		 */
		testId?: string;
	}>(),
	{
		showPreview: false,
		showEnterprise: false,
		testId: undefined,
	},
);

const { t } = useI18n();

const visible = computed(() => props.showPreview || props.showEnterprise);
const previewTestId = computed(() => (props.testId ? `${props.testId}-preview-badge` : undefined));
const enterpriseTestId = computed(() =>
	props.testId ? `${props.testId}-enterprise-readiness-badge` : undefined,
);
</script>

<template>
	<span v-if="visible" :class="$style.badges">
		<N8nBadge
			v-if="showPreview"
			size="xxsmall"
			:class="$style.previewBadge"
			:data-test-id="previewTestId"
		>
			{{ t('previewBadge.preview') }}
		</N8nBadge>
		<N8nTooltip
			v-if="showEnterprise"
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
