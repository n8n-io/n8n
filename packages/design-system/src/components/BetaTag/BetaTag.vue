<script lang="ts" setup>
import { useI18n } from '../../composables/useI18n';

const { t } = useI18n();
</script>

<template>
	<div :class="$style.beta">{{ t('betaTag.beta') }}</div>
</template>

<style lang="scss" module>
.beta {
	display: inline-block;

	color: var(--color-secondary);
	font-size: 10px;
	font-weight: 600;
	line-height: 10px; /* 100% */
	background-color: var(--color-secondary-tint-3);
	padding: 1px 4px 2px 4px;
	border-radius: 16px;
}
</style>
