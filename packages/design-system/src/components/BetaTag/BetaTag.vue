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
	font-size: var(--font-size-3xs);
	font-weight: var(--font-weight-bold);
	background-color: var(--color-secondary-tint-3);
	padding: var(--spacing-5xs) var(--spacing-4xs);
	border-radius: 16px;
}
</style>
