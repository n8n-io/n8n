<template>
	<div :class="$style.categoryWrapper">
		<div :class="{ [$style.category]: true, [$style.active]: active }">
			<span :class="$style.name" v-text="item.name" />
			<font-awesome-icon v-if="item.expanded" icon="chevron-down" :class="$style.arrow" />
			<font-awesome-icon :class="$style.arrow" icon="chevron-up" v-else />
		</div>
		<!-- <n8n-callout
			theme="custom"
			iconless
			:class="$style.callout"
			v-if="categoryCallout && item.expanded"
		>
			{{ categoryCallout }}
		</n8n-callout> -->
	</div>
</template>

<script lang="ts" setup>
import useCategoryCallouts from './useCategoryCallouts';
import { ICategoryItemProps } from '@/Interface';

export interface Props {
	item: ICategoryItemProps;
	active: boolean;
}
const props = defineProps<Props>();
const { categoryCallout } = useCategoryCallouts(props.item.name);
</script>

<style lang="scss" module>
.category {
	font-size: var(--font-size-s);
	font-weight: var(--font-weight-bold);
	line-height: var(--font-line-height-compact);
	padding: var(--spacing-2xs) var(--spacing-s);
	border-bottom: 1px solid $node-creator-border-color;
	display: flex;
	cursor: pointer;

	position: relative;
	&::before {
		content: '';
		position: absolute;
		left: -1px;
		top: 0;
		bottom: 0;
		border-left: 2px solid transparent;
	}
	&:hover::before {
		border-color: $node-creator-item-hover-border-color;
	}
	&.active::before {
		border-color: $color-primary;
	}
}
.categoryWrapper {
	outline: 0;
}

.callout {
	--callout-border-color: var(--color-foreground-base);
	--callout-background-color: var(--color-background-light);
	--callout-color: var(--color-text-base);
	margin: var(--spacing-xs) var(--spacing-s) 0;
}
.name {
	flex-grow: 1;
	color: var(--color-text-dark);
}

.arrow {
	font-size: var(--font-size-2xs);
	width: 12px;
	color: $node-creator-arrow-color;
}

:global(
		[class*='_iteratorItem'][class*='_action_'] + [class*='_category_'] [class*='_categoryWrapper']
	) {
	margin-top: var(--spacing-l);
}
</style>
