<script lang="ts" setup generic="Key extends string, Item extends ItemWithKey<Key>">
import { useResizeObserver } from '@vueuse/core';
import type { ComponentPublicInstance } from 'vue';
import { computed, onMounted, onBeforeMount, ref, nextTick, watch } from 'vue';

import type { RecycleScrollerProps } from './RecycleScroller.types';
import type { ItemWithKey } from '../../types';

const props = withDefaults(defineProps<RecycleScrollerProps<Key, Item>>(), {
	offset: 2,
});

const emit = defineEmits<{
	/** The list scrolled or a row changed height. The value is the scroll offset in pixels. */
	scroll: [scrollTop: number];
}>();

const wrapperRef = ref<HTMLElement | null>(null);
const scrollerRef = ref<HTMLElement | null>(null);
const itemsRef = ref<HTMLElement | null>(null);
const itemRefs = ref<Record<string, Element | ComponentPublicInstance | null>>({});

const scrollTop = ref(0);
const wrapperHeight = ref(0);
const windowHeight = ref(0);
const footerRef = ref<HTMLElement | null>(null);
const footerHeight = ref(0);

// The footer stays mounted after the last row. A virtual row would leave the
// DOM before a caller could watch the end of the list.
function measureFooter() {
	footerHeight.value = footerRef.value?.offsetHeight ?? 0;
}

useResizeObserver(footerRef, measureFooter);

watch(footerRef, (element) => {
	if (!element) {
		footerHeight.value = 0;
		return;
	}

	void nextTick(measureFooter);
});

/** Cache */

const itemSizeCache = ref<Record<Item[Key], number>>({} as Record<Item[Key], number>);
const itemPositionCache = computed(() => {
	return props.items.reduce<Record<Item[Key], number>>(
		(acc, item, index) => {
			const key = item[props.itemKey];
			const prevItem = props.items[index - 1];
			const prevItemPosition = prevItem ? acc[prevItem[props.itemKey]] : 0;
			const prevItemSize = prevItem
				? (itemSizeCache.value[prevItem[props.itemKey]] ?? props.itemSize)
				: 0;

			acc[key] = prevItemPosition + prevItemSize;

			return acc;
		},
		{} as Record<Item[Key], number>,
	);
});

/** Indexes */

const startIndex = computed(() => {
	const foundIndex =
		props.items.findIndex((item) => {
			const itemPosition = itemPositionCache.value[item[props.itemKey]];

			return itemPosition >= scrollTop.value;
		}) - 1;
	const index = foundIndex - props.offset;

	return index < 0 ? 0 : index;
});

const endIndex = computed(() => {
	const foundIndex = props.items.findIndex((item) => {
		const itemPosition = itemPositionCache.value[item[props.itemKey]];
		const itemSize = itemSizeCache.value[item[props.itemKey]] ?? props.itemSize;

		return itemPosition + itemSize >= scrollTop.value + wrapperHeight.value;
	});
	const index = foundIndex + props.offset;

	return foundIndex === -1 ? props.items.length - 1 : index;
});

const visibleItems = computed(() => {
	return props.items.slice(startIndex.value, endIndex.value + 1);
});

watch(
	() => visibleItems.value,
	(currentValue, previousValue) => {
		const difference = currentValue.filter(
			(currentItem) =>
				!previousValue.find(
					(previousItem) => previousItem[props.itemKey] === currentItem[props.itemKey],
				),
		);

		if (difference.length > 0) {
			updateItemSizeCache(difference);
		}
	},
);

/** Computed sizes and styles */

const contentHeight = computed(() => {
	const lastItem = props.items[props.items.length - 1];
	const lastItemPosition = lastItem ? itemPositionCache.value[lastItem[props.itemKey]] : 0;
	const lastItemSize = lastItem
		? (itemSizeCache.value[lastItem[props.itemKey]] ?? props.itemSize)
		: props.itemSize;

	return lastItemPosition + lastItemSize;
});

const scrollerHeight = computed(() => contentHeight.value + footerHeight.value);

const scrollerStyles = computed(() => ({
	height: `${scrollerHeight.value}px`,
}));

const footerStyles = computed(() => ({
	transform: `translateY(${contentHeight.value}px)`,
}));

const itemsStyles = computed(() => {
	const offset = itemPositionCache.value[props.items[startIndex.value][props.itemKey]];

	return {
		transform: `translateY(${offset}px)`,
	};
});

/** Lifecycle hooks */

onBeforeMount(() => {
	initializeItemSizeCache();
});

onMounted(() => {
	if (wrapperRef.value) {
		wrapperRef.value.addEventListener('scroll', onScroll);
		updateItemSizeCache(visibleItems.value);
	}

	void nextTick(measureFooter);

	window.addEventListener('resize', onWindowResize);
	onWindowResize();
});

/** Event handlers */

/** Build the cache once to avoid O(n²) work from copying it for each item. */
function initializeItemSizeCache() {
	const cache = {} as Record<Item[Key], number>;

	for (const item of props.items) {
		cache[item[props.itemKey]] = props.itemSize;
	}

	itemSizeCache.value = cache;
}

function updateItemSizeCache(items: Array<Record<string, string>>) {
	for (const item of items) {
		onUpdateItemSize(item);
	}
}

function onUpdateItemSize(item: { [key: string]: string }) {
	void nextTick(() => {
		const itemId = item[props.itemKey];
		const itemRef = itemRefs.value[itemId] as HTMLElement;
		// The virtual layout positions an unmeasured row as if it were
		// `itemSize` tall, so that is the height to compensate against — using
		// the raw cache miss here would scroll by NaN and reset to the top.
		const previousSize = itemSizeCache.value[itemId] ?? props.itemSize;
		const size = itemRef ? itemRef.offsetHeight : props.itemSize;
		const difference = size - previousSize;
		// This row's start does not depend on its own height.
		const position = itemPositionCache.value[itemId];
		// Only a row that ends above the viewport shifts the rows in view.
		// Add that difference to scrollTop so those rows stay put.
		// A row inside the viewport, or below it, must leave scrollTop unchanged.
		const aboveViewport =
			position !== undefined &&
			position < scrollTop.value &&
			position + previousSize <= scrollTop.value;

		itemSizeCache.value[itemId] = size;

		if (wrapperRef.value && aboveViewport && difference !== 0) {
			wrapperRef.value.scrollTop = wrapperRef.value.scrollTop + difference;
			scrollTop.value = wrapperRef.value.scrollTop;
		}

		// Row positions change with the measured height. Publish the offset
		// even when the scroll position stays put.
		emit('scroll', scrollTop.value);
	});
}

function onWindowResize() {
	if (wrapperRef.value) {
		wrapperHeight.value = wrapperRef.value.offsetHeight;
		void nextTick(() => {
			updateItemSizeCache(visibleItems.value);
		});
	}

	windowHeight.value = window.innerHeight;
}

function onScroll() {
	if (!wrapperRef.value) {
		return;
	}

	scrollTop.value = wrapperRef.value.scrollTop;
	emit('scroll', scrollTop.value);
}

/** Distance from the top of the list to this row, in pixels. */
function getItemOffset(key: Item[Key]): number | undefined {
	return itemPositionCache.value[key];
}

/** Measured row height, in pixels. An unmeasured row uses `itemSize`. */
function getItemSize(key: Item[Key]): number | undefined {
	if (itemPositionCache.value[key] === undefined) return undefined;
	return itemSizeCache.value[key] ?? props.itemSize;
}

function scrollTo(position: number, behavior: ScrollBehavior = 'auto') {
	if (!wrapperRef.value) {
		return;
	}

	wrapperRef.value.scrollTo({ top: position, behavior });
	scrollTop.value = wrapperRef.value.scrollTop;
	emit('scroll', scrollTop.value);
}

function scrollToKey(key: Item[Key], behavior: ScrollBehavior = 'auto') {
	const position = itemPositionCache.value[key];
	if (position === undefined) {
		return;
	}

	scrollTo(position, behavior);
}

defineExpose({ scrollToKey, scrollTo, scrollTop, getItemOffset, getItemSize });
</script>

<template>
	<div ref="wrapperRef" class="recycle-scroller-wrapper">
		<div ref="scrollerRef" class="recycle-scroller" :style="scrollerStyles">
			<div ref="itemsRef" class="recycle-scroller-items-wrapper" :style="itemsStyles">
				<div
					v-for="item in visibleItems"
					:key="item[itemKey]"
					:ref="(element) => (itemRefs[`${item[itemKey]}`] = element)"
					class="recycle-scroller-item"
				>
					<slot :item="item" :update-item-size="onUpdateItemSize" />
				</div>
			</div>
			<div
				v-if="$slots.footer"
				ref="footerRef"
				class="recycle-scroller-footer"
				:style="footerStyles"
			>
				<slot name="footer" />
			</div>
		</div>
	</div>
</template>

<style lang="scss">
.recycle-scroller-wrapper {
	height: 100%;
	width: 100%;
	overflow: auto;
	flex: 1 1 auto;
}

.recycle-scroller {
	width: 100%;
	display: block;
	position: relative;
}

.recycle-scroller-items-wrapper {
	position: absolute;
	width: 100%;
}

.recycle-scroller-item {
	display: flex;
	position: relative;
	width: 100%;
}

.recycle-scroller-footer {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
}
</style>
