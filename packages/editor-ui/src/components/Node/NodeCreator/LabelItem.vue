<template>
	<div :class="$style.label">
		<span :class="$style.name" v-text="item.key" />
	</div>
</template>

<script lang="ts" setup>
// import { ILabelItemProps } from '@/Interface';

export interface Props {
	item: any;
}
defineProps<Props>();
</script>

<style lang="scss" module>
.label {
	margin-left: var(--spacing-s);
	margin-right: var(--spacing-s);
	margin-bottom: var(--spacing-3xs);
	letter-spacing: 1px;
	padding-top: var(--spacing-s);
	font-style: normal;
	font-weight: 700;
	font-size: 10px;
	line-height: 12px;
	text-transform: uppercase;
	color: var(--color-text-base);
}
</style>
