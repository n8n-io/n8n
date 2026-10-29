<script lang="ts" setup>
import { useI18n } from '../../composables/useI18n';
import N8nBadge from '../N8nBadge';
import type { BadgeSize } from '../N8nBadge/Badge.type';
import N8nTooltip from '../N8nTooltip';

defineOptions({ name: 'N8nEnterpriseReadinessBadge' });

withDefaults(
	defineProps<{
		/** The badge size. Same default as `N8nPreviewBadge`. */
		size?: BadgeSize;
	}>(),
	{ size: 'xxsmall' },
);

const { t } = useI18n();
</script>

<template>
	<N8nTooltip :content="t('enterpriseReadinessBadge.tooltip')" placement="top" as-child>
		<N8nBadge variant="outline" :size="size" :class="$style.badge" tabindex="0">
			{{ t('enterpriseReadinessBadge.limited') }}
		</N8nBadge>
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
</style>
