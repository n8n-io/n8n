<script setup lang="ts" generic="T = string, D = never">
import { useDebounceFn } from '@vueuse/core';
import { computed, nextTick, ref, useId, watch } from 'vue';

import type { DropdownMenuItemProps, DropdownMenuSlots } from './DropdownMenu.types';
import {
	getItemDomId as getSearchableItemDomId,
	getNextValidIndex,
	hasSubMenu,
	isInputCursorAtEnd,
	isInputCursorAtStart,
	scrollHighlightedItemIntoView,
} from './DropdownMenu.utils';
import N8nDropdownMenuSearch from './DropdownMenuSearch.vue';

defineOptions({ name: 'N8nDropdownMenuSearchableContent' });

const props = withDefaults(
	defineProps<{
		open: boolean;
		items: Array<DropdownMenuItemProps<T, D>>;
		searchPlaceholder?: string;
		searchDebounce?: number;
	}>(),
	{
		searchPlaceholder: 'Search...',
		searchDebounce: 0,
	},
);

const emit = defineEmits<{
	select: [value: T];
	search: [searchTerm: string, itemId?: T];
	close: [];
	'submenu:toggle': [itemId: T, open: boolean];
}>();

const slots = defineSlots<
	Pick<DropdownMenuSlots<T, D>, 'search-prefix' | 'search-suffix'> & {
		default?: (props: {
			highlightedIndex: number;
			openSubMenuIndex: number;
			onSubMenuOpenChange: (index: number, open: boolean) => void;
			onItemHover: (index: number) => void;
			resetNavigation: () => void;
			getItemDomId: (index: number) => string;
		}) => void;
	}
>();

const itemsContainerRef = ref<HTMLElement | null>(null);
const searchRef = ref<{ focus: (options?: FocusOptions) => void } | null>(null);
const searchTerm = ref('');
const openSubMenuIndex = ref(-1);
const instanceId = useId();
let searchSequence = 0;

const highlightedIndex = ref(-1);

const refocusSearchInput = () => {
	searchRef.value?.focus({ preventScroll: true });
};

const scrollHighlightedItem = () => {
	scrollHighlightedItemIntoView(itemsContainerRef.value);
	// Reka/browser focus work can reset the scroll after Vue's update,
	// so re-apply it on the next frame.
	requestAnimationFrame(() => {
		scrollHighlightedItemIntoView(itemsContainerRef.value);
		refocusSearchInput();
	});
};

const navigate = async (direction: 'up' | 'down') => {
	closeOpenSubMenu();

	if (direction === 'down') {
		highlightedIndex.value = getNextValidIndex(props.items, highlightedIndex.value, 1);
	} else {
		highlightedIndex.value = getNextValidIndex(props.items, highlightedIndex.value, -1);
	}

	await nextTick();
	scrollHighlightedItem();
};

const openHighlightedSubMenu = () => {
	if (highlightedIndex.value < 0) return;

	const item = props.items[highlightedIndex.value];
	if (item && !item.disabled && hasSubMenu(item)) {
		handleSubMenuOpenChange(highlightedIndex.value, true);
	}
};

const resetHighlightedItem = () => {
	highlightedIndex.value = -1;
};

const updateHighlightedItem = (
	newItems: Array<DropdownMenuItemProps<T, D>>,
	oldItems: Array<DropdownMenuItemProps<T, D>>,
) => {
	if (highlightedIndex.value < 0) return;

	const highlightedItem = oldItems[highlightedIndex.value];
	const newIndex = newItems.findIndex((item) => item.id === highlightedItem?.id);
	highlightedIndex.value = newItems[newIndex]?.disabled ? -1 : newIndex;
};

const debouncedEmitSearch = useDebounceFn((term: string, sequence: number) => {
	if (sequence === searchSequence) {
		emit('search', term);
	}
}, props.searchDebounce);

const handleSearchUpdate = async (value: string) => {
	searchTerm.value = value;
	searchSequence++;
	await debouncedEmitSearch(value, searchSequence);
};

const resetSearch = () => {
	searchSequence++;

	if (searchTerm.value === '') return;

	searchTerm.value = '';
	emit('search', '');
};

const resetNavigation = () => {
	resetHighlightedItem();
	openSubMenuIndex.value = -1;
};

const handleSubMenuOpenChange = (index: number, open: boolean) => {
	const item = props.items[index];
	if (item) {
		emit('submenu:toggle', item.id, open);
	}

	if (open) {
		openSubMenuIndex.value = index;
		resetHighlightedItem();
	} else if (openSubMenuIndex.value === index) {
		openSubMenuIndex.value = -1;
		void nextTick(() => {
			highlightedIndex.value = index;
			refocusSearchInput();
		});
	}
};

const selectHighlightedItem = () => {
	if (highlightedIndex.value < 0) return;

	const item = props.items[highlightedIndex.value];
	if (!item || item.disabled) return;

	if (hasSubMenu(item)) {
		handleSubMenuOpenChange(highlightedIndex.value, true);
	} else {
		emit('select', item.id);
		emit('close');
	}
};

const closeOpenSubMenu = () => {
	if (openSubMenuIndex.value >= 0) {
		handleSubMenuOpenChange(openSubMenuIndex.value, false);
	}
};

const handleItemHover = (index: number) => {
	const item = props.items[index];
	if (!item || item.disabled) return;

	highlightedIndex.value = index;

	requestAnimationFrame(() => {
		refocusSearchInput();
	});
};

const getItemDomId = (index: number) => getSearchableItemDomId(instanceId, index);

const activeDescendantId = computed(() =>
	highlightedIndex.value >= 0 ? getItemDomId(highlightedIndex.value) : undefined,
);

const handleSearchKeydown = (event: KeyboardEvent) => {
	switch (event.key) {
		case 'Escape':
			event.preventDefault();
			emit('close');
			break;

		case 'Tab':
			emit('close');
			break;

		case 'ArrowDown':
			event.preventDefault();
			void navigate('down');
			break;

		case 'ArrowUp':
			event.preventDefault();
			if (highlightedIndex.value > 0) {
				void navigate('up');
			}
			break;

		case 'ArrowRight':
			if (!(event.target instanceof HTMLInputElement) || isInputCursorAtEnd(event)) {
				event.preventDefault();
				openHighlightedSubMenu();
			}
			break;

		case 'ArrowLeft':
			if (!(event.target instanceof HTMLInputElement) || isInputCursorAtStart(event)) {
				event.preventDefault();
				closeOpenSubMenu();
			}
			break;

		case 'Enter':
			event.preventDefault();
			selectHighlightedItem();
			break;
	}
};

watch(
	() => props.open,
	(open) => {
		if (open) {
			void nextTick(() => {
				refocusSearchInput();
			});
		} else {
			resetNavigation();
			resetSearch();
		}
	},
	{ immediate: true },
);

watch(
	() => props.items,
	(newItems, oldItems) => {
		updateHighlightedItem(newItems, oldItems);
	},
);

defineExpose({ resetNavigation });
</script>

<template>
	<div :class="$style.content" @keydown.capture="handleSearchKeydown">
		<N8nDropdownMenuSearch
			ref="searchRef"
			:model-value="searchTerm"
			:placeholder="searchPlaceholder"
			:aria-active-descendant="activeDescendantId"
			@update:model-value="handleSearchUpdate"
		>
			<template v-if="slots['search-prefix']" #search-prefix>
				<slot name="search-prefix" />
			</template>
			<template v-if="slots['search-suffix']" #search-suffix>
				<slot name="search-suffix" />
			</template>
		</N8nDropdownMenuSearch>

		<div ref="itemsContainerRef" :class="$style.items">
			<slot
				:highlighted-index="highlightedIndex"
				:open-sub-menu-index="openSubMenuIndex"
				:on-sub-menu-open-change="handleSubMenuOpenChange"
				:on-item-hover="handleItemHover"
				:reset-navigation="resetHighlightedItem"
				:get-item-dom-id="getItemDomId"
			/>
		</div>
	</div>
</template>

<style module lang="scss">
.content {
	display: flex;
	flex-direction: column;
	max-height: inherit;
}

.items {
	min-height: 0;
	overflow-y: auto;
	scroll-padding-bottom: var(--spacing--sm);
	scrollbar-width: none;
	mask-image: linear-gradient(
		to bottom,
		black 0,
		black calc(100% - var(--spacing--sm)),
		transparent 100%
	);

	&::-webkit-scrollbar {
		display: none;
	}
}
</style>
