<script setup lang="ts" generic="T = string">
import {
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubTrigger,
	DropdownMenuSubContent,
	DropdownMenuPortal,
} from 'reka-ui';
import { computed, ref, useCssModule, watch } from 'vue';

import Icon from '@n8n/design-system/components/N8nIcon/Icon.vue';
import N8nText from '@n8n/design-system/components/N8nText/Text.vue';
import N8nLoading from '@n8n/design-system/v2/components/Loading/Loading.vue';

import type { DropdownMenuItemProps, DropdownMenuItemSlots } from './DropdownMenu.types';
import N8nDropdownMenuSearch from './DropdownMenuSearch.vue';

const SUBMENU_FOCUS_DELAY = 50;

defineOptions({ name: 'N8nDropdownMenuItem', inheritAttrs: false });

const props = withDefaults(defineProps<DropdownMenuItemProps<T>>(), {
	loadingItemCount: 3,
});
defineSlots<DropdownMenuItemSlots<T>>();

const emit = defineEmits<{
	select: [value: T];
	search: [searchTerm: string, itemId: T];
	'update:subMenuOpen': [open: boolean];
}>();

const $style = useCssModule();

const searchTerm = ref('');
const internalSubMenuOpen = ref(false);

const searchRef = ref<{ focus: () => void } | null>(null);

// Virtual focus for sub-menu keyboard navigation
const subMenuHighlightedIndex = ref(-1);

const handleSearchUpdate = (value: string) => {
	searchTerm.value = value;
	emit('search', value, props.id);
};

const handleChildSearch = (term: string, itemId: T) => {
	emit('search', term, itemId);
};

// Find the next valid (non-disabled) child index in the given direction
const getNextValidChildIndex = (current: number, direction: 1 | -1): number => {
	const children = props.children ?? [];
	let next = current + direction;

	while (next >= 0 && next < children.length && children[next].disabled) {
		next += direction;
	}

	if (next >= 0 && next < children.length) {
		return next;
	}

	if (direction === -1) {
		return -1;
	}

	return current;
};

// Handle navigation from sub-menu search input
const handleSubMenuNavigate = (direction: 'up' | 'down') => {
	const children = props.children ?? [];
	if (children.length === 0) return;

	if (direction === 'down') {
		if (subMenuHighlightedIndex.value === -1) {
			subMenuHighlightedIndex.value = getNextValidChildIndex(-1, 1);
		} else {
			subMenuHighlightedIndex.value = getNextValidChildIndex(subMenuHighlightedIndex.value, 1);
		}
	} else if (direction === 'up') {
		if (subMenuHighlightedIndex.value <= 0) {
			subMenuHighlightedIndex.value = -1;
		} else {
			subMenuHighlightedIndex.value = getNextValidChildIndex(subMenuHighlightedIndex.value, -1);
		}
	}
};

const childHasSubMenu = (child: NonNullable<typeof props.children>[number]) => {
	return (child.children && child.children.length > 0) || child.loading || child.searchable;
};

const handleSubMenuEnter = () => {
	const children = props.children ?? [];
	if (subMenuHighlightedIndex.value >= 0) {
		const child = children[subMenuHighlightedIndex.value];
		if (child && !child.disabled && !childHasSubMenu(child)) {
			emit('select', child.id);
			closeSubMenu();
		}
	}
};

const handleSubMenuArrowLeft = () => {
	closeSubMenu();
};

const handleSubContentKeydown = (event: KeyboardEvent) => {
	if (!props.searchable) return;

	if (event.key === 'Enter' && subMenuHighlightedIndex.value >= 0) {
		event.preventDefault();
		handleSubMenuEnter();
	}

	if (event.key === 'ArrowLeft') {
		event.preventDefault();
		handleSubMenuArrowLeft();
	}
};

const hasChildren = computed(() => props.children && props.children.length > 0);
const hasSubMenu = computed(() => hasChildren.value || props.loading || props.searchable);

const handleSubMenuOpenChange = (open: boolean) => {
	internalSubMenuOpen.value = open;
	emit('update:subMenuOpen', open);
	subMenuHighlightedIndex.value = -1; // Reset highlight when menu opens/closes
	if (props.searchable) {
		if (open) {
			setTimeout(() => {
				searchRef.value?.focus();
			}, SUBMENU_FOCUS_DELAY);
		} else {
			searchTerm.value = '';
			emit('search', '', props.id);
		}
	}
};

const closeSubMenu = () => {
	internalSubMenuOpen.value = false;
	emit('update:subMenuOpen', false);
};

const leadingProps = computed(() => ({
	class: $style['item-leading'],
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
		subMenuHighlightedIndex.value = -1;
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
				<N8nText
					:class="$style['item-label']"
					size="medium"
					:color="disabled ? 'text-light' : 'text-dark'"
				>
					{{ label }}
				</N8nText>
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
					@keydown="handleSubContentKeydown"
				>
					<N8nDropdownMenuSearch
						v-if="searchable && !loading"
						ref="searchRef"
						:model-value="searchTerm"
						:placeholder="searchPlaceholder ?? 'Search...'"
						:show-icon="showSearchIcon !== false"
						@update:model-value="handleSearchUpdate"
						@key:escape="closeSubMenu"
						@key:navigate="handleSubMenuNavigate"
						@key:arrow-left="handleSubMenuArrowLeft"
						@key:enter="handleSubMenuEnter"
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
						<div :class="$style['children-container']">
							<template v-for="(child, childIndex) in props.children" :key="child.id">
								<N8nDropdownMenuItem
									v-bind="child"
									:highlighted="searchable && subMenuHighlightedIndex === childIndex"
									@select="handleSelect"
									@search="handleChildSearch"
								/>
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
			<N8nText
				:class="$style['item-label']"
				size="medium"
				:color="disabled ? 'text-light' : 'text-dark'"
			>
				{{ label }}
			</N8nText>
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

<style module>
.wrapper {
	display: contents;
}

.children-container {
	padding: var(--spacing--4xs);
}

.item {
	font-size: var(--font-size--2xs);
	line-height: 1;
	border-radius: var(--radius);
	display: flex;
	align-items: center;
	min-height: var(--spacing--lg);
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
			background-color: var(--color--background--light-1);
			cursor: pointer;
		}
	}

	&[data-disabled] {
		color: var(--color--text--tint-1);
		cursor: not-allowed;
	}
}

.sub-trigger {
	&[data-state='open'] {
		background-color: var(--color--background--light-1);
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
}

.item-check,
.item-trailing {
	margin-left: auto;
	flex-shrink: 0;
}

.separator {
	height: 1px;
	background-color: var(--color--foreground);
	margin: var(--spacing--4xs) 0;
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
