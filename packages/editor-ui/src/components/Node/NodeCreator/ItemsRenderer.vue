<script setup lang="ts">
import { INodeCreateElement, NodeCreateElement } from '@/Interface';
import NodeItem from './NodeItem.vue';
import SubcategoryItem from './SubcategoryItem.vue';
import CategoryItem from './CategoryItem.vue';
import LabelItem from './LabelItem.vue';
import ActionItem from './ActionItem.vue';
import ViewItem from './ViewItem.vue';
import { reactive, toRefs, onMounted, watch, onUnmounted, ref, watchEffect } from 'vue';

export interface Props {
	elements: INodeCreateElement[];
	activeIndex?: number;
	disabled?: boolean;
	lazyRender?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	elements: () => [],
	lazyRender: true,
});

const emit = defineEmits<{
	(event: 'selected', element: INodeCreateElement, $e?: Event): void;
	(event: 'dragstart', element: INodeCreateElement, $e: Event): void;
	(event: 'dragend', element: INodeCreateElement, $e: Event): void;
}>();

// const iteratorItems = ref<HTMLElement[]>([]);
const renderedItems = ref<INodeCreateElement[]>([]);
const renderAnimationRequest = ref<number>(0);

// Lazy render large items lists to prevent the browser from freezing
// when loading many items.
function renderItems() {
	if (props.elements.length <= 20 || props.lazyRender === false) {
		renderedItems.value = props.elements;
		return;
	}

	if (renderedItems.value.length < props.elements.length) {
		renderedItems.value.push(
			...props.elements.slice(renderedItems.value.length, renderedItems.value.length + 5),
		);
		renderAnimationRequest.value = window.requestAnimationFrame(renderItems);
	}
}

function wrappedEmit(
	event: 'selected' | 'dragstart' | 'dragend',
	element: INodeCreateElement,
	$e?: Event,
) {
	if (props.disabled) return;

	emit((event as 'selected') || 'dragstart' || 'dragend', element, $e);
}

function beforeEnter(el: HTMLElement) {
	el.style.height = '0';
}

function enter(el: HTMLElement) {
	el.style.height = `${el.scrollHeight}px`;
}

function beforeLeave(el: HTMLElement) {
	el.style.height = `${el.scrollHeight}px`;
}

function leave(el: HTMLElement) {
	el.style.height = '0';
}

onMounted(() => {
	renderItems();
});

onUnmounted(() => {
	window.cancelAnimationFrame(renderAnimationRequest.value);
	renderedItems.value = [];
});

// Make sure the active item is always visible
// scroll if needed
watch(
	() => props.elements,
	() => {
		window.cancelAnimationFrame(renderAnimationRequest.value);
		renderedItems.value = [];
		renderItems();
	},
);

watch(
	() => props.activeIndex,
	async () => {
		if (props.activeIndex === undefined) return;
		// iteratorItems.value[props.activeIndex]?.scrollIntoView({ block: 'nearest' });
	},
);
</script>

<template>
	<div
		v-if="elements.length > 0"
		:class="$style.itemsRenderer"
		name="accordion"
		@before-enter="beforeEnter"
		@enter="enter"
		@before-leave="beforeLeave"
		@leave="leave"
	>
		<slot />
		<div
			v-for="(item, index) in renderedItems"
			:key="item.uuid"
			data-test-id="item-iterator-item"
			:class="{
				clickable: !disabled,
				[$style[item.type]]: true,
				[$style.active]: activeIndex === index && !disabled,
				[$style.iteratorItem]: true,
			}"
			ref="iteratorItems"
			@click="wrappedEmit('selected', item)"
		>
			<label-item v-if="item.type === 'label'" :item="item" />
			<subcategory-item v-if="item.type === 'subcategory'" :item="item.properties" />

			<node-item
				v-if="item.type === 'node'"
				:nodeType="item.properties"
				:subcategory="item.subcategory"
			/>

			<action-item
				v-if="item.type === 'action'"
				:nodeType="item.properties"
				:action="item.properties"
			/>

			<view-item v-else-if="item.type === 'view'" :view="item.properties" />
		</div>
	</div>
	<div :class="$style.empty" v-else>
		<slot name="empty" />
	</div>
</template>

<style lang="scss" module>
.iteratorItem {
	// Make sure border is fully visible
	margin-left: 1px;
	position: relative;
	&::before {
		content: '';
		position: absolute;
		left: -1px;
		top: 0;
		bottom: 0;
		border-left: 2px solid transparent;
	}
	&:not(.label):not(.category):hover::before {
		border-color: $node-creator-item-hover-border-color;
	}

	// &.active:not(.category)::before {
	// 	border-color: $color-primary !important;
	// }

	// &.category.singleCategory {
	// 	display: none;
	// }
}
.label {
	pointer-events: none;
}
.empty {
	:global([role='alert']) {
		margin: var(--spacing-s) var(--spacing-s) var(--spacing-3xs);
	}
}
.itemsRenderer {
	display: flex;
	flex-direction: column;

	// height: 100%;
	scrollbar-width: none; /* Firefox 64 */
	& > *::-webkit-scrollbar {
		display: none;
	}
}
</style>
