<script lang="ts" setup>
import { useI18n } from '../../composables/useI18n';
import N8nBadge from '../N8nBadge';
import type { BadgeSize } from '../N8nBadge/Badge.type';

// `N8nFeatureMaturityBadges` is the only caller. A lint rule blocks other Vue files.
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
	<N8nBadge variant="pink" :size="size" leading-icon="flask-conical">
		{{ text ?? t('previewBadge.preview') }}
	</N8nBadge>
</template>
