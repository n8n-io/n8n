<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';

const { t } = useI18n();
</script>

<template>
	<div :class="$style.beta">{{ t('generic.beta') }}</div>
</template>

<style lang="scss" module>
.beta {
	display: inline-block;

	color: var(--color--secondary);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	background-color: var(--color--secondary--tint-2);
	padding: var(--spacing--5xs) var(--spacing--4xs);
	border-radius: 16px;
}
</style>
