<script lang="ts" setup>
import { useI18n } from '../../composables/useI18n';
import N8nBadge from '../N8nBadge';
import type { BadgeSize } from '../N8nBadge/Badge.type';
import N8nIcon from '../N8nIcon';
import N8nTooltip from '../N8nTooltip';

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
	<N8nTooltip placement="top-start" as-child :content-class="$style.tooltip">
		<N8nBadge variant="outline" :size="size" :class="$style.badge" tabindex="0">
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
					<span :class="$style.docsLabel">{{ t('maturityBadge.docsLink') }}</span>
					<N8nIcon icon="external-link" />
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

.tooltip:global(.n8n-tooltip) {
	/* The shared tooltip caps at 180px and uses a tighter padding. This copy needs both overrides. No token is 240px or 10px. */
	max-width: 240px;
	padding: 10px;
	align-items: flex-start;
	text-align: left;
}

.tooltipCopy {
	margin: 0;
	align-self: stretch;
	line-height: inherit;
}

.docsLink {
	color: inherit;
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);
	text-decoration: none;
	white-space: nowrap;
}

.docsLabel {
	text-decoration: underline;
}
</style>
