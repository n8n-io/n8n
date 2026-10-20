<script lang="ts" setup>
import { useI18n } from '../../composables/useI18n';
import N8nBadge from '../N8nBadge';
import type { BadgeSize } from '../N8nBadge/Badge.type';

defineOptions({ name: 'N8nPreviewBadge' });

withDefaults(
	defineProps<{
		size?: BadgeSize;
		text?: string;
	}>(),
	{ size: 'xxsmall', text: undefined },
);

const { t } = useI18n();
</script>

<template>
	<N8nBadge variant="filled" :size="size">
		{{ text ?? t('previewBadge.preview') }}
	</N8nBadge>
</template>
