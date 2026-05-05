<script setup lang="ts" generic="T = string, D = never">
import { useDebounceFn } from '@vueuse/core';
import {
	DropdownMenuRoot,
	DropdownMenuTrigger,
	DropdownMenuPortal,
	DropdownMenuContent,
} from 'reka-ui';
import { computed, provide, ref, watch, useCssModule, nextTick, toRef, onBeforeUnmount } from 'vue';

import N8nButton from '@n8n/design-system/components/N8nButton/Button.vue';
import N8nLoading from '@n8n/design-system/components/N8nLoading';

import { useMenuKeyboardNavigation } from './composables/useMenuKeyboardNavigation';
import { isAlign, isSide } from './DropdownMenu.typeguards';
import {
	DropdownMenuPortalTargetKey,
	type DropdownMenuProps,
	type DropdownMenuSlots,
	type DropdownMenuItemProps,
} from './DropdownMenu.types';
import N8nDropdownMenuItem from './DropdownMenuItem.vue';
import N8nDropdownMenuSearch from './DropdownMenuSearch.vue';

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<DropdownMenuProps<T, D>>(), {
	placement: 'bottom',
	trigger: 'click',
	activatorIcon: () => ({ type: 'icon', value: 'ellipsis' }),
	modal: true,
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
	'item-mouseup': [item: DropdownMenuItemProps<T, D>];
}>();

const slots = defineSlots<DropdownMenuSlots<T, D>>();
const $style = useCssModule();

provide(
	DropdownMenuPortalTargetKey,
	computed(() => props.portalTarget),
);

// Handle controlled/uncontrolled state
const internalOpen = ref(props.defaultOpen ?? false);

const searchRef = ref<{ focus: () => void } | null>(null);
const contentRef = ref<InstanceType<typeof DropdownMenuContent> | null>(null);
const searchTerm = ref('');
let hoverCloseTimer: ReturnType<typeof setTimeout> | undefined;

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

const placementParts = computed(() => {
	const [sideValue, alignValue] = props.placement.split('-');
	return {
		side: isSide(sideValue) ? sideValue : 'bottom',
		align: isAlign(alignValue) ? alignValue : 'center',
	};
});

const contentContainerStyle = computed(() => {
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

const handleItemMouseUp = (item: DropdownMenuItemProps<T, D>) => {
	emit('item-mouseup', item);
};

// Hover trigger support
const cancelHoverClose = () => {
	if (hoverCloseTimer) {
		clearTimeout(hoverCloseTimer);
		hoverCloseTimer = undefined;
	}
};

const triggerHoverEnter = () => {
	if (props.trigger === 'hover') {
		cancelHoverClose();
		open();
	}
};

const triggerHoverLeave = () => {
	if (props.trigger === 'hover') {
		cancelHoverClose();
		hoverCloseTimer = setTimeout(() => {
			close();
		}, 100);
	}
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

onBeforeUnmount(() => {
	cancelHoverClose();
});

// Custom dismiss for cross-window portals (e.g. pop-out chat window).
// reka-ui's DismissableLayer captures ownerDocument during setup when the
// element ref is still null, falling back to globalThis.document — the main
// window's document. So the dismiss pointerdown listener never fires in the
// pop-out window. This watcher adds one on the correct document.
watch(internalOpen, (isOpen, _oldValue, onCleanup) => {
	const target = props.portalTarget;
	if (!target || typeof target === 'string' || !isOpen) return;

	const targetDoc = target.ownerDocument;
	if (!targetDoc || targetDoc === document) return;

	let handler: ((e: PointerEvent) => void) | undefined;
	const timerId = setTimeout(() => {
		handler = (e: PointerEvent) => {
			const el = e.target as HTMLElement;
			// Check both the main content and any sub-menu content (which is
			// portaled separately and thus not inside contentEl).
			const contentEl = contentRef.value?.$el as HTMLElement | undefined;
			if (contentEl?.contains(el)) return;
			if (el.closest?.('[role="menu"]')) return;
			setTimeout(() => {
				if (internalOpen.value) close();
			}, 0);
		};
		targetDoc.addEventListener('pointerdown', handler);
	}, 0);

	onCleanup(() => {
		clearTimeout(timerId);
		if (handler) targetDoc.removeEventListener('pointerdown', handler);
	});
});

defineExpose({ open, close });
</script>

<template>
	<DropdownMenuRoot :modal="modal" :open="internalOpen" @update:open="handleOpenChange">
		<DropdownMenuTrigger as-child :disabled="disabled">
			<span
				v-if="slots.trigger"
				:class="$style.trigger"
				:data-test-id="dataTestId"
				@pointerenter="triggerHoverEnter"
				@pointerleave="triggerHoverLeave"
			>
				<slot name="trigger" />
			</span>
			<N8nButton
				v-else
				:icon="activatorIcon?.type === 'icon' ? activatorIcon.value : undefined"
				:data-test-id="dataTestId"
				:disabled="disabled"
				:icon-only="true"
				variant="ghost"
				size="xsmall"
				@pointerenter="triggerHoverEnter"
				@pointerleave="triggerHoverLeave"
			>
				<template v-if="activatorIcon?.type === 'emoji'" #icon>
					{{ activatorIcon.value }}
				</template>
			</N8nButton>
		</DropdownMenuTrigger>

		<component
			:is="teleported || portalTarget ? DropdownMenuPortal : 'template'"
			v-bind="portalTarget ? { to: portalTarget } : {}"
		>
			<DropdownMenuContent
				v-bind="id ? { id } : {}"
				:data-test-id="contentTestId"
				ref="contentRef"
				:class="[$style.content, extraPopperClass]"
				data-menu-content
				:side="placementParts.side"
				:align="placementParts.align"
				:side-offset="5"
				:style="contentContainerStyle"
				:prioritize-position="true"
				@keydown="handleContentKeydown"
				@mouseenter="cancelHoverClose"
				@mouseleave="triggerHoverLeave"
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
					>
						<template v-if="slots['search-prefix']" #search-prefix>
							<slot name="search-prefix" />
						</template>
						<template v-if="slots['search-suffix']" #search-suffix>
							<slot name="search-suffix" />
						</template>
					</N8nDropdownMenuSearch>

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
										@mouseup="handleItemMouseUp(item)"
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
					<slot v-if="slots.footer" name="footer" />
				</template>
			</DropdownMenuContent>
		</component>
	</DropdownMenuRoot>
</template>

<style module lang="scss">
@use '../../css/mixins/motion';

.content {
	--n8n--dropdown--offset--slide-x: 0;
	--n8n--dropdown--offset--slide-y: 0;
	--n8n--dropdown--offset--origin-x: center;
	--n8n--dropdown--offset--origin-y: center;
	--animation--popover-in--translate-x: var(--n8n--dropdown--offset--slide-x);
	--animation--popover-in--translate-y: var(--n8n--dropdown--offset--slide-y);
	--n8n--dropdown-menu-width: 24rem;

	display: flex;
	flex-direction: column;
	width: fit-content;
	min-width: calc(var(--n8n--dropdown-menu-width) / 4);
	max-width: var(--n8n--dropdown-menu-width);
	max-height: var(--reka-dropdown-menu-content-available-height);
	overflow-y: auto;
	border-radius: var(--radius--xs);
	background-color: var(--background--surface);
	--shadow-color--outline: var(--border-color);
	box-shadow:
		var(--shadow--md),
		inset var(--shadow--outline);
	will-change: transform, opacity;
	transform-origin: var(--n8n--dropdown--offset--origin-x) var(--n8n--dropdown--offset--origin-y);
	z-index: 9999;
	scrollbar-width: none;

	&[data-state='open'] {
		@include motion.popover-in;
	}

	&[data-state='closed'] {
		display: none;
	}
}

.content[data-state='open'][data-side='top'] {
	--n8n--dropdown--offset--slide-y: -2px;
	--n8n--dropdown--offset--origin-y: bottom;
}

.content[data-state='open'][data-side='right'] {
	--n8n--dropdown--offset--slide-x: 2px;
	--n8n--dropdown--offset--origin-x: left;
}

.content[data-state='open'][data-side='bottom'] {
	--n8n--dropdown--offset--slide-y: 2px;
	--n8n--dropdown--offset--origin-y: top;
}

.content[data-state='open'][data-side='left'] {
	--n8n--dropdown--offset--slide-x: -2px;
	--n8n--dropdown--offset--origin-x: right;
}

.content[data-state='open'][data-side='top'][data-align='start'],
.content[data-state='open'][data-side='bottom'][data-align='start'] {
	--n8n--dropdown--offset--slide-x: -2px;
	--n8n--dropdown--offset--origin-x: left;
}

.content[data-state='open'][data-side='top'][data-align='end'],
.content[data-state='open'][data-side='bottom'][data-align='end'] {
	--n8n--dropdown--offset--slide-x: 2px;
	--n8n--dropdown--offset--origin-x: right;
}

.content[data-state='open'][data-side='left'][data-align='start'],
.content[data-state='open'][data-side='right'][data-align='start'] {
	--n8n--dropdown--offset--slide-y: -2px;
	--n8n--dropdown--offset--origin-y: top;
}

.content[data-state='open'][data-side='left'][data-align='end'],
.content[data-state='open'][data-side='right'][data-align='end'] {
	--n8n--dropdown--offset--slide-y: 2px;
	--n8n--dropdown--offset--origin-y: bottom;
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

.trigger {
	display: inline-flex;
}
</style>
