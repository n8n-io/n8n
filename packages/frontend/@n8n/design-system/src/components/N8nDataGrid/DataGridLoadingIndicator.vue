<script setup lang="ts">
import { useTimeoutFn } from '@vueuse/core';
import { ref } from 'vue';

import { useI18n } from '../../composables/useI18n';
import N8nSpinner from '../N8nSpinner';
import N8nText from '../N8nText';

const SHOW_DELAY_MS = 1000;

const { t } = useI18n();
const isVisible = ref(false);

useTimeoutFn(() => {
	isVisible.value = true;
}, SHOW_DELAY_MS);
</script>

<template>
	<div v-if="isVisible" :class="$style.indicator" role="status" data-test-id="data-grid-loading">
		<N8nSpinner size="small" />
		<N8nText size="small">{{ t('dataGrid.loading') }}</N8nText>
	</div>
</template>

<style module lang="scss">
.indicator {
	position: absolute;
	top: var(--spacing--xs);
	right: var(--spacing--xs);
	z-index: 3;
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	background: var(--background--surface);
	pointer-events: none;
}
</style>
