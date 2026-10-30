<script lang="ts" setup generic="Key extends string, Item extends ItemWithKey<Key>">
import type { ComponentPublicInstance } from 'vue';
import { computed, onMounted, onBeforeMount, onBeforeUnmount, ref, nextTick, watch } from 'vue';

import type { RecycleScrollerProps } from './RecycleScroller.types';
import type { ItemWithKey } from '../../types';
import { getScrollParent } from '../../utils/scrollParent';

const props = withDefaults(defineProps<RecycleScrollerProps<Key, Item>>(), {
	offset: 2,
	useScrollParent: false,
});

const wrapperRef = ref<HTMLElement | null>(null);
// The element that scrolls: the wrapper itself, or an ancestor with `useScrollParent`.
const scrollContainer = ref<HTMLElement | null>(null);
const scrollerRef = ref<HTMLElement | null>(null);
const itemsRef = ref<HTMLElement | null>(null);
const itemRefs = ref<Record<string, Element | ComponentPublicInstance | null>>({});

const scrollTop = ref(0);
const wrapperHeight = ref(0);
const windowHeight = ref(0);

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

const scrollerHeight = computed(() => {
	const lastItem = props.items[props.items.length - 1];
	const lastItemPosition = lastItem ? itemPositionCache.value[lastItem[props.itemKey]] : 0;
	const lastItemSize = lastItem
		? (itemSizeCache.value[lastItem[props.itemKey]] ?? props.itemSize)
		: props.itemSize;

	return lastItemPosition + lastItemSize;
});

const scrollerStyles = computed(() => ({
	height: `${scrollerHeight.value}px`,
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
	scrollContainer.value = props.useScrollParent
		? getScrollParent(wrapperRef.value)
		: wrapperRef.value;
	getScrollEventTarget()?.addEventListener('scroll', onScroll);
	if (scrollContainer.value) {
		updateItemSizeCache(visibleItems.value);
	}

	window.addEventListener('resize', onWindowResize);
	onWindowResize();
});

onBeforeUnmount(() => {
	getScrollEventTarget()?.removeEventListener('scroll', onScroll);
	window.removeEventListener('resize', onWindowResize);
});

/** Scroll position helpers */

// The document scroller fires its scroll events on the window.
function getScrollEventTarget(): HTMLElement | Window | null {
	return scrollContainer.value === document.scrollingElement ? window : scrollContainer.value;
}

// Distance from the top of the scroll container content to the top of the list.
function getListOffset(): number {
	if (!props.useScrollParent || !scrollContainer.value || !scrollerRef.value) {
		return 0;
	}

	return (
		scrollerRef.value.getBoundingClientRect().top -
		scrollContainer.value.getBoundingClientRect().top +
		scrollContainer.value.scrollTop
	);
}

function readScrollTop(): number {
	if (!scrollContainer.value) {
		return 0;
	}

	return Math.max(0, scrollContainer.value.scrollTop - getListOffset());
}

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

		itemSizeCache.value[itemId] = size;

		if (scrollContainer.value && scrollTop.value) {
			scrollContainer.value.scrollTop = scrollContainer.value.scrollTop + difference;
			scrollTop.value = readScrollTop();
		}
	});
}

function onWindowResize() {
	if (scrollContainer.value) {
		wrapperHeight.value = props.useScrollParent
			? scrollContainer.value.clientHeight
			: scrollContainer.value.offsetHeight;
		void nextTick(() => {
			updateItemSizeCache(visibleItems.value);
		});
	}

	windowHeight.value = window.innerHeight;
}

function onScroll() {
	scrollTop.value = readScrollTop();
}

function scrollTo(position: number) {
	if (!scrollContainer.value) {
		return;
	}

	scrollContainer.value.scrollTop = position + getListOffset();
	scrollTop.value = readScrollTop();
}

function scrollToKey(key: Item[Key]) {
	const position = itemPositionCache.value[key];
	if (position === undefined) {
		return;
	}

	scrollTo(position);
}

defineExpose({ scrollToKey, scrollTo, scrollTop });
</script>

<template>
	<div
		ref="wrapperRef"
		:class="[
			'recycle-scroller-wrapper',
			{ 'recycle-scroller-wrapper--scroll-parent': useScrollParent },
		]"
	>
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

.recycle-scroller-wrapper--scroll-parent {
	height: auto;
	overflow: visible;
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
</style>
