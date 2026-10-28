<script lang="ts" setup>
import { useI18n } from '../../composables/useI18n';
import N8nBadge from '../N8nBadge';
import type { BadgeSize } from '../N8nBadge/Badge.type';
import N8nTooltip from '../N8nTooltip';

// `N8nFeatureMaturityBadges` is the only caller. A lint rule blocks other Vue files.
defineOptions({ name: 'N8nEnterpriseReadinessBadge' });

withDefaults(
	defineProps<{
		/** The badge size. Same default as `N8nPreviewBadge`. */
		size?: BadgeSize;
		/** Feature documentation page. The tooltip links here. */
		docsUrl?: string;
	}>(),
	{ size: 'xxsmall', docsUrl: undefined },
);

const { t } = useI18n();
</script>

<template>
	<N8nTooltip placement="top" as-child>
		<N8nBadge
			variant="pink"
			:size="size"
			leading-icon="shield-half"
			:class="$style.badge"
			tabindex="0"
		>
			{{ t('enterpriseReadinessBadge.limited') }}
		</N8nBadge>
		<template #content>
			<!-- The tooltip content is a centered column. One paragraph keeps the link in the sentence. -->
			<p :class="$style.tooltipCopy">
				{{ t('enterpriseReadinessBadge.tooltip') }}
				<a
					v-if="docsUrl"
					:class="$style.docsLink"
					:href="docsUrl"
					target="_blank"
					rel="noopener noreferrer"
				>
					{{ t('maturityBadge.docsLink') }}
				</a>
			</p>
		</template>
	</N8nTooltip>
</template>

<style lang="scss" module>
@use '../../css/mixins/focus';

.badge {
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
