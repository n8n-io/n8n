<script setup lang="ts" generic="T = string">
import { useDebounceFn } from '@vueuse/core';
import {
	DropdownMenuRoot,
	DropdownMenuTrigger,
	DropdownMenuPortal,
	DropdownMenuContent,
} from 'reka-ui';
import { computed, ref, watch, useCssModule, nextTick } from 'vue';

import Icon from '@n8n/design-system/components/N8nIcon/Icon.vue';
import N8nLoading from '@n8n/design-system/v2/components/Loading/Loading.vue';

import { isAlign, isSide } from './DropdownMenu.typeguards';
import type { DropdownMenuProps, DropdownMenuSlots } from './DropdownMenu.types';
import N8nDropdownMenuItem from './DropdownMenuItem.vue';
import N8nDropdownMenuSearch from './DropdownMenuSearch.vue';

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<DropdownMenuProps<T>>(), {
	placement: 'bottom',
	trigger: 'click',
	activatorIcon: () => ({ type: 'icon', value: 'ellipsis' }),
	disabled: false,
	teleported: true,
	loading: false,
	loadingItemCount: 3,
	searchable: false,
	showSearchIcon: true,
	searchPlaceholder: 'Search...',
	searchDebounce: 300,
});

const emit = defineEmits<{
	'update:modelValue': [open: boolean];
	select: [value: T];
	search: [searchTerm: string, itemId?: T];
}>();

const slots = defineSlots<DropdownMenuSlots<T>>();
const $style = useCssModule();

// Handle controlled/uncontrolled state
const internalOpen = ref(props.defaultOpen ?? false);
const isControlled = computed(() => props.modelValue !== undefined);

const searchRef = ref<{ focus: () => void } | null>(null);
const contentRef = ref<InstanceType<typeof DropdownMenuContent> | null>(null);
const searchTerm = ref('');

// Track highlighted item and open sub-menu index for keyboard navigation
const highlightedIndex = ref(-1);
const openSubMenuIndex = ref(-1);

const openState = computed(() => (isControlled.value ? internalOpen.value : undefined));

const placementParts = computed(() => {
	const [sideValue, alignValue] = props.placement.split('-');
	return {
		side: isSide(sideValue) ? sideValue : 'bottom',
		align: isAlign(alignValue) ? alignValue : 'center',
	};
});

const contentStyle = computed(() => {
	if (props.maxHeight) {
		const maxHeightValue =
			typeof props.maxHeight === 'number' ? `${props.maxHeight}px` : props.maxHeight;
		return { maxHeight: maxHeightValue, overflowY: 'auto' };
	}
	return {};
});

const handleOpenChange = (open: boolean) => {
	internalOpen.value = open;
	emit('update:modelValue', open);

	if (props.searchable) {
		if (open) {
			void nextTick(() => {
				searchRef.value?.focus();
			});
		} else {
			searchTerm.value = '';
			emit('search', '');
		}
	}
};

const debouncedEmitSearch = useDebounceFn((term: string) => {
	emit('search', term);
}, props.searchDebounce);

const handleSearchUpdate = async (value: string) => {
	searchTerm.value = value;
	await debouncedEmitSearch(value);
};

// Find the next valid index for navigation, skipping disabled items
const getNextValidIndex = (current: number, direction: 1 | -1): number => {
	const items = props.items;
	let next = current + direction;

	while (next >= 0 && next < items.length && items[next].disabled) {
		next += direction;
	}

	if (next >= 0 && next < items.length) {
		return next;
	}

	if (direction === -1) {
		return -1;
	}

	return current;
};

// Handle navigation from search input
const handleNavigate = (direction: 'up' | 'down') => {
	if (direction === 'down') {
		if (highlightedIndex.value === -1) {
			highlightedIndex.value = getNextValidIndex(-1, 1);
		} else {
			highlightedIndex.value = getNextValidIndex(highlightedIndex.value, 1);
		}
	} else {
		if (highlightedIndex.value <= 0) {
			highlightedIndex.value = -1;
		} else {
			highlightedIndex.value = getNextValidIndex(highlightedIndex.value, -1);
		}
	}
};

const hasSubMenu = (item: (typeof props.items)[number]) => {
	return (item.children && item.children.length > 0) || item.loading || item.searchable;
};

const handleEnter = () => {
	if (highlightedIndex.value >= 0) {
		const item = props.items[highlightedIndex.value];
		if (item && !item.disabled) {
			if (hasSubMenu(item)) {
				openSubMenuIndex.value = highlightedIndex.value;
			} else {
				emit('select', item.id);
				close();
			}
		}
	}
};

const handleArrowRight = () => {
	if (highlightedIndex.value >= 0) {
		const item = props.items[highlightedIndex.value];
		if (item && !item.disabled && hasSubMenu(item)) {
			openSubMenuIndex.value = highlightedIndex.value;
		}
	}
};

const handleArrowLeft = () => {
	if (openSubMenuIndex.value >= 0) {
		openSubMenuIndex.value = -1;
	}
};

const handleContentKeydown = (event: KeyboardEvent) => {
	// Non-searchable menus use reka-ui's built-in roving focus
	if (!props.searchable) return;

	if (event.key === 'Enter' && highlightedIndex.value >= 0) {
		event.preventDefault();
		handleEnter();
	}

	if (event.key === 'ArrowRight' && highlightedIndex.value >= 0) {
		event.preventDefault();
		handleArrowRight();
	}

	if (event.key === 'ArrowLeft' && openSubMenuIndex.value >= 0) {
		event.preventDefault();
		handleArrowLeft();
	}
};

const handleSubMenuOpenChange = (index: number, open: boolean) => {
	if (open) {
		openSubMenuIndex.value = index;
	} else if (openSubMenuIndex.value === index) {
		openSubMenuIndex.value = -1;
		// Return focus appropriately when sub-menu closes
		void nextTick(() => {
			if (props.searchable && searchRef.value) {
				// For searchable root menus, use virtual focus mode
				highlightedIndex.value = index;
				searchRef.value.focus();
			} else {
				// For non-searchable menus, focus the item directly
				// and let reka-ui handle highlighting via [data-highlighted]
				const contentEl = contentRef.value?.$el as HTMLElement | undefined;
				const menuItems = contentEl?.querySelectorAll('[role="menuitem"]');
				const targetItem = menuItems?.[index] as HTMLElement | undefined;
				targetItem?.focus();
			}
		});
	}
};

const handleItemSelect = (value: T) => {
	emit('select', value);
	close();
};

const handleItemSearch = (term: string, itemId: T) => {
	emit('search', term, itemId);
};

const open = () => {
	internalOpen.value = true;
	emit('update:modelValue', true);
};

const close = () => {
	internalOpen.value = false;
	emit('update:modelValue', false);
};

watch(
	() => props.modelValue,
	(newValue) => {
		if (newValue !== undefined) {
			internalOpen.value = newValue;
		}
	},
	{ immediate: true },
);

watch(
	() => props.items,
	() => {
		highlightedIndex.value = -1;
	},
);

watch(internalOpen, (isOpen) => {
	if (!isOpen) {
		highlightedIndex.value = -1;
		openSubMenuIndex.value = -1;
	}
});

defineExpose({ open, close });
</script>

<template>
	<DropdownMenuRoot :open="openState" @update:open="handleOpenChange">
		<!-- Use as-child only when custom trigger slot is provided -->
		<DropdownMenuTrigger v-if="slots.trigger" as-child :disabled="disabled">
			<slot name="trigger" />
		</DropdownMenuTrigger>
		<!-- Default trigger without as-child for proper attribute forwarding -->
		<DropdownMenuTrigger v-else :class="$style.activator" :disabled="disabled">
			<Icon v-if="activatorIcon?.type === 'icon'" :icon="activatorIcon.value" />
			<span v-else-if="activatorIcon?.type === 'emoji'" :class="$style['activator-emoji']">
				{{ activatorIcon.value }}
			</span>
		</DropdownMenuTrigger>

		<component :is="teleported ? DropdownMenuPortal : 'template'">
			<DropdownMenuContent
				:id="id"
				ref="contentRef"
				:class="[$style.content, extraPopperClass]"
				:side="placementParts.side"
				:align="placementParts.align"
				:side-offset="5"
				:style="contentStyle"
				@keydown="handleContentKeydown"
			>
				<slot v-if="slots.content" name="content" />
				<template v-else>
					<N8nDropdownMenuSearch
						v-if="searchable"
						ref="searchRef"
						:model-value="searchTerm"
						:placeholder="searchPlaceholder"
						:show-icon="showSearchIcon"
						@update:model-value="handleSearchUpdate"
						@key:escape="close"
						@key:navigate="handleNavigate"
						@key:arrow-right="handleArrowRight"
						@key:arrow-left="handleArrowLeft"
						@key:enter="handleEnter"
					/>

					<template v-if="loading">
						<slot name="loading">
							<div :class="$style['loading-container']">
								<N8nLoading
									v-for="i in loadingItemCount"
									:key="i"
									:rows="1"
									:class="$style['loading-item']"
									variant="p"
								/>
							</div>
						</slot>
					</template>
					<template v-else-if="items.length === 0">
						<slot name="empty">
							<div :class="$style['empty-state']">No items</div>
						</slot>
					</template>
					<template v-else>
						<template v-for="(item, index) in items" :key="item.id">
							<slot name="item" :item="item">
								<N8nDropdownMenuItem
									v-bind="item"
									:highlighted="highlightedIndex === index"
									:sub-menu-open="openSubMenuIndex === index"
									@select="handleItemSelect"
									@search="handleItemSearch"
									@update:sub-menu-open="(open: boolean) => handleSubMenuOpenChange(index, open)"
								>
									<template v-if="slots['item-leading']" #item-leading="{ ui }">
										<slot name="item-leading" :item="item" :ui="ui" />
									</template>
									<template v-if="slots['item-trailing']" #item-trailing="{ ui }">
										<slot name="item-trailing" :item="item" :ui="ui" />
									</template>
								</N8nDropdownMenuItem>
							</slot>
						</template>
					</template>
				</template>
			</DropdownMenuContent>
		</component>
	</DropdownMenuRoot>
</template>

<style module>
.activator {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: var(--spacing--xl);
	height: var(--spacing--xl);
	padding: 0;
	border: none;
	border-radius: var(--radius);
	background-color: transparent;
	color: var(--color--text);
	cursor: pointer;
	outline: none;

	&:hover {
		background-color: var(--color--background);
	}

	&:focus-visible {
		box-shadow: 0 0 0 var(--spacing--5xs) var(--color--primary);
	}

	&[data-disabled] {
		color: var(--color--text--tint-1);
		cursor: not-allowed;
	}
}

.activator-emoji {
	font-size: var(--font-size--md);
	line-height: 1;
}

.content {
	min-width: 160px;
	padding-top: var(--spacing--4xs);
	border-radius: var(--radius);
	border: var(--border);
	background-color: var(--color--background--light-2);
	box-shadow: var(--shadow);
	/**
	 * TODO: do we have a better way to manage z-indexes globally?
	 */
	z-index: 999999;
}

.loading-container {
	padding: var(--spacing--4xs);
}

.loading-item {
	margin-bottom: var(--spacing--4xs);

	&:last-child {
		margin-bottom: 0;
	}
}

.empty-state {
	padding: var(--spacing--2xs) var(--spacing--xs);
	color: var(--color--text--tint-1);
	font-size: var(--font-size--sm);
	text-align: center;
}
</style>
