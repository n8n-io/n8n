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

import type { DropdownMenuProps, DropdownMenuSlots } from './DropdownMenu.types';
import N8nDropdownMenuItem from './DropdownMenuItem.vue';

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<DropdownMenuProps<T>>(), {
	placement: 'bottom',
	trigger: 'click',
	activatorIcon: 'ellipsis',
	disabled: false,
	teleported: true,
	hideArrow: false,
	loading: false,
	loadingItemCount: 3,
	searchable: false,
	searchPlaceholder: 'Search...',
	searchDebounce: 300,
});

const emit = defineEmits<{
	'update:modelValue': [open: boolean];
	select: [value: T];
	search: [searchTerm: string];
}>();

const slots = defineSlots<DropdownMenuSlots<T>>();

const $style = useCssModule();

// Handle controlled/uncontrolled state
const internalOpen = ref(props.defaultOpen ?? false);

// Determine if we're in controlled mode (modelValue is explicitly passed)
const isControlled = computed(() => props.modelValue !== undefined);

// Watch for external modelValue changes in controlled mode
watch(
	() => props.modelValue,
	(newValue) => {
		if (newValue !== undefined) {
			internalOpen.value = newValue;
		}
	},
	{ immediate: true },
);

// Pass undefined when uncontrolled to let Reka UI manage its own state
const openState = computed(() => (isControlled.value ? internalOpen.value : undefined));

// Convert placement to Reka UI side + align
type Side = 'top' | 'bottom' | 'left' | 'right';
type Align = 'start' | 'end' | 'center';

const VALID_SIDES: Side[] = ['top', 'bottom', 'left', 'right'];
const VALID_ALIGNS: Align[] = ['start', 'end', 'center'];

const isSide = (value: string): value is Side => VALID_SIDES.includes(value as Side);
const isAlign = (value: string): value is Align => VALID_ALIGNS.includes(value as Align);

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
		return { maxHeight: maxHeightValue, overflowY: 'auto' as const };
	}
	return {};
});

const handleOpenChange = (open: boolean) => {
	internalOpen.value = open;
	emit('update:modelValue', open);

	// Clear search when dropdown closes
	if (props.searchable) {
		if (open) {
			// Focus search input when dropdown opens
			void nextTick(() => {
				searchInputRef.value?.focus();
			});
		} else {
			// Clear search when dropdown closes
			searchTerm.value = '';
			emit('search', '');
		}
	}
};

// Search functionality
const searchInputRef = ref<HTMLInputElement | null>(null);
const contentRef = ref<InstanceType<typeof DropdownMenuContent> | null>(null);
const searchTerm = ref('');

const debouncedEmitSearch = useDebounceFn((term: string) => {
	emit('search', term);
}, props.searchDebounce);

const handleSearchInput = (event: Event) => {
	const target = event.target as HTMLInputElement;
	searchTerm.value = target.value;
	debouncedEmitSearch(target.value);
};

const handleSearchKeydown = (event: KeyboardEvent) => {
	if (event.key === 'Escape') {
		close();
	} else if (event.key === 'Tab' && !event.shiftKey) {
		// Move focus to the first menu item
		event.preventDefault();
		const contentEl = contentRef.value?.$el as HTMLElement | undefined;
		const firstItem = contentEl?.querySelector('[role="menuitem"]') as HTMLElement | null;
		firstItem?.focus();
	} else if (event.key === 'ArrowDown') {
		// Move focus to first menu item only if cursor is at the end of input
		const input = event.target as HTMLInputElement;
		const isAtEnd = input.selectionStart === input.value.length;
		if (isAtEnd) {
			event.preventDefault();
			const contentEl = contentRef.value?.$el as HTMLElement | undefined;
			const firstItem = contentEl?.querySelector('[role="menuitem"]') as HTMLElement | null;
			firstItem?.focus();
		}
	}
};

const handleContentKeydown = (event: KeyboardEvent) => {
	if (!props.searchable) return;

	if (event.key === 'ArrowUp') {
		const contentEl = contentRef.value?.$el as HTMLElement | undefined;
		const firstItem = contentEl?.querySelector('[role="menuitem"]') as HTMLElement | null;
		// If the first menu item is focused, move focus to search input
		if (firstItem && document.activeElement === firstItem) {
			event.preventDefault();
			searchInputRef.value?.focus();
		}
	}
};

const handleItemSelect = (value: T) => {
	emit('select', value);
};

// Expose methods for programmatic control
const open = () => {
	internalOpen.value = true;
	emit('update:modelValue', true);
};

const close = () => {
	internalOpen.value = false;
	emit('update:modelValue', false);
};

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
			<Icon :icon="activatorIcon" />
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
					<!-- Search input -->
					<div v-if="searchable" :class="$style.searchContainer">
						<Icon icon="search" :class="$style.searchIcon" />
						<input
							ref="searchInputRef"
							type="text"
							:class="$style.searchInput"
							:placeholder="searchPlaceholder"
							:value="searchTerm"
							@input="handleSearchInput"
							@keydown.stop="handleSearchKeydown"
						/>
					</div>

					<template v-if="loading">
						<slot name="loading">
							<div :class="$style.loadingContainer">
								<N8nLoading
									v-for="i in loadingItemCount"
									:key="i"
									variant="p"
									:rows="1"
									:class="$style.loadingItem"
								/>
							</div>
						</slot>
					</template>
					<template v-else>
						<template v-for="item in items" :key="item.id">
							<slot name="item" :item="item">
								<N8nDropdownMenuItem v-bind="item" @select="handleItemSelect">
									<template #item-leading="{ ui }">
										<slot name="item-leading" :item="item" :ui="ui">
											<Icon v-if="item.icon" :icon="item.icon" :class="ui.class" />
										</slot>
									</template>
									<template #item-label>
										<slot name="item-label" :item="item">
											{{ item.label }}
										</slot>
									</template>
									<template #item-trailing="{ ui }">
										<slot name="item-trailing" :item="item" :ui="ui" />
									</template>
								</N8nDropdownMenuItem>
							</slot>
						</template>
					</template>
				</template>

				<Icon v-if="!hideArrow" icon="chevron-up" :class="$style.arrow" />
			</DropdownMenuContent>
		</component>
	</DropdownMenuRoot>
</template>

<style module>
.activator {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 30px;
	height: 30px;
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
		box-shadow: 0 0 0 2px var(--color--primary);
	}

	&[data-disabled] {
		color: var(--color--text--tint-1);
		cursor: not-allowed;
	}
}

.content {
	min-width: 160px;
	padding: var(--spacing--4xs);
	border-radius: var(--radius);
	border: var(--border);
	background-color: var(--color--background--light-2);
	box-shadow: var(--shadow);
	/**
	 * High z-index to ensure dropdown is above other elements
	 * TODO: Replace with design system z-index variable when available
	 */
	z-index: 999999;
}

.arrow {
	position: absolute;
	top: -8px;
	left: 50%;
	transform: translateX(-50%);
	color: var(--color--background--light-2);
	filter: drop-shadow(0 -1px 0 var(--color--foreground));

	/* Hide by default, shown based on hideArrow prop */
	display: none;
}

.loadingContainer {
	padding: var(--spacing--4xs);
}

.loadingItem {
	margin-bottom: var(--spacing--4xs);

	&:last-child {
		margin-bottom: 0;
	}
}

.searchContainer {
	display: flex;
	align-items: center;
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-bottom: var(--border);
	margin-bottom: var(--spacing--4xs);
	gap: var(--spacing--3xs);
}

.searchIcon {
	color: var(--color--text--tint-1);
	flex-shrink: 0;
}

.searchInput {
	flex: 1;
	min-width: 0;
	border: none;
	background: transparent;
	outline: none;
	font-family: inherit;
	font-size: var(--font-size--2xs);
	color: var(--color--text--shade-1);
	padding: var(--spacing--4xs) 0;

	&::placeholder {
		color: var(--color--text--tint-1);
	}
}
</style>
