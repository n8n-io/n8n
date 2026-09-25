<script lang="ts" setup>
import { computed } from 'vue';

import { useI18n } from '../../composables/useI18n';
import N8nBadge from '../N8nBadge';

defineOptions({ name: 'N8nPreviewBadge' });

const props = withDefaults(
	defineProps<{
		size?: 'small' | 'medium';
		text?: string;
	}>(),
	{ size: 'small', text: undefined },
);

const sizeMapping = computed(() => {
	return props.size === 'small' ? 'xxsmall' : 'xsmall';
});

const { t } = useI18n();
</script>

<template>
	<N8nBadge variant="secondary" :size="sizeMapping" :class="$style.preview">
		{{ text ?? t('previewBadge.preview') }}
	</N8nBadge>
</template>

<style lang="scss" module>
.preview {
	--n8n-badge--border-color: transparent;
	--n8n-badge--height: auto;
}
</style>
