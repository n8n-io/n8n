<script setup lang="ts" generic="T extends ContextMenuId = ContextMenuId">
import {
	ContextMenuCheckboxItem,
	ContextMenuItem as RekaContextMenuItem,
	ContextMenuItemIndicator,
	ContextMenuPortal,
	ContextMenuRadioItem,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
} from 'reka-ui';
import { computed, inject, ref, useCssModule } from 'vue';

import {
	contextMenuStateKey,
	type ContextMenuId,
	type ContextMenuItemEmits,
	type ContextMenuItemProps,
	type ContextMenuItemSlots,
} from './ContextMenu.types';
import ContextMenuBody from './ContextMenuBody.vue';
import ContextMenuItemContent from './ContextMenuItemContent.vue';
import type { TextColor } from '../../types/text';
import Icon from '../N8nIcon/Icon.vue';

defineOptions({ name: 'N8nContextMenuItem', inheritAttrs: false });

const props = defineProps<ContextMenuItemProps<T>>();

const emit = defineEmits<ContextMenuItemEmits<T>>();
const slots = defineSlots<ContextMenuItemSlots<T>>();
const $style = useCssModule();
const state = inject(contextMenuStateKey);

type ItemTone = 'disabled' | 'destructive' | 'default';

const TEXT_COLOR: Record<Exclude<ItemTone, 'destructive'>, TextColor> = {
	disabled: 'text-xlight',
	default: 'text-dark',
};

const ICON_COLOR = {
	disabled: '--icon-color--subtle',
	destructive: '--icon-color--danger',
	default: '--icon-color',
} as const;

/** Pixel value of `--spacing--4xs` / `--context-menu--padding`. Reka `alignOffset` is a number. */
const ITEMS_PADDING_PX = 4;
/** Shift the submenu up so its first row lines up with the trigger. */
const SUBMENU_ALIGN_OFFSET_PX = -ITEMS_PADDING_PX;
/** Matches the 1px inset outline (`--shadow--outline`). */
const SUBMENU_SIDE_OFFSET_PX = 1;
/** Pixel value of `--spacing--2xs`. Reka `collisionPadding` is a number. */
const COLLISION_PADDING_PX = 8;

const isChecked = computed(() => state?.selectedValues.value.includes(props.item.id) ?? false);

const isDestructive = computed(
	() => props.item.type === 'item' && props.item.variant === 'destructive',
);
const itemTestId = computed(() => `context-menu-item-${props.item.id}`);

const titleAttr = computed(() => (props.item.label.length >= 20 ? props.item.label : undefined));
const tone = computed(() => {
	if (props.item.disabled) return 'disabled';
	if (isDestructive.value) return 'destructive';
	return 'default';
});
const textColor = computed(() =>
	tone.value === 'destructive' ? undefined : TEXT_COLOR[tone.value],
);
const iconColor = computed(() => ICON_COLOR[tone.value]);

const rowClass = computed(() => [
	$style.item,
	props.item.class,
	isDestructive.value && $style.destructive,
	props.item.disabled && 'is-disabled',
]);

function onCommandSelect(event: Event) {
	if (props.item.disabled || props.item.type !== 'item') return;
	if (props.item.keepOpen) event.preventDefault();
	emit('select', props.item.id);
	state?.onSelect(props.item.id, props.item.keepOpen);
}

function onCheckboxSelect(event: Event) {
	event.preventDefault();
	if (props.item.disabled) return;
	emit('toggle-checkbox', props.item.id);
	state?.onToggleCheckbox(props.item.id);
}

function onRadioSelect(event: Event) {
	event.preventDefault();
}

const submenuOpen = ref(false);

function handleSubmenuOpenChange(open: boolean) {
	submenuOpen.value = open;
	emit('submenu:toggle', open);
	state?.onSubmenuToggle(props.item.id, open);
}
</script>

<template>
	<ContextMenuSub
		v-if="item.type === 'submenu'"
		:open="submenuOpen"
		@update:open="handleSubmenuOpenChange"
	>
		<ContextMenuSubTrigger
			:disabled="item.disabled"
			:data-test-id="itemTestId"
			:class="[$style.subTrigger, rowClass]"
		>
			<ContextMenuItemContent
				:item="item"
				:text-color="textColor"
				:icon-color="iconColor"
				:title="titleAttr"
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
			</ContextMenuItemContent>
			<Icon icon="chevron-right" :class="$style.subIndicator" :color="iconColor" size="large" />
		</ContextMenuSubTrigger>
		<ContextMenuPortal>
			<ContextMenuSubContent
				:class="[$style.subContent, state?.contentClass.value]"
				align="start"
				:align-offset="SUBMENU_ALIGN_OFFSET_PX"
				:side-offset="SUBMENU_SIDE_OFFSET_PX"
				:collision-padding="COLLISION_PADDING_PX"
				:prioritize-position="true"
				sticky="partial"
			>
				<ContextMenuBody
					:nodes="item.children"
					:loading="item.loading"
					:loading-item-count="item.loadingItemCount"
				>
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
					<template v-if="slots.empty" #empty>
						<slot name="empty" />
					</template>
				</ContextMenuBody>
			</ContextMenuSubContent>
		</ContextMenuPortal>
	</ContextMenuSub>

	<ContextMenuCheckboxItem
		v-else-if="item.type === 'checkbox'"
		:model-value="isChecked"
		:disabled="item.disabled"
		:data-test-id="itemTestId"
		:class="rowClass"
		@select="onCheckboxSelect"
	>
		<ContextMenuItemContent
			:item="item"
			:text-color="textColor"
			:icon-color="iconColor"
			:title="titleAttr"
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
		</ContextMenuItemContent>
		<ContextMenuItemIndicator as-child>
			<Icon icon="check" :class="$style.indicator" size="large" :color="iconColor" />
		</ContextMenuItemIndicator>
	</ContextMenuCheckboxItem>

	<ContextMenuRadioItem
		v-else-if="item.type === 'radio'"
		:value="item.id"
		:disabled="item.disabled"
		:data-test-id="itemTestId"
		:class="rowClass"
		@select="onRadioSelect"
	>
		<ContextMenuItemContent
			:item="item"
			:text-color="textColor"
			:icon-color="iconColor"
			:title="titleAttr"
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
		</ContextMenuItemContent>
		<ContextMenuItemIndicator as-child>
			<Icon icon="check" :class="$style.indicator" size="large" :color="iconColor" />
		</ContextMenuItemIndicator>
	</ContextMenuRadioItem>

	<RekaContextMenuItem
		v-else-if="item.type === 'item'"
		:disabled="item.disabled"
		:data-test-id="itemTestId"
		:class="rowClass"
		@select="onCommandSelect"
	>
		<ContextMenuItemContent
			:item="item"
			:text-color="textColor"
			:icon-color="iconColor"
			:title="titleAttr"
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
		</ContextMenuItemContent>
	</RekaContextMenuItem>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/floating-item' as floating-item;
@use './context-menu' as context-menu;

.item {
	@include floating-item.floating-item;
	min-width: 0;

	&:not([data-disabled]) {
		&:hover,
		&[data-highlighted] {
			background-color: var(--background--hover);
			cursor: pointer;
		}
	}

	&[data-disabled] {
		color: var(--text-color--disabled);
		cursor: not-allowed;
	}
}

.destructive:not([data-disabled]) {
	color: var(--text-color--danger);

	&:hover,
	&[data-highlighted] {
		background-color: var(--background--danger);
	}
}

.subTrigger {
	padding-inline-end: var(--spacing--5xs);

	&:not([data-disabled]) {
		&[data-state='open'] {
			background-color: var(--background--hover);
		}
	}
}

.subIndicator {
	margin-left: auto;
	flex-shrink: 0;
}

.subContent {
	@include context-menu.panel;
}

.indicator {
	margin-left: auto;
	flex-shrink: 0;
}
</style>
