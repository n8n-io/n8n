<script setup lang="ts">
import { computed, useCssModule } from 'vue';
import { useCanvasNode } from '@/composables/useCanvasNode';
import { useI18n } from '@/composables/useI18n';
import { NodeDiffStatus } from '@/types';

const { diff } = useCanvasNode();

const $style = useCssModule();
const i18n = useI18n();

const classes = computed(() => ({
	[$style.diffStatus]: true,
	[$style[diff.value?.status]]: diff.value,
}));

const label = computed(() => (diff.value ? i18n.baseText(`diffStatus.${diff.value.status}`) : ''));
</script>

<template>
	<N8nBadge v-if="diff?.status !== NodeDiffStatus.Eq" :class="classes">{{ label }}</N8nBadge>
</template>

<style lang="scss" module>
.diffStatus {
	color: var(--prim-color-white);

	:global(.n8n-text) {
		font-weight: bold;
	}
}

.added {
	background: var(--color-success);
	border-color: var(--color-success);
}

.modified {
	background: var(--color-warning);
	border-color: var(--color-warning);
}

.deleted {
	background: var(--color-danger);
	border-color: var(--color-danger);
}
</style>
