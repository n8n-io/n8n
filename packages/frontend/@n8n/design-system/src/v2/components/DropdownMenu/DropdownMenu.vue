<script setup lang="ts" generic="T = string, D = never">
import { useDebounceFn } from '@vueuse/core';
import {
	DropdownMenuRoot,
	DropdownMenuTrigger,
	DropdownMenuPortal,
	DropdownMenuContent,
} from 'reka-ui';
import { computed, ref, watch, useCssModule, nextTick, toRef } from 'vue';

import Icon from '@n8n/design-system/components/N8nIcon/Icon.vue';
import N8nLoading from '@n8n/design-system/v2/components/Loading/Loading.vue';

import { useMenuKeyboardNavigation } from './composables/useMenuKeyboardNavigation';
import { isAlign, isSide } from './DropdownMenu.typeguards';
import type { DropdownMenuProps, DropdownMenuSlots } from './DropdownMenu.types';
import N8nDropdownMenuItem from './DropdownMenuItem.vue';
import N8nDropdownMenuSearch from './DropdownMenuSearch.vue';

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<DropdownMenuProps<T, D>>(), {
	placement: 'bottom',
	trigger: 'click',
	activatorIcon: () => ({ type: 'icon', value: 'ellipsis' }),
	disabled: false,
	teleported: true,
	loading: false,
	loadingItemCount: 3,
	searchable: false,
	searchPlaceholder: 'Search...',
	searchDebounce: 300,
	emptyText: 'No items',
});

const emit = defineEmits<{
	'update:modelValue': [open: boolean];
	select: [value: T];
	search: [searchTerm: string, itemId?: T];
	'submenu:toggle': [itemId: T, open: boolean];
}>();

const slots = defineSlots<DropdownMenuSlots<T, D>>();
const $style = useCssModule();

// Handle controlled/uncontrolled state
const internalOpen = ref(props.defaultOpen ?? false);
const isControlled = computed(() => props.modelValue !== undefined);

const searchRef = ref<{ focus: () => void } | null>(null);
const contentRef = ref<InstanceType<typeof DropdownMenuContent> | null>(null);
const searchTerm = ref('');

// Track open sub-menu index
const openSubMenuIndex = ref(-1);

const hasSubMenu = (item: (typeof props.items)[number]): boolean => {
	return (item.children && item.children.length > 0) || !!item.loading || !!item.searchable;
};

// Keyboard navigation
const navigation = useMenuKeyboardNavigation({
	items: toRef(() => props.items),
	hasSubMenu,
	onSelect: (_index, item) => {
		emit('select', item.id);
		close();
	},
	onOpenSubMenu: (index) => {
		openSubMenuIndex.value = index;
	},
	onCloseSubMenu: () => {
		if (openSubMenuIndex.value >= 0) {
			openSubMenuIndex.value = -1;
		}
	},
});

const { highlightedIndex } = navigation;

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

	if (!open) {
		navigation.reset();
		openSubMenuIndex.value = -1;
	}

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

const handleContentKeydown = (event: KeyboardEvent) => {
	// Non-searchable menus use reka-ui's built-in roving focus
	if (!props.searchable) return;

	navigation.handleKeydown(event);
};

const handleSubMenuOpenChange = (index: number, open: boolean) => {
	const item = props.items[index];
	if (item) {
		emit('submenu:toggle', item.id, open);
	}

	if (open) {
		openSubMenuIndex.value = index;
		navigation.reset();
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
	navigation.reset();
	openSubMenuIndex.value = -1;
};

watch(
	() => props.modelValue,
	(newValue) => {
		if (newValue !== undefined) {
			internalOpen.value = newValue;
			if (!newValue) {
				navigation.reset();
				openSubMenuIndex.value = -1;
			}
		}
	},
	{ immediate: true },
);

watch(
	() => props.items,
	() => {
		navigation.reset();
	},
);

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
				data-menu-content
				:side="placementParts.side"
				:align="placementParts.align"
				:side-offset="5"
				:style="contentStyle"
				:prioritize-position="true"
				@keydown="handleContentKeydown"
				@mouseleave="navigation.reset"
			>
				<slot v-if="slots.content" name="content" />
				<template v-else>
					<N8nDropdownMenuSearch
						v-if="searchable"
						ref="searchRef"
						:model-value="searchTerm"
						:placeholder="searchPlaceholder"
						@update:model-value="handleSearchUpdate"
						@key:escape="close"
						@key:navigate="navigation.navigate"
						@key:arrow-right="navigation.handleArrowRight"
						@key:arrow-left="navigation.handleArrowLeft"
						@key:enter="navigation.handleEnter"
					/>

					<div :class="$style['items-container']" data-menu-items>
						<template v-if="loading">
							<slot name="loading">
								<N8nLoading
									v-for="i in loadingItemCount"
									:key="i"
									:rows="1"
									:class="$style['loading-item']"
									variant="p"
								/>
							</slot>
						</template>
						<template v-else-if="items.length === 0">
							<slot name="empty">
								<div :class="$style['empty-state']">{{ emptyText }}</div>
							</slot>
						</template>
						<template v-else>
							<template v-for="(item, index) in items" :key="item.id">
								<slot name="item" :item="item">
									<N8nDropdownMenuItem
										v-bind="item"
										:highlighted="highlightedIndex === index"
										:sub-menu-open="openSubMenuIndex === index"
										:divided="item.divided && index > 0"
										@select="handleItemSelect"
										@search="handleItemSearch"
										@update:sub-menu-open="(open: boolean) => handleSubMenuOpenChange(index, open)"
									>
										<template v-if="slots['item-leading']" #item-leading="slotProps">
											<slot name="item-leading" v-bind="slotProps" />
										</template>
										<template v-if="slots['item-label']" #item-label="slotProps">
											<slot name="item-label" v-bind="slotProps" />
										</template>
										<template v-if="slots['item-trailing']" #item-trailing="slotProps">
											<slot name="item-trailing" v-bind="slotProps" />
										</template>
									</N8nDropdownMenuItem>
								</slot>
							</template>
						</template>
					</div>
				</template>
			</DropdownMenuContent>
		</component>
	</DropdownMenuRoot>
</template>

<style module lang="scss">
// According to figma
$menu_width: 180px;

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
	display: flex;
	flex-direction: column;
	width: $menu_width;
	max-height: var(--reka-dropdown-menu-content-available-height);
	overflow-y: auto;
	border-radius: var(--radius);
	border: var(--border);
	background-color: var(--color--background--light-2);
	box-shadow: var(--shadow);
}

.items-container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	padding: var(--spacing--4xs);
}

.loading-item div {
	height: var(--spacing--xl);
}

.empty-state {
	padding: var(--spacing--2xs) var(--spacing--xs);
	color: var(--color--text--tint-1);
	font-size: var(--font-size--sm);
	text-align: center;
}
</style>
