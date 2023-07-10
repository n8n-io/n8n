<script lang="ts">
/* eslint-disable @typescript-eslint/no-use-before-define */

import type { PropType, ComponentPublicInstance } from 'vue';
import { computed, defineComponent, onMounted, onBeforeMount, ref, nextTick, watch } from 'vue';

export default defineComponent({
	name: 'n8n-recycle-scroller',
	props: {
		itemSize: {
			type: Number,
			required: true,
		},
		items: {
			type: Array as PropType<Array<Record<string, string>>>,
			required: true,
		},
		itemKey: {
			type: String,
			required: true,
		},
		offset: {
			type: Number,
			default: 2,
		},
	},
	setup(props) {
		const wrapperRef = ref<HTMLElement | null>(null);
		const scrollerRef = ref<HTMLElement | null>(null);
		const itemsRef = ref<HTMLElement | null>(null);
		const itemRefs = ref<Record<string, Element | ComponentPublicInstance | null>>({});

		const scrollTop = ref(0);
		const wrapperHeight = ref(0);
		const windowHeight = ref(0);

		const itemCount = computed(() => props.items.length);

		/**
		 * Cache
		 */

		const itemSizeCache = ref<Record<string, number>>({});
		const itemPositionCache = computed(() => {
			return props.items.reduce<Record<string, number>>((acc, item, index) => {
				const key = item[props.itemKey];
				const prevItem = props.items[index - 1];
				const prevItemPosition = prevItem ? acc[prevItem[props.itemKey]] : 0;
				const prevItemSize = prevItem ? itemSizeCache.value[prevItem[props.itemKey]] : 0;

				acc[key] = prevItemPosition + prevItemSize;

				return acc;
			}, {});
		});

		/**
		 * Indexes
		 */

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
				const itemSize = itemSizeCache.value[item[props.itemKey]];

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

		/**
		 * Computed sizes and styles
		 */

		const scrollerHeight = computed(() => {
			const lastItem = props.items[props.items.length - 1];
			const lastItemPosition = lastItem ? itemPositionCache.value[lastItem[props.itemKey]] : 0;
			const lastItemSize = lastItem ? itemSizeCache.value[lastItem[props.itemKey]] : props.itemSize;

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

		/**
		 * Lifecycle hooks
		 */

		onBeforeMount(() => {
			initializeItemSizeCache();
		});

		onMounted(() => {
			if (wrapperRef.value) {
				wrapperRef.value.addEventListener('scroll', onScroll);
				updateItemSizeCache(visibleItems.value);
			}

			window.addEventListener('resize', onWindowResize);
			onWindowResize();
		});

		/**
		 * Event handlers
		 */

		function initializeItemSizeCache() {
			props.items.forEach((item) => {
				itemSizeCache.value = {
					...itemSizeCache.value,
					[item[props.itemKey]]: props.itemSize,
				};
			});
		}

		function updateItemSizeCache(items: Array<Record<string, string>>) {
			for (const item of items) {
				onUpdateItemSize(item);
			}
		}

		function onUpdateItemSize(item: { [key: string]: string }) {
			nextTick(() => {
				const itemId = item[props.itemKey];
				const itemRef = itemRefs.value[itemId] as HTMLElement;
				const previousSize = itemSizeCache.value[itemId];
				const size = itemRef ? itemRef.offsetHeight : props.itemSize;
				const difference = size - previousSize;

				itemSizeCache.value = {
					...itemSizeCache.value,
					[item[props.itemKey]]: size,
				};

				if (wrapperRef.value && scrollTop.value) {
					wrapperRef.value.scrollTop = wrapperRef.value.scrollTop + difference;
					scrollTop.value = wrapperRef.value.scrollTop;
				}
			});
		}

		function onWindowResize() {
			if (wrapperRef.value) {
				wrapperHeight.value = wrapperRef.value.offsetHeight;
				nextTick(() => {
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
		}

		return {
			startIndex,
			endIndex,
			itemCount,
			itemSizeCache,
			itemPositionCache,
			itemsVisible: visibleItems,
			itemsStyles,
			scrollerStyles,
			scrollerScrollTop: scrollTop,
			scrollerRef,
			wrapperRef,
			itemsRef,
			itemRefs,
			onUpdateItemSize,
		};
	},
});
</script>

<template>
	<div class="recycle-scroller-wrapper" ref="wrapperRef">
		<div class="recycle-scroller" :style="scrollerStyles" ref="scrollerRef">
			<div class="recycle-scroller-items-wrapper" :style="itemsStyles" ref="itemsRef">
				<div
					v-for="item in itemsVisible"
					:key="item[itemKey]"
					class="recycle-scroller-item"
					:ref="(element) => (itemRefs[item[itemKey]] = element)"
				>
					<slot :item="item" :updateItemSize="onUpdateItemSize" />
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
