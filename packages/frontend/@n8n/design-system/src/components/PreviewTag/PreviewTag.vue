<script lang="ts" setup>
import { useI18n } from '../../composables/useI18n';

withDefaults(
	defineProps<{
		size?: 'small' | 'medium';
	}>(),
	{ size: 'small' },
);

const { t } = useI18n();
</script>

<template>
	<div :class="[$style.preview, $style[size]]">{{ t('previewTag.preview') }}</div>
</template>

<style lang="scss" module>
.preview {
	display: inline-block;

	color: var(--color--secondary);
	font-weight: var(--font-weight--bold);
	background-color: var(--color--secondary--tint-2);
	border-radius: 16px;
}

.small {
	font-size: var(--font-size--3xs);
	padding: var(--spacing--5xs) var(--spacing--4xs);
}

.medium {
	font-size: var(--font-size--2xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
}
</style>
