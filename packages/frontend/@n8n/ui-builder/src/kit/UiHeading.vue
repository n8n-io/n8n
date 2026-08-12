<script setup lang="ts">
import { N8nHeading } from '@n8n/design-system';
import { computed } from 'vue';

defineOptions({ name: 'UiHeading' });

const props = withDefaults(defineProps<{ text?: string; level?: string | number }>(), {
	text: 'Heading',
	level: 2,
});

// The kit exposes heading levels, which is what an app author thinks in; the
// design system thinks in sizes.
const SIZE_BY_LEVEL = ['2xlarge', 'xlarge', 'large'] as const;

// Clamped rather than passed through: the kit offers three levels, and a
// hand-edited `7` would otherwise render an `h7`, which is not an element.
const level = computed(() => Math.min(3, Math.max(1, Math.round(Number(props.level)) || 2)));

const size = computed(() => SIZE_BY_LEVEL[level.value - 1]);
const tag = computed(() => `h${level.value}`);
</script>

<template>
	<N8nHeading :tag="tag" :size="size" bold>{{ text }}</N8nHeading>
</template>
