<script setup lang="ts" generic="T = string, D = never">
import {
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubTrigger,
	DropdownMenuSubContent,
	DropdownMenuPortal,
} from 'reka-ui';
import { computed, ref, useCssModule, watch, toRef } from 'vue';

import Icon from '@n8n/design-system/components/N8nIcon/Icon.vue';
import N8nText from '@n8n/design-system/components/N8nText/Text.vue';
import N8nLoading from '@n8n/design-system/v2/components/Loading/Loading.vue';

import { useMenuKeyboardNavigation } from './composables/useMenuKeyboardNavigation';
import type { DropdownMenuItemProps, DropdownMenuItemSlots } from './DropdownMenu.types';
import N8nDropdownMenuSearch from './DropdownMenuSearch.vue';

const SUBMENU_FOCUS_DELAY = 100;

defineOptions({ name: 'N8nDropdownMenuItem', inheritAttrs: false });

const props = withDefaults(defineProps<DropdownMenuItemProps<T, D>>(), {
	loadingItemCount: 3,
});
defineSlots<DropdownMenuItemSlots<T, D>>();

const emit = defineEmits<{
	select: [value: T];
	search: [searchTerm: string, itemId: T];
	'update:subMenuOpen': [open: boolean];
}>();

const $style = useCssModule();

const searchTerm = ref('');
const internalSubMenuOpen = ref(false);

const searchRef = ref<{ focus: () => void } | null>(null);

const childHasSubMenu = (child: NonNullable<typeof props.children>[number]): boolean => {
	return (child.children && child.children.length > 0) || !!child.loading || !!child.searchable;
};

// Keyboard navigation for sub-menu
const subMenuNavigation = useMenuKeyboardNavigation({
	items: toRef(() => props.children ?? []),
	hasSubMenu: childHasSubMenu,
	onSelect: (_index, child) => {
		emit('select', child.id);
		closeSubMenu();
	},
	onCloseSubMenu: () => {
		closeSubMenu();
	},
});

const { highlightedIndex: subMenuHighlightedIndex } = subMenuNavigation;

const handleSearchUpdate = (value: string) => {
	searchTerm.value = value;
	emit('search', value, props.id);
};

const handleChildSearch = (term: string, itemId: T) => {
	emit('search', term, itemId);
};

const handleSubContentKeydown = (event: KeyboardEvent) => {
	if (!props.searchable) return;

	subMenuNavigation.handleKeydown(event);
};

const hasChildren = computed(() => props.children && props.children.length > 0);
const hasSubMenu = computed(() => hasChildren.value || props.loading || props.searchable);

const handleSubMenuOpenChange = (open: boolean) => {
	internalSubMenuOpen.value = open;
	emit('update:subMenuOpen', open);

	if (open && props.searchable) {
		subMenuNavigation.highlightFirst();
		setTimeout(() => searchRef.value?.focus(), SUBMENU_FOCUS_DELAY);
	} else {
		subMenuNavigation.reset();
	}

	if (!open && props.searchable) {
		searchTerm.value = '';
		emit('search', '', props.id);
	}
};

const closeSubMenu = () => {
	internalSubMenuOpen.value = false;
	emit('update:subMenuOpen', false);
	if (props.searchable) {
		searchTerm.value = '';
		emit('search', '', props.id);
	}
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

const handleSelect = (value: T) => {
	emit('select', value);
};

const handleItemSelect = () => {
	if (!props.disabled && !hasSubMenu.value) {
		emit('select', props.id);
	}
};

// Reset sub-menu highlighted index when children change
watch(
	() => props.children,
	() => {
		subMenuNavigation.reset();
	},
);

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
				:disabled="disabled"
				:class="[
					$style.item,
					$style['sub-trigger'],
					props.class,
					{ [$style.highlighted]: highlighted },
				]"
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
						size="medium"
						:color="disabled ? 'text-light' : 'text-dark'"
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

			<DropdownMenuPortal>
				<DropdownMenuSubContent
					ref="subContentRef"
					:class="$style['sub-content']"
					:side-offset="1"
					:prioritize-position="true"
					sticky="partial"
					@keydown="handleSubContentKeydown"
				>
					<N8nDropdownMenuSearch
						v-if="searchable && !loading"
						ref="searchRef"
						:model-value="searchTerm"
						:placeholder="searchPlaceholder ?? 'Search...'"
						@update:model-value="handleSearchUpdate"
						@key:escape="closeSubMenu"
						@key:navigate="subMenuNavigation.navigate"
						@key:arrow-left="subMenuNavigation.handleArrowLeft"
						@key:enter="subMenuNavigation.handleEnter"
					/>

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
							:class="$style['children-container']"
							data-menu-items
							@mouseenter="subMenuNavigation.reset"
						>
							<template v-for="(child, childIndex) in props.children" :key="child.id">
								<N8nDropdownMenuItem
									v-bind="child"
									:highlighted="searchable && subMenuHighlightedIndex === childIndex"
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

					<!-- Empty state when search returns no results -->
					<div v-else-if="searchable && searchTerm" :class="$style['empty-state']">No results</div>
				</DropdownMenuSubContent>
			</DropdownMenuPortal>
		</DropdownMenuSub>

		<!-- Regular item without children -->
		<DropdownMenuItem
			v-else
			:disabled="disabled"
			:class="[$style.item, props.class, { [$style.highlighted]: highlighted }]"
			@select="handleItemSelect"
		>
			<slot name="item-leading" :item="props" :ui="leadingProps">
				<Icon
					v-if="icon?.type === 'icon'"
					:icon="icon.value"
					:class="[$style['item-leading'], $style.icon]"
					size="large"
					:color="disabled ? 'text-xlight' : 'text-light'"
				/>
				<span v-else-if="icon?.type === 'emoji'" :class="[$style['item-leading'], $style.emoji]">
					{{ icon.value }}
				</span>
			</slot>
			<slot name="item-label" :item="props" :ui="labelProps">
				<N8nText
					:class="$style['item-label']"
					size="medium"
					:color="disabled ? 'text-light' : 'text-dark'"
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
	max-height: var(--reka-dropdown-menu-content-available-height);
	overflow-y: auto;
}

.item {
	font-size: var(--font-size--2xs);
	line-height: 1;
	border-radius: var(--radius);
	display: flex;
	align-items: center;
	height: var(--spacing--xl);
	padding: var(--spacing--2xs);
	position: relative;
	user-select: none;
	color: var(--color--text--shade-1);
	gap: var(--spacing--3xs);
	outline: none;

	&:not([data-disabled]) {
		&:hover,
		&[data-highlighted],
		&.highlighted {
			background-color: var(--color--foreground--tint-1);
			cursor: pointer;
		}
	}

	&[data-disabled] {
		color: var(--color--text--tint-1);
		cursor: not-allowed;
	}

	:global([data-menu-content]:hover) &.highlighted:not(:hover),
	:global([data-menu-items]:hover) &.highlighted:not(:hover) {
		background-color: transparent;
	}
}

.sub-trigger {
	&[data-state='open'] {
		background-color: var(--color--foreground--tint-1);
	}
}

.sub-indicator {
	margin-left: auto;
	flex-shrink: 0;
	color: var(--color--text--tint-1);
}

.sub-content {
	min-width: 160px;
	border-radius: var(--radius);
	border: var(--border);
	background-color: var(--color--background--light-2);
	box-shadow: var(--shadow);
	z-index: 999999;
}

.item-leading {
	flex-shrink: 0;
}

.emoji {
	font-size: var(--font-size--xs);
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
	background-color: var(--color--foreground);
	margin: var(--spacing--5xs) 0;
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
	color: var(--color--text--tint-1);
	font-size: var(--font-size--sm);
	text-align: center;
}
</style>
