<script setup lang="ts" generic="T = string">
import {
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubTrigger,
	DropdownMenuSubContent,
	DropdownMenuPortal,
} from 'reka-ui';
import { computed, useCssModule } from 'vue';

import Icon from '@n8n/design-system/components/N8nIcon/Icon.vue';
import N8nLoading from '@n8n/design-system/v2/components/Loading/Loading.vue';

import type { DropdownMenuItemProps, DropdownMenuItemSlots } from './DropdownMenu.types';

defineOptions({ name: 'N8nDropdownMenuItem', inheritAttrs: false });

const props = withDefaults(defineProps<DropdownMenuItemProps<T>>(), {
	loadingItemCount: 3,
});
defineSlots<DropdownMenuItemSlots<T>>();

const emit = defineEmits<{
	select: [value: T];
}>();

const $style = useCssModule();

const hasChildren = computed(() => props.children && props.children.length > 0);
const hasSubMenu = computed(() => hasChildren.value || props.loading);

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

		<DropdownMenuSub v-if="hasSubMenu">
			<DropdownMenuSubTrigger
				:disabled="disabled"
				:class="[$style.item, $style['sub-trigger'], props.class]"
			>
				<slot name="item-leading" :item="props" :ui="leadingProps">
					<Icon v-if="icon" :icon="icon" :class="$style['item-leading']" />
				</slot>

				<span :class="$style['item-label']">
					<slot name="item-label" :item="props">
						{{ label }}
					</slot>
				</span>

				<Icon icon="chevron-right" :class="$style['sub-indicator']" />
			</DropdownMenuSubTrigger>

			<DropdownMenuPortal>
				<DropdownMenuSubContent :class="$style['sub-content']" :side-offset="4">
					<div v-if="loading" :class="$style['loading-container']">
						<N8nLoading
							v-for="i in loadingItemCount"
							:key="i"
							variant="p"
							:rows="1"
							:class="$style['loading-item']"
						/>
					</div>
					<template v-else-if="hasChildren">
						<template v-for="child in props.children" :key="child.id">
							<N8nDropdownMenuItem v-bind="child" @select="handleSelect" />
						</template>
					</template>
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
				<Icon v-if="icon" :icon="icon" :class="$style['item-leading']" />
			</slot>

			<span :class="$style['item-label']">
				<slot name="item-label" :item="props">
					{{ label }}
				</slot>
			</span>

			<slot name="item-trailing" :item="props" :ui="trailingProps" />

			<Icon v-if="checked" icon="check" :class="$style['item-check']" />
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
	padding: var(--spacing--3xs) var(--spacing--2xs);
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
	margin: var(--spacing--4xs) var(--spacing--2xs);
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
</style>
