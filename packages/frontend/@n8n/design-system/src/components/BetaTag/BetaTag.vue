<script lang="ts" setup>
import { useI18n } from '../../composables/useI18n';

const { t } = useI18n();
</script>

<template>
	<N8nBadge theme="purple" :showBorder="false">{{ t('betaTag.beta') }}</N8nBadge>
</template>
