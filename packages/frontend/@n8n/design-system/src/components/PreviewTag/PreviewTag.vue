<script lang="ts" setup>
import { useI18n } from '../../composables/useI18n';
import N8nBadge from '../N8nBadge';

withDefaults(
	defineProps<{
		size?: 'small' | 'medium';
	}>(),
	{ size: 'small' },
);

const { t } = useI18n();
</script>

<template>
	<N8nBadge :size="size" theme="purple" :showBorder="false">{{ t('previewTag.preview') }}</N8nBadge>
</template>
