<template>
	<div :class="$style.label">
		<span :class="$style.name" v-text="item.key" />
	</div>
</template>

<script lang="ts" setup>
import { LabelItemProps } from '@/Interface';

export interface Props {
	item: LabelItemProps;
}
defineProps<Props>();
</script>

<style lang="scss" module>
.label {
	margin-left: var(--spacing-s);
	margin-right: var(--spacing-s);
	margin-bottom: var(--spacing-4xs);
	letter-spacing: 1px;
	padding-top: var(--spacing-s);
	font-style: normal;
	font-weight: 700;
	font-size: 10px;
	line-height: 12px;
	text-transform: uppercase;
	color: var(--color-text-base);
	cursor: default;
}

// Reduce top padding of the first label in a category
:global([class*='_iteratorItem'][class*='_category_'] + [class*='_label_'] [class*='_label']) {
	padding-top: var(--spacing-s);
}
</style>
