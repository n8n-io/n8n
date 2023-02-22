<template>
	<div :class="$style.category">
		<span :class="$style.name" v-text="item.name" />
		<font-awesome-icon v-if="item.expanded" icon="chevron-down" :class="$style.arrow" />
		<font-awesome-icon :class="$style.arrow" icon="chevron-up" v-else />
	</div>
</template>

<script lang="ts" setup>
import { ICategoryItemProps } from '@/Interface';

export interface Props {
	item: ICategoryItemProps;
}
defineProps<Props>();
</script>

<style lang="scss" module>
.category {
	font-size: 11px;
	font-weight: var(--font-weight-bold);
	letter-spacing: 1px;
	line-height: 11px;
	padding: 10px 0;
	margin: 0 var(--spacing-xs);
	border-bottom: 1px solid $node-creator-border-color;
	display: flex;
	text-transform: uppercase;
	cursor: pointer;
}

.name {
	flex-grow: 1;
}

.arrow {
	font-size: var(--font-size-2xs);
	width: 12px;
	color: $node-creator-arrow-color;
}
</style>
