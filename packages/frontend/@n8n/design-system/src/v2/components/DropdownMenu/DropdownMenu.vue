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

// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
const searchRef = ref<InstanceType<typeof N8nDropdownMenuSearch> | null>(null);
const contentRef = ref<InstanceType<typeof DropdownMenuContent> | null>(null);
const searchTerm = ref('');

watch(
	() => props.modelValue,
	(newValue) => {
		if (newValue !== undefined) {
			internalOpen.value = newValue;
		}
	},
	{ immediate: true },
);

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

const focusFirstItem = () => {
	const contentEl = contentRef.value?.$el as HTMLElement | undefined;
	const firstItem = contentEl?.querySelector('[role="menuitem"]') as HTMLElement | null;
	firstItem?.focus();
};

const handleContentKeydown = (event: KeyboardEvent) => {
	if (!props.searchable) return;

	if (event.key === 'ArrowUp') {
		const contentEl = contentRef.value?.$el as HTMLElement | undefined;
		const firstItem = contentEl?.querySelector('[role="menuitem"]') as HTMLElement | null;
		// If the first menu item is focused, move focus to search input
		if (firstItem && document.activeElement === firstItem) {
			event.preventDefault();
			searchRef.value?.focus();
		}
	}
};

const handleItemSelect = (value: T) => {
	emit('select', value);
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
						@escape="close"
						@focus-first-item="focusFirstItem"
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
						<template v-for="item in items" :key="item.id">
							<slot name="item" :item="item">
								<N8nDropdownMenuItem
									v-bind="item"
									@select="handleItemSelect"
									@search="handleItemSearch"
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
