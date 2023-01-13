<script lang="ts">
import { computed, defineComponent, onMounted, onBeforeMount, ref, reactive, PropType } from 'vue';

export default defineComponent({
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

		const scrollTop = ref(0);
		const wrapperHeight = ref(0);
		const windowHeight = ref(0);

		const itemCount = computed(() => props.items.length);

		/**
		 * Cache
		 */

		const itemSizeCache = reactive<Record<string, number>>({});
		const itemPositionCache = computed(() => {
			return props.items.reduce<Record<string, number>>((acc, item, index) => {
				const key = item[props.itemKey];
				const prevItem = props.items[index - 1];
				const prevItemPosition = prevItem ? acc[prevItem[props.itemKey]] : 0;
				const prevItemSize = prevItem ? itemSizeCache[prevItem[props.itemKey]] : 0;

				acc[key] = prevItemPosition + prevItemSize;

				return acc;
			}, {});
		});

		function initializeItemSizeCache() {
			props.items.forEach((item) => (itemSizeCache[item[props.itemKey]] = props.itemSize));
		}

		function setItemSize(itemKey: string, size: number) {
			itemSizeCache[itemKey] = size;
		}

		/**
		 * Event handlers
		 */

		function onWindowResize() {
			if (wrapperRef.value) {
				wrapperHeight.value = wrapperRef.value.clientHeight;
			}

			windowHeight.value = window.innerHeight;
		}

		function onScroll() {
			if (!wrapperRef.value) {
				return;
			}

			scrollTop.value = wrapperRef.value.scrollTop;
		}

		/**
		 * Indexes
		 */

		const startIndex = computed(() => {
			const index =
				props.items.findIndex((item) => {
					const key = item[props.itemKey];
					const position = itemPositionCache.value[key];

					return position >= scrollTop.value;
				}) - props.offset;

			return index < 0 ? 0 : index;
		});

		const endIndex = computed(() => {
			const foundIndex = props.items.findIndex((item) => {
				const key = item[props.itemKey];
				const position = itemPositionCache.value[key];

				return position >= scrollTop.value + wrapperHeight.value;
			});
			const index = foundIndex === -1 ? props.items.length - 1 : foundIndex + props.offset;

			return index >= props.items.length ? props.items.length - 1 : index;
		});

		const visibleItems = computed(() => {
			return props.items.slice(startIndex.value, endIndex.value + 1);
		});

		/**
		 * Computed sizes and styles
		 */

		const scrollerHeight = computed(() => itemCount.value * props.itemSize);

		const scrollerStyles = computed(() => ({
			height: `${scrollerHeight.value}px`,
		}));

		function itemStyles(itemKey: string) {
			const offset = itemPositionCache.value[itemKey];
			return {
				transform: `translateY(${offset}px)`,
			};
		}

		/**
		 * Lifecycle hooks
		 */

		onBeforeMount(() => {
			initializeItemSizeCache();
		});

		onMounted(() => {
			if (wrapperRef.value) {
				wrapperRef.value.addEventListener('scroll', onScroll);
			}

			window.addEventListener('resize', onWindowResize);
			onWindowResize();
		});

		return {
			itemCount,
			itemsVisible: visibleItems,
			itemStyles,
			scrollerStyles,
			scrollerScrollTop: scrollTop,
			scrollerRef,
			wrapperRef,
			setItemSize,
		};
	},
});
</script>

<template>
	<div class="recycle-scroller-wrapper" ref="wrapperRef">
		<div class="recycle-scroller" ref="scrollerRef" :style="scrollerStyles">
			<div
				class="recycle-scroller-item"
				v-for="item in itemsVisible"
				:key="item[itemKey]"
				:style="itemStyles(item[itemKey])"
			>
				<slot :item="item" :setItemSize="setItemSize" />
			</div>
		</div>
	</div>
</template>

<style lang="scss">
.recycle-scroller-wrapper {
	height: 100%;
	width: 100%;
	overflow: auto;
}

.recycle-scroller {
	height: 100%;
	width: 100%;
	display: block;
	position: relative;
}

.recycle-scroller-item {
	position: absolute;
	width: 100%;
}
</style>
