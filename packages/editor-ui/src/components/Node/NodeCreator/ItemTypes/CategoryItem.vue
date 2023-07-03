<script lang="ts" setup>
import { computed } from 'vue';

export interface Props {
	expanded?: boolean;
	active?: boolean;
	count?: number;
	name: string;
	isTrigger?: boolean;
}
const props = withDefaults(defineProps<Props>(), {
	expanded: true,
});

const categoryName = computed(() => {
	const itemsCount = props.count || 0;
	return itemsCount > 0 ? `${props.name} (${itemsCount})` : props.name;
});
</script>

<template>
	<div
		:class="$style.categoryWrapper"
		v-on="$listeners"
		data-keyboard-nav="true"
		data-test-id="node-creator-category-item"
	>
		<div :class="{ [$style.category]: true, [$style.active]: active }">
			<span :class="$style.name">
				<span v-text="categoryName" />
				<font-awesome-icon icon="bolt" v-if="isTrigger" size="xs" :class="$style.triggerIcon" />
				<slot />
			</span>
			<font-awesome-icon v-if="expanded" icon="chevron-down" :class="$style.arrow" />
			<font-awesome-icon :class="$style.arrow" icon="chevron-up" v-else />
		</div>
	</div>
</template>

<style lang="scss" module>
.triggerIcon {
	color: var(--color-primary);
	margin-left: var(--spacing-3xs);
}
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
		left: 0;
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

.name {
	flex-grow: 1;
	color: var(--color-text-dark);
}

.arrow {
	font-size: var(--font-size-2xs);
	width: 12px;
	color: $node-creator-arrow-color;
}
</style>
