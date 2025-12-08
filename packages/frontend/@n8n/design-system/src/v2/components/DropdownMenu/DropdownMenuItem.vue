<script setup lang="ts" generic="T = string">
import {
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubTrigger,
	DropdownMenuSubContent,
	DropdownMenuPortal,
} from 'reka-ui';
import { computed, ref, useCssModule } from 'vue';

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
}>();

const $style = useCssModule();

const searchTerm = ref('');
const subMenuOpen = ref(false);
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
const searchRef = ref<InstanceType<typeof N8nDropdownMenuSearch> | null>(null);
const subContentRef = ref<InstanceType<typeof DropdownMenuSubContent> | null>(null);

const handleSearchUpdate = (value: string) => {
	searchTerm.value = value;
	emit('search', value, props.id);
};

const handleChildSearch = (term: string, itemId: T) => {
	emit('search', term, itemId);
};

const focusFirstItem = () => {
	const contentEl = subContentRef.value?.$el as HTMLElement | undefined;
	const firstItem = contentEl?.querySelector('[role="menuitem"]') as HTMLElement | null;
	firstItem?.focus();
};

const handleSubContentKeydown = (event: KeyboardEvent) => {
	if (!props.searchable) return;

	if (event.key === 'ArrowUp') {
		const contentEl = subContentRef.value?.$el as HTMLElement | undefined;
		const firstItem = contentEl?.querySelector('[role="menuitem"]') as HTMLElement | null;
		// If the first menu item is focused, move focus to search input
		if (firstItem && document.activeElement === firstItem) {
			event.preventDefault();
			searchRef.value?.focus();
		}
	}
};

const hasChildren = computed(() => props.children && props.children.length > 0);
const hasSubMenu = computed(() => hasChildren.value || props.loading || props.searchable);

const handleSubMenuOpenChange = (open: boolean) => {
	subMenuOpen.value = open;
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
	subMenuOpen.value = false;
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
</script>

<template>
	<div :class="$style.wrapper">
		<DropdownMenuSeparator v-if="divided" :class="$style.separator" />

		<DropdownMenuSub v-if="hasSubMenu" :open="subMenuOpen" @update:open="handleSubMenuOpenChange">
			<DropdownMenuSubTrigger
				:disabled="disabled"
				:class="[$style.item, $style['sub-trigger'], props.class]"
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
						@escape="closeSubMenu"
						@focus-first-item="focusFirstItem"
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
						<template v-for="child in props.children" :key="child.id">
							<N8nDropdownMenuItem
								v-bind="child"
								@select="handleSelect"
								@search="handleChildSearch"
							/>
						</template>
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
			:class="[$style.item, props.class]"
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
		&[data-highlighted] {
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
	padding: var(--spacing--4xs);
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
