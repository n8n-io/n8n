<script lang="ts" setup>
import { computed } from 'vue';

import { useI18n } from '../../composables/useI18n';
import N8nBadge from '../N8nBadge';
import N8nTooltip from '../N8nTooltip';

defineOptions({ name: 'N8nEnterpriseReadinessBadge' });

const props = withDefaults(
	defineProps<{
		/** Badge size, on the same scale as `N8nPreviewBadge`. */
		size?: 'small' | 'medium';
	}>(),
	{ size: 'small' },
);

const sizeMapping = computed(() => {
	return props.size === 'small' ? 'xxsmall' : 'xsmall';
});

const { t } = useI18n();
</script>

<template>
	<N8nTooltip :content="t('enterpriseReadinessBadge.tooltip')" placement="top" as-child>
		<N8nBadge variant="outline" :size="sizeMapping" :class="$style.badge" tabindex="0">
			{{ t('enterpriseReadinessBadge.limited') }}
		</N8nBadge>
	</N8nTooltip>
</template>

<style lang="scss" module>
@use '../../css/mixins/focus';

.badge {
	--n8n-badge--height: auto;

	cursor: default;
	outline: none;

	&:focus-visible {
		@include focus.focus-ring-with-border;
	}
}
</style>
