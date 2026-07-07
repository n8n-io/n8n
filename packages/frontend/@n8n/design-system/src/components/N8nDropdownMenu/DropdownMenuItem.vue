<script setup lang="ts" generic="T = string, D = never">
import {
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubTrigger,
	DropdownMenuSubContent,
	DropdownMenuPortal,
} from 'reka-ui';
import { computed, inject, nextTick, onBeforeUnmount, ref, useCssModule, watch } from 'vue';

import Icon from '@n8n/design-system/components/N8nIcon/Icon.vue';
import N8nLoading from '@n8n/design-system/components/N8nLoading';
import N8nText from '@n8n/design-system/components/N8nText/Text.vue';

import {
	DropdownMenuPortalTargetKey,
	type DropdownMenuItemProps,
	type DropdownMenuItemSlots,
} from './DropdownMenu.types';
import DropdownMenuSearchableContent from './DropdownMenuSearchableContent.vue';

defineOptions({ name: 'N8nDropdownMenuItem', inheritAttrs: false });

const props = withDefaults(
	defineProps<DropdownMenuItemProps<T, D> & { htmlId?: string; disablePointerFocus?: boolean }>(),
	{
		loadingItemCount: 3,
		disablePointerFocus: false,
	},
);
defineSlots<DropdownMenuItemSlots<T, D>>();

const emit = defineEmits<{
	select: [value: T];
	search: [searchTerm: string, itemId: T];
	'update:subMenuOpen': [open: boolean];
	pointermove: [event: PointerEvent];
}>();

const $style = useCssModule();
const portalTarget = inject(DropdownMenuPortalTargetKey, ref(undefined));

const internalSubMenuOpen = ref(false);
const subContentRef = ref<InstanceType<typeof DropdownMenuSubContent> | null>(null);
const childrenContainerRef = ref<HTMLElement | null>(null);
const subContentMaxHeight = ref<string>();

const SUB_MENU_ITEM_GLIMPSE_RATIO = 0.5;
const SUB_MENU_ITEM_ALIGNMENT_TOLERANCE = 2;

const waitForLayout = async () => {
	await nextTick();
	await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
};

const handleChildSearch = (term: string, itemId: T) => {
	emit('search', term, itemId);
};

const hasChildren = computed(() => props.children && props.children.length > 0);
const hasSubMenu = computed(() => hasChildren.value || props.loading || props.searchable);

const handleSubMenuOpenChange = (open: boolean) => {
	internalSubMenuOpen.value = open;
	emit('update:subMenuOpen', open);
};

const closeSubMenu = () => {
	internalSubMenuOpen.value = false;
	emit('update:subMenuOpen', false);
};

const leadingProps = computed(() => ({
	class: $style['item-leading'],
}));

const labelProps = computed(() => ({
	class: $style['item-label'],
}));

const trailingProps = computed(() => ({
	class: $style['item-trailing'],
}));

const titleAttr = computed(() => (props.label.length >= 20 ? props.label : undefined));

const handleSelect = (value: T) => {
	emit('select', value);
};

const handleItemSelect = () => {
	if (!props.disabled && !hasSubMenu.value) {
		emit('select', props.id);
	}
};

const handlePointerMove = (event: PointerEvent) => {
	emit('pointermove', event);
};

const handleSubContentFocusOutside = (event: Event) => {
	if (props.disablePointerFocus) {
		event.preventDefault();
	}
};

const updateSubContentMaxHeight = async () => {
	subContentMaxHeight.value = undefined;
	await waitForLayout();

	const container = childrenContainerRef.value;
	if (!container || container.scrollHeight <= container.clientHeight) return;

	const items = [...container.querySelectorAll<HTMLElement>('[role="menuitem"]')];
	const containerTop = container.getBoundingClientRect().top;
	const viewportBottom = container.clientHeight;
	const itemRects = items.map((item) => {
		const rect = item.getBoundingClientRect();
		return {
			top: rect.top - containerTop,
			bottom: rect.bottom - containerTop,
			height: rect.height,
		};
	});
	const hasPartialItem = itemRects.some(
		({ top, bottom }) =>
			top < viewportBottom - SUB_MENU_ITEM_ALIGNMENT_TOLERANCE &&
			bottom > viewportBottom + SUB_MENU_ITEM_ALIGNMENT_TOLERANCE,
	);
	if (hasPartialItem) return;

	const lastFullItemIndex = itemRects.findLastIndex(
		({ bottom }) => bottom <= viewportBottom + SUB_MENU_ITEM_ALIGNMENT_TOLERANCE,
	);
	const lastFullItem = itemRects[lastFullItemIndex];
	const nextItem = itemRects[lastFullItemIndex + 1];
	if (!lastFullItem || !nextItem) return;

	subContentMaxHeight.value = `${Math.floor(
		lastFullItem.bottom + nextItem.height * SUB_MENU_ITEM_GLIMPSE_RATIO,
	)}px`;
};

const handleResize = () => {
	void updateSubContentMaxHeight();
};

// Sync internal state with prop when prop changes (controlled mode)
watch(
	() => props.subMenuOpen,
	(newValue) => {
		if (newValue !== undefined) {
			internalSubMenuOpen.value = newValue;
		}
	},
	{ immediate: true },
);

watch(internalSubMenuOpen, (open) => {
	if (open) {
		void updateSubContentMaxHeight();
		window.addEventListener('resize', handleResize);
	} else {
		window.removeEventListener('resize', handleResize);
		subContentMaxHeight.value = undefined;
	}
});

onBeforeUnmount(() => {
	window.removeEventListener('resize', handleResize);
});
</script>

<template>
	<div ref="itemRef" :class="$style.wrapper">
		<DropdownMenuSeparator v-if="divided" :class="$style.separator" />

		<DropdownMenuSub
			v-if="hasSubMenu"
			:open="internalSubMenuOpen"
			@update:open="handleSubMenuOpenChange"
		>
			<DropdownMenuSubTrigger
				:id="htmlId"
				:aria-selected="highlighted || undefined"
				@pointermove.capture="handlePointerMove"
				:disabled="disabled"
				:data-test-id="testId"
				:class="[$style.item, $style['sub-trigger'], props.class, { 'is-disabled': !!disabled }]"
			>
				<slot name="item-leading" :item="props" :ui="leadingProps">
					<Icon
						v-if="icon?.type === 'icon'"
						:icon="icon.value"
						:class="[$style['item-leading'], $style.icon]"
						:color="disabled ? 'text-xlight' : 'text-light'"
						size="large"
					/>
					<span v-else-if="icon?.type === 'emoji'" :class="[$style['item-leading'], $style.emoji]">
						{{ icon.value }}
					</span>
				</slot>
				<slot name="item-label" :item="props" :ui="labelProps">
					<N8nText
						:class="$style['item-label']"
						:title="titleAttr"
						size="medium"
						:color="disabled ? 'text-xlight' : 'text-dark'"
					>
						{{ label }}
					</N8nText>
				</slot>
				<Icon
					icon="chevron-right"
					:class="$style['sub-indicator']"
					:color="disabled ? 'text-xlight' : 'text-light'"
					size="large"
				/>
			</DropdownMenuSubTrigger>

			<DropdownMenuPortal v-bind="portalTarget ? { to: portalTarget } : {}">
				<DropdownMenuSubContent
					ref="subContentRef"
					:class="$style['sub-content']"
					:style="subContentMaxHeight ? { maxHeight: subContentMaxHeight } : undefined"
					:side-offset="1"
					:prioritize-position="true"
					sticky="partial"
					@focus-outside="handleSubContentFocusOutside"
				>
					<DropdownMenuSearchableContent
						v-if="searchable"
						:open="internalSubMenuOpen"
						:items="children ?? []"
						:search-placeholder="searchPlaceholder"
						@select="handleSelect"
						@search="(term: string, itemId?: T) => emit('search', term, itemId ?? props.id)"
						@close="closeSubMenu"
					>
						<template #default="searchableContent">
							<div v-if="loading" :class="$style['loading-container']">
								<N8nLoading
									v-for="i in loadingItemCount"
									:key="i"
									:rows="1"
									:class="$style['loading-item']"
									variant="p"
								/>
							</div>
							<template v-else-if="hasChildren">
								<div
									ref="childrenContainerRef"
									:class="$style['children-container']"
									data-menu-items
								>
									<template v-for="(child, childIndex) in props.children" :key="child.id">
										<N8nDropdownMenuItem
											v-bind="child"
											:html-id="searchableContent.getItemDomId(childIndex)"
											:highlighted="searchableContent.highlightedIndex === childIndex"
											:sub-menu-open="searchableContent.openSubMenuIndex === childIndex"
											:disable-pointer-focus="true"
											:divided="child.divided && childIndex > 0"
											@select="handleSelect"
											@search="handleChildSearch"
											@update:sub-menu-open="
												searchableContent.onSubMenuOpenChange(childIndex, $event)
											"
											@pointermove="searchableContent.onItemHover(childIndex)"
										>
											<template #item-leading="leadingProps">
												<slot name="item-leading" v-bind="leadingProps" />
											</template>
											<template #item-label="bodyProps">
												<slot name="item-label" v-bind="bodyProps" />
											</template>
											<template #item-trailing="trailingProps">
												<slot name="item-trailing" v-bind="trailingProps" />
											</template>
										</N8nDropdownMenuItem>
									</template>
								</div>
							</template>
							<div v-else :class="$style['empty-state']">No items</div>
						</template>
					</DropdownMenuSearchableContent>

					<template v-else>
						<div v-if="loading" :class="$style['loading-container']">
							<N8nLoading
								v-for="i in loadingItemCount"
								:key="i"
								:rows="1"
								:class="$style['loading-item']"
								variant="p"
							/>
						</div>
						<template v-else-if="hasChildren">
							<div ref="childrenContainerRef" :class="$style['children-container']" data-menu-items>
								<template v-for="(child, childIndex) in props.children" :key="child.id">
									<N8nDropdownMenuItem
										v-bind="child"
										:divided="child.divided && childIndex > 0"
										@select="handleSelect"
										@search="handleChildSearch"
									>
										<template #item-leading="leadingProps">
											<slot name="item-leading" v-bind="leadingProps" />
										</template>
										<template #item-label="bodyProps">
											<slot name="item-label" v-bind="bodyProps" />
										</template>
										<template #item-trailing="trailingProps">
											<slot name="item-trailing" v-bind="trailingProps" />
										</template>
									</N8nDropdownMenuItem>
								</template>
							</div>
						</template>
					</template>
				</DropdownMenuSubContent>
			</DropdownMenuPortal>
		</DropdownMenuSub>

		<!-- Regular item without children -->
		<DropdownMenuItem
			v-else
			:id="htmlId"
			:aria-selected="highlighted || undefined"
			@pointermove.capture="handlePointerMove"
			:disabled="disabled"
			:data-test-id="testId"
			:class="[$style.item, props.class, { 'is-disabled': !!disabled }]"
			@select="handleItemSelect"
		>
			<slot name="item-leading" :item="props" :ui="leadingProps">
				<Icon
					v-if="icon?.type === 'icon'"
					:icon="icon.value"
					:class="[$style['item-leading'], $style.icon]"
					:color="disabled ? 'text-xlight' : 'text-light'"
					size="large"
				/>
				<span v-else-if="icon?.type === 'emoji'" :class="[$style['item-leading'], $style.emoji]">
					{{ icon.value }}
				</span>
			</slot>
			<slot name="item-label" :item="props" :ui="labelProps">
				<N8nText
					:class="$style['item-label']"
					:title="titleAttr"
					size="medium"
					:color="disabled ? 'text-xlight' : 'text-dark'"
				>
					{{ label }}
				</N8nText>
			</slot>
			<slot name="item-trailing" :item="props" :ui="trailingProps" />
			<Icon
				v-if="checked"
				icon="check"
				:class="$style['item-check']"
				size="large"
				:color="disabled ? 'text-xlight' : 'text-light'"
			/>
		</DropdownMenuItem>
	</div>
</template>

<style module lang="scss">
.wrapper {
	display: contents;
}

.children-container {
	padding: var(--spacing--4xs);
	max-height: inherit;
	overflow-y: auto;
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

.item {
	font-size: var(--font-size--2xs);
	line-height: 1;
	border-radius: var(--radius--2xs);
	display: flex;
	align-items: center;
	min-height: var(--spacing--xl);
	padding: var(--spacing--2xs);
	position: relative;
	user-select: none;
	color: var(--text-color);
	gap: var(--spacing--2xs);
	outline: none;

	&:not([data-disabled]) {
		&:hover,
		&[data-highlighted],
		&[aria-selected='true'] {
			background-color: var(--background--hover);
			cursor: pointer;
		}
	}

	&[data-disabled] {
		color: var(--text-color--disabled);
		cursor: not-allowed;
	}

	:global([data-menu-items]:has([aria-selected='true'])) &:not([aria-selected='true']) {
		&:hover,
		&[data-highlighted] {
			background-color: transparent;
		}
	}
}

.sub-trigger {
	&:not([data-disabled]) {
		&:hover,
		&[data-highlighted] {
			background-color: transparent;
			cursor: pointer;
		}

		&[aria-selected='true'],
		&[data-state='open'] {
			background-color: var(--background--hover);
			cursor: pointer;
		}
	}
}

.sub-indicator {
	margin-left: auto;
	flex-shrink: 0;
	color: var(--color--text--tint-1);
}

.sub-content {
	border-radius: var(--radius--xs);
	box-shadow: var(--shadow--md), var(--shadow--outline);
	background-color: var(--background--surface);
	z-index: 999999;
	width: fit-content;
	min-width: calc(var(--n8n--dropdown-menu-width) / 4);
	max-width: var(--n8n--dropdown-menu-width);
	max-height: min(var(--reka-dropdown-menu-content-available-height), var(--spacing--5xl));
	transform-origin: var(--n8n--dropdown--offset--origin-x) var(--n8n--dropdown--offset--origin-y);
	overflow: hidden;
	scrollbar-width: none;

	&::-webkit-scrollbar {
		display: none;
	}
}

.item-leading {
	flex-shrink: 0;
}

.emoji {
	font-size: var(--font-size--sm);
	line-height: 1;
}

.item-label {
	flex-grow: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.item-check,
.item-trailing {
	margin-left: auto;
	flex-shrink: 0;
}

.separator {
	height: 1px;
	background-color: var(--border-color);
	margin: var(--spacing--5xs) calc(var(--spacing--4xs) * -1);
}

.loading-container {
	padding: var(--spacing--4xs);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.loading-item div {
	height: var(--spacing--xl);
}

.empty-state {
	padding: var(--spacing--2xs) var(--spacing--xs);
	color: var(--text-color--subtle);
	font-size: var(--font-size--sm);
	text-align: center;
}
</style>
