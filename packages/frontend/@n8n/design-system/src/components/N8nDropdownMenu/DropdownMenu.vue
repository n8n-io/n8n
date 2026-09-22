<script setup lang="ts" generic="T = string, D = never">
import {
	DropdownMenuRoot,
	DropdownMenuTrigger,
	DropdownMenuPortal,
	DropdownMenuContent,
	type FocusOutsideEvent,
	type PointerDownOutsideEvent,
} from 'reka-ui';
import { computed, nextTick, onBeforeUnmount, provide, ref, useCssModule, watch } from 'vue';

import { isAlign, isSide } from './DropdownMenu.typeguards';
import {
	DropdownMenuPortalTargetKey,
	DropdownMenuSubMaxHeightKey,
	DropdownMenuWidthKey,
	DropdownMenuExternalNavigationKey,
	type DropdownMenuExternalNavigationController,
	type DropdownMenuItemProps,
	type DropdownMenuProps,
	type DropdownMenuSlots,
} from './DropdownMenu.types';
import DropdownMenuItems from './DropdownMenuItems.vue';
import DropdownMenuSearchableContent from './DropdownMenuSearchableContent.vue';
import N8nButton from '../N8nButton/Button.vue';
import type { IconName } from '../N8nIcon/icons';

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
	searchMode: 'internal',
	searchPlaceholder: 'Search...',
	searchDebounce: 0,
	emptyText: 'No items',
	width: '24rem',
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

provide(
	DropdownMenuSubMaxHeightKey,
	computed(() =>
		props.subMenuMaxHeight === undefined
			? undefined
			: typeof props.subMenuMaxHeight === 'number'
				? `${props.subMenuMaxHeight}px`
				: props.subMenuMaxHeight,
	),
);

provide(
	DropdownMenuWidthKey,
	computed(() => props.width),
);

// Handle controlled/uncontrolled state
const internalOpen = ref(props.defaultOpen ?? false);

const contentRef = ref<InstanceType<typeof DropdownMenuContent> | null>(null);
const searchableContentRef = ref<{ highlightFirstItem: () => void } | null>(null);
const externalNavigationControllers: DropdownMenuExternalNavigationController[] = [];
let hoverCloseTimer: ReturnType<typeof setTimeout> | undefined;

const isExternalSearchMode = computed(() => props.searchable && props.searchMode === 'external');
const effectiveModal = computed(() => (isExternalSearchMode.value ? false : props.modal));

// Track open sub-menu index for non-searchable menus. Searchable menus own this in
// DropdownMenuSearchableContent because they use virtual keyboard focus.
const openSubMenuIndex = ref(-1);

const placementParts = computed(() => {
	const [sideValue, alignValue] = props.placement.split('-');
	return {
		side: isSide(sideValue) ? sideValue : 'bottom',
		align: isAlign(alignValue) ? alignValue : 'center',
	};
});

const contentContainerStyle = computed(() => {
	const maxHeightStyle = props.maxHeight
		? {
				maxHeight: typeof props.maxHeight === 'number' ? `${props.maxHeight}px` : props.maxHeight,
				overflowY: 'auto',
			}
		: {};

	return {
		'--n8n--dropdown-menu-width': props.width,
		...maxHeightStyle,
	};
});

const fixedContentProps = {
	/** Keep equal space between the trigger and the menu. */
	sideOffset: 4,
	/** Let Reka UI move the menu instead of overlapping the trigger. */
	prioritizePosition: false,
};

const focusExternalTarget = (allowClosed = false) => {
	if (!allowClosed && !internalOpen.value) return;
	if (!isExternalSearchMode.value || !props.externalFocusTarget?.isConnected) return;
	props.externalFocusTarget.focus({ preventScroll: true });
};

const syncExternalActiveDescendant = () => {
	const target = props.externalFocusTarget;
	if (!isExternalSearchMode.value || !internalOpen.value || !target) return;

	const activeDescendantId = externalNavigationControllers.at(-1)?.getActiveDescendantId();
	if (activeDescendantId) {
		target.setAttribute('aria-activedescendant', activeDescendantId);
	} else {
		target.removeAttribute('aria-activedescendant');
	}
};

const registerExternalNavigation = (controller: DropdownMenuExternalNavigationController) => {
	const currentIndex = externalNavigationControllers.indexOf(controller);
	if (currentIndex >= 0) externalNavigationControllers.splice(currentIndex, 1);
	externalNavigationControllers.push(controller);
	syncExternalActiveDescendant();

	return () => {
		const index = externalNavigationControllers.indexOf(controller);
		if (index >= 0) externalNavigationControllers.splice(index, 1);
		syncExternalActiveDescendant();
	};
};

const activateExternalNavigation = (controller: DropdownMenuExternalNavigationController) => {
	const index = externalNavigationControllers.indexOf(controller);
	if (index < 0 || index === externalNavigationControllers.length - 1) return;

	externalNavigationControllers.splice(index, 1);
	externalNavigationControllers.push(controller);
	syncExternalActiveDescendant();
};

provide(DropdownMenuExternalNavigationKey, {
	register: registerExternalNavigation,
	activate: activateExternalNavigation,
	focusTarget: () => focusExternalTarget(),
	syncActiveDescendant: syncExternalActiveDescendant,
});

const handleContentOpenAutoFocus = (event: Event) => {
	if (!isExternalSearchMode.value) return;
	event.preventDefault();
	focusExternalTarget();
};

const handleContentCloseAutoFocus = (event: Event) => {
	if (isExternalSearchMode.value) event.preventDefault();
};

const externalContentEventHandlers = computed(() =>
	isExternalSearchMode.value
		? {
				onOpenAutoFocus: handleContentOpenAutoFocus,
				onCloseAutoFocus: handleContentCloseAutoFocus,
			}
		: {},
);

const handleContentInteractOutside = (event: FocusOutsideEvent | PointerDownOutsideEvent) => {
	if (
		isExternalSearchMode.value &&
		event.detail.originalEvent.target === props.externalFocusTarget
	) {
		event.preventDefault();
	}
};

const handleContentFocusIn = (event: FocusEvent) => {
	if (!isExternalSearchMode.value || event.target === props.externalFocusTarget) return;
	focusExternalTarget();
};

const handleOpenChange = (open: boolean) => {
	internalOpen.value = open;
	emit('update:modelValue', open);

	if (!open) {
		openSubMenuIndex.value = -1;
	}
};

const handleSubMenuOpenChange = (index: number, open: boolean) => {
	const item = props.items[index];
	if (item) {
		emit('submenu:toggle', item.id, open);
	}

	if (open) {
		openSubMenuIndex.value = index;
	} else if (openSubMenuIndex.value === index) {
		openSubMenuIndex.value = -1;
		void nextTick(() => {
			const contentEl = contentRef.value?.$el as HTMLElement | undefined;
			const menuItems = contentEl?.querySelectorAll('[role="menuitem"]');
			const targetItem = menuItems?.[index] as HTMLElement | undefined;
			targetItem?.focus();
		});
	}
};

function findItemById(
	list: Array<DropdownMenuItemProps<T, D>>,
	id: T,
): DropdownMenuItemProps<T, D> | undefined {
	for (const item of list) {
		if (item.id === id) return item;
		const found = item.children && findItemById(item.children, id);
		if (found) return found;
	}
	return undefined;
}

const handleItemSelect = (value: T) => {
	emit('select', value);
	// Toggle-style rows (e.g. credential selection) keep the menu open.
	if (!findItemById(props.items, value)?.keepOpen) close();
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

const closeMenu = (restoreExternalFocus: boolean) => {
	internalOpen.value = false;
	emit('update:modelValue', false);
	openSubMenuIndex.value = -1;

	if (restoreExternalFocus && isExternalSearchMode.value) {
		void nextTick(() => focusExternalTarget(true));
	}
};

const close = () => {
	closeMenu(true);
};

const highlightFirstItem = () => {
	if (isExternalSearchMode.value) {
		externalNavigationControllers.at(-1)?.highlightFirstItem();
	} else {
		searchableContentRef.value?.highlightFirstItem();
	}
};

const handleExternalKeydown = (event: KeyboardEvent): boolean => {
	if (!isExternalSearchMode.value || !internalOpen.value) return false;
	if (event.defaultPrevented) return false;
	if (event.isComposing || event.keyCode === 229) return false;

	if (event.key === 'Escape') {
		event.preventDefault();
		event.stopPropagation();
		close();
		return true;
	}

	if (event.key === 'Tab') {
		event.stopPropagation();
		closeMenu(false);
		return true;
	}

	if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return false;

	const handled = externalNavigationControllers.at(-1)?.handleExternalKeydown(event) ?? false;
	if (handled) event.stopPropagation();
	return handled;
};

watch(
	() => props.modelValue,
	(newValue) => {
		if (newValue !== undefined) {
			internalOpen.value = newValue;
			if (!newValue) {
				openSubMenuIndex.value = -1;
			}
		}
	},
	{ immediate: true },
);

watch(
	[internalOpen, isExternalSearchMode, () => props.externalFocusTarget],
	async ([isOpen, externalMode, target], _oldValues, onCleanup) => {
		if (!isOpen || !externalMode || !target) return;

		const attributes = ['aria-activedescendant', 'aria-controls', 'aria-expanded', 'aria-haspopup'];
		const previousAttributes = new Map(
			attributes.map((attribute) => [attribute, target.getAttribute(attribute)]),
		);

		onCleanup(() => {
			for (const [attribute, value] of previousAttributes) {
				if (value === null) target.removeAttribute(attribute);
				else target.setAttribute(attribute, value);
			}
		});

		await nextTick();
		if (!internalOpen.value || props.externalFocusTarget !== target) return;

		target.setAttribute('aria-expanded', 'true');
		target.setAttribute('aria-haspopup', 'menu');
		const contentId = (contentRef.value?.$el as HTMLElement | undefined)?.id;
		if (contentId) target.setAttribute('aria-controls', contentId);
		focusExternalTarget();
		syncExternalActiveDescendant();
	},
	{ immediate: true },
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
				if (internalOpen.value) closeMenu(false);
			}, 0);
		};
		targetDoc.addEventListener('pointerdown', handler);
	}, 0);

	onCleanup(() => {
		clearTimeout(timerId);
		if (handler) targetDoc.removeEventListener('pointerdown', handler);
	});
});

defineExpose({ open, close, highlightFirstItem, handleExternalKeydown });
</script>

<!-- TODO DS-580: Let consumers bind trigger props/listeners directly in the slot so their
	element can be the actual trigger. For now this wrapper owns hover events and test ids. -->
<template>
	<DropdownMenuRoot :modal="effectiveModal" :open="internalOpen" @update:open="handleOpenChange">
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
				:icon="activatorIcon?.type === 'icon' ? (activatorIcon.value as IconName) : undefined"
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

		<DropdownMenuPortal
			:disabled="!teleported && !portalTarget"
			v-bind="portalTarget ? { to: portalTarget } : {}"
		>
			<DropdownMenuContent
				ref="contentRef"
				v-bind="{
					...fixedContentProps,
					...(id ? { id } : {}),
					...externalContentEventHandlers,
				}"
				data-menu-content
				:data-test-id="contentTestId"
				:class="[$style.content, searchable && $style.searchable, extraPopperClass]"
				:side="placementParts.side"
				:align="placementParts.align"
				:reference="reference"
				:style="contentContainerStyle"
				@mouseenter="cancelHoverClose"
				@mouseleave="triggerHoverLeave"
				@focusin.capture="handleContentFocusIn"
				@interact-outside="handleContentInteractOutside"
			>
				<slot v-if="slots.content" name="content" />
				<template v-else>
					<DropdownMenuSearchableContent
						v-if="searchable"
						ref="searchableContentRef"
						:open="internalOpen"
						:items="items"
						:search-placeholder="searchPlaceholder"
						:search-debounce="searchDebounce"
						:search-mode="searchMode"
						@select="handleItemSelect"
						@search="(term: string, itemId?: T) => emit('search', term, itemId)"
						@close="close"
						@submenu:toggle="(itemId: T, open: boolean) => emit('submenu:toggle', itemId, open)"
					>
						<template v-if="slots['search-prefix']" #search-prefix>
							<slot name="search-prefix" />
						</template>
						<template v-if="slots['search-suffix']" #search-suffix>
							<slot name="search-suffix" />
						</template>
						<template #default="searchableContent">
							<DropdownMenuItems
								:items="items"
								:loading="loading"
								:loading-item-count="loadingItemCount"
								:empty-text="emptyText"
								:highlighted-index="searchableContent.highlightedIndex"
								:open-sub-menu-index="searchableContent.openSubMenuIndex"
								:get-item-dom-id="searchableContent.getItemDomId"
								:on-item-hover="searchableContent.onItemHover"
								:disable-pointer-focus="true"
								:search-mode="searchMode"
								@select="handleItemSelect"
								@search="handleItemSearch"
								@submenu:toggle="searchableContent.onSubMenuOpenChange"
								@item-mouseup="handleItemMouseUp"
							>
								<template v-if="slots.loading" #loading>
									<slot name="loading" />
								</template>
								<template v-if="slots.empty" #empty>
									<slot name="empty" />
								</template>
								<template v-if="slots.item" #item="slotProps">
									<slot name="item" v-bind="slotProps" />
								</template>
								<template v-if="slots['item-leading']" #item-leading="slotProps">
									<slot name="item-leading" v-bind="slotProps" />
								</template>
								<template v-if="slots['item-label']" #item-label="slotProps">
									<slot name="item-label" v-bind="slotProps" />
								</template>
								<template v-if="slots['item-trailing']" #item-trailing="slotProps">
									<slot name="item-trailing" v-bind="slotProps" />
								</template>
							</DropdownMenuItems>
						</template>
					</DropdownMenuSearchableContent>

					<DropdownMenuItems
						v-else
						:items="items"
						:loading="loading"
						:loading-item-count="loadingItemCount"
						:empty-text="emptyText"
						:open-sub-menu-index="openSubMenuIndex"
						@select="handleItemSelect"
						@search="handleItemSearch"
						@submenu:toggle="handleSubMenuOpenChange"
						@item-mouseup="handleItemMouseUp"
					>
						<template v-if="slots.loading" #loading>
							<slot name="loading" />
						</template>
						<template v-if="slots.empty" #empty>
							<slot name="empty" />
						</template>
						<template v-if="slots.item" #item="slotProps">
							<slot name="item" v-bind="slotProps" />
						</template>
						<template v-if="slots['item-leading']" #item-leading="slotProps">
							<slot name="item-leading" v-bind="slotProps" />
						</template>
						<template v-if="slots['item-label']" #item-label="slotProps">
							<slot name="item-label" v-bind="slotProps" />
						</template>
						<template v-if="slots['item-trailing']" #item-trailing="slotProps">
							<slot name="item-trailing" v-bind="slotProps" />
						</template>
					</DropdownMenuItems>
					<slot v-if="slots.footer" name="footer" />
				</template>
			</DropdownMenuContent>
		</DropdownMenuPortal>
	</DropdownMenuRoot>
</template>

<style module lang="scss">
@use '../../css/common/var';
@use '../../css/mixins/mixins' as scrollbar-mixins;
@use '../../css/mixins/motion';

.content {
	--n8n--dropdown--offset--slide-x: 0;
	--n8n--dropdown--offset--slide-y: 0;
	--n8n--dropdown--offset--origin-x: center;
	--n8n--dropdown--offset--origin-y: center;
	--animation--popover-in--translate-x: var(--n8n--dropdown--offset--slide-x);
	--animation--popover-in--translate-y: var(--n8n--dropdown--offset--slide-y);
	display: flex;
	flex-direction: column;
	width: fit-content;
	min-width: var(--spacing--4xl);
	max-width: var(--n8n--dropdown-menu-width);
	/** This stops dropdown menus expanding beyond the viewport height **/
	max-height: min(var(--reka-dropdown-menu-content-available-height), 75vh);
	overflow-y: auto;
	border-radius: var(--radius--xs);
	background-color: var(--background--surface);
	--shadow-color--outline: var(--border-color);
	box-shadow: var(--shadow--md), var(--shadow--outline);
	will-change: transform, opacity;
	transform-origin: var(--n8n--dropdown--offset--origin-x) var(--n8n--dropdown--offset--origin-y);
	z-index: var.$index-popper;
	@include scrollbar-mixins.hoverable-scroll-bar;

	&.searchable {
		overflow-y: hidden;
	}

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

.trigger {
	display: inline-flex;
	min-width: 0;
}
</style>
