<script setup lang="ts">
import type { INodeCreateElement } from '@/Interface';
import { onMounted, watch, onUnmounted, ref, computed } from 'vue';

import { useKeyboardNavigation } from '../composables/useKeyboardNavigation';
import NodeItem from '../ItemTypes/NodeItem.vue';
import SubcategoryItem from '../ItemTypes/SubcategoryItem.vue';
import LabelItem from '../ItemTypes/LabelItem.vue';
import ActionItem from '../ItemTypes/ActionItem.vue';
import ViewItem from '../ItemTypes/ViewItem.vue';
export interface Props {
	elements: INodeCreateElement[];
	activeIndex?: number;
	disabled?: boolean;
	lazyRender?: boolean;
}

const LAZY_LOAD_THRESHOLD = 20;
const LAZY_LOAD_ITEMS_PER_TICK = 5;
const props = withDefaults(defineProps<Props>(), {
	elements: () => [],
	lazyRender: true,
});

const emit = defineEmits<{
	(event: 'selected', element: INodeCreateElement, $e?: Event): void;
	(event: 'dragstart', element: INodeCreateElement, $e: Event): void;
	(event: 'dragend', element: INodeCreateElement, $e: Event): void;
}>();

const renderedItems = ref<INodeCreateElement[]>([]);
const renderAnimationRequest = ref<number>(0);

const activeItemId = computed(() => useKeyboardNavigation()?.activeItemId);

// Lazy render large items lists to prevent the browser from freezing
// when loading many items.
function renderItems() {
	if (props.elements.length <= LAZY_LOAD_THRESHOLD || props.lazyRender === false) {
		renderedItems.value = props.elements;
		return;
	}

	if (renderedItems.value.length < props.elements.length) {
		renderedItems.value.push(
			...props.elements.slice(
				renderedItems.value.length,
				renderedItems.value.length + LAZY_LOAD_ITEMS_PER_TICK,
			),
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
			v-for="item in elements"
			:key="item.uuid"
			data-test-id="item-iterator-item"
			:class="{
				clickable: !disabled,
				[$style.active]: activeItemId === item.uuid,
				[$style.iteratorItem]: true,
				[$style[item.type]]: true,
			}"
			ref="iteratorItems"
			:data-keyboard-nav-type="item.type !== 'label' ? item.type : undefined"
			:data-keyboard-nav-id="item.uuid"
			@click="wrappedEmit('selected', item)"
		>
			<template v-if="renderedItems.includes(item)">
				<label-item v-if="item.type === 'label'" :item="item" />
				<subcategory-item v-if="item.type === 'subcategory'" :item="item.properties" />

				<node-item
					v-if="item.type === 'node'"
					:nodeType="item.properties"
					:active="true"
					:subcategory="item.subcategory"
				/>

				<action-item
					v-if="item.type === 'action'"
					:nodeType="item.properties"
					:action="item.properties"
					:active="true"
				/>

				<view-item
					v-else-if="item.type === 'view'"
					:view="item.properties"
					:class="$style.viewItem"
				/>
			</template>

			<n8n-loading :loading="true" :rows="1" variant="p" :class="$style.itemSkeleton" v-else />
		</div>
	</div>
	<div :class="$style.empty" v-else>
		<slot name="empty" />
	</div>
</template>

<style lang="scss" module>
.itemSkeleton {
	height: 50px;
}
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

	&.active:not(.category)::before {
		border-color: $color-primary;
	}
}
.empty {
	:global([role='alert']) {
		margin: var(--spacing-xs) var(--spacing-s);
	}
}
.itemsRenderer {
	display: flex;
	flex-direction: column;

	scrollbar-width: none; /* Firefox 64 */
	& > *::-webkit-scrollbar {
		display: none;
	}
}
.view {
	margin-top: var(--spacing-s);
	padding-top: var(--spacing-xs);
	position: relative;

	&::after {
		content: '';
		position: absolute;
		left: var(--spacing-s);
		right: var(--spacing-s);
		top: 0;
		margin: auto;
		bottom: 0;
		border-top: 1px solid var(--color-foreground-base);
	}
}
</style>
