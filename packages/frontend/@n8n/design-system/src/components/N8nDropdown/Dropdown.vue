<script setup lang="ts" generic="T extends string | number">
import {
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuPortal,
	DropdownMenuRoot,
	DropdownMenuTrigger,
} from 'reka-ui';
import { ref, useTemplateRef, computed } from 'vue';

import N8nIcon from '../N8nIcon';
import N8nLoading from '../N8nLoading';
import type { IconSize } from '../../types/icon';

const SIZE = ['mini', 'small', 'medium'] as const;
const THEME = ['default', 'dark'] as const;
const ICON_ORIENTATION = ['horizontal', 'vertical'] as const;

export interface N8nDropdownOption<V = string | number> {
	label: string;
	value: V;
	disabled?: boolean;
}

export interface N8nDropdownAction<V = string | number> {
	label: string;
	value: V;
	disabled?: boolean;
	type?: 'external-link';
}

interface Props<T extends string | number> {
	options?: Array<N8nDropdownOption<T>>;
	actions?: Array<N8nDropdownAction<T>>;
	disabled?: boolean;
	placeholder?: string;
	size?: (typeof SIZE)[number];
	theme?: (typeof THEME)[number];
	iconSize?: IconSize;
	iconOrientation?: (typeof ICON_ORIENTATION)[number];
	loading?: boolean;
	loadingRowCount?: number;
}

const props = withDefaults(defineProps<Props<T>>(), {
	options: () => [],
	actions: () => [],
	disabled: false,
	placeholder: 'Select an option',
	size: 'medium',
	theme: 'default',
	iconSize: 'medium',
	iconOrientation: 'vertical',
	loading: false,
	loadingRowCount: 3,
});

const emit = defineEmits<{
	select: [value: T];
	action: [value: T];
	'update:open': [value: boolean];
	'item-mouseup': [item: N8nDropdownAction<T>];
}>();

const isOpen = ref(false);
const rootRef = useTemplateRef<HTMLElement>('rootRef');

const items = computed(() => (props.actions.length > 0 ? props.actions : props.options));

const handleOpenChange = (value: boolean) => {
	isOpen.value = value;
	emit('update:open', value);
};

const open = () => {
	if (!props.disabled) {
		isOpen.value = true;
	}
};

const close = () => {
	isOpen.value = false;
};

const scrollIntoView = (options?: ScrollIntoViewOptions) => {
	rootRef.value?.scrollIntoView(options);
};

const handleSelect = (item: N8nDropdownOption<T> | N8nDropdownAction<T>) => {
	if (!item.disabled) {
		emit('select', item.value);
		emit('action', item.value);
		close();
	}
};

defineExpose({
	open,
	close,
	scrollIntoView,
});
</script>

<template>
	<div ref="rootRef" :class="[$style.container]">
		<DropdownMenuRoot :open="isOpen" @update:open="handleOpenChange">
			<DropdownMenuTrigger
				v-if="!$slots.trigger"
				:class="[$style.button, $style[theme]]"
				:aria-label="placeholder"
				:disabled="disabled"
				data-test-id="dropdown-trigger"
			>
				<N8nIcon
					:icon="iconOrientation === 'horizontal' ? 'ellipsis' : 'ellipsis-vertical'"
					:size="iconSize"
				/>
			</DropdownMenuTrigger>
			<DropdownMenuTrigger v-else as-child :disabled="disabled">
				<slot name="trigger" />
			</DropdownMenuTrigger>

			<DropdownMenuPortal>
				<DropdownMenuContent :class="$style.content" :side-offset="4" align="start">
					<template v-if="loading">
						<div :class="$style['loading-dropdown']" data-test-id="dropdown-loading">
							<div v-for="index in loadingRowCount" :key="index" :class="$style.loadingItem">
								<N8nLoading animated variant="text" />
							</div>
						</div>
					</template>
					<template v-else>
						<DropdownMenuItem
							v-for="item in items"
							:key="item.value"
							:disabled="item.disabled"
							:class="$style.item"
							:data-test-id="`dropdown-option-${item.value}`"
							@select="handleSelect(item)"
							@mouseup="emit('item-mouseup', item)"
						>
							<span :class="$style.itemText">
								{{ item.label }}
							</span>
							<N8nIcon
								v-if="item.type === 'external-link'"
								icon="external-link"
								size="xsmall"
								color="text-base"
							/>
						</DropdownMenuItem>
					</template>
				</DropdownMenuContent>
			</DropdownMenuPortal>
		</DropdownMenuRoot>
	</div>
</template>

<style lang="scss" module>
.container > * {
	line-height: 1;
}

.button {
	cursor: pointer;
	padding: var(--spacing--4xs);
	border-radius: var(--radius);
	display: flex;
	align-items: center;
	justify-content: center;

	&:hover {
		color: var(--color--primary);
		cursor: pointer;
	}

	&:focus {
		color: var(--color--primary);
	}
}

.dark {
	color: var(--color--text--shade-1);

	&:focus {
		background-color: var(--color--background--light-3);
	}
}

.content {
	min-width: 160px;
	max-width: 320px;
	background-color: var(--color--foreground--tint-2);
	border: var(--border);
	border-radius: var(--radius--lg);
	box-shadow: var(--shadow--light);
	z-index: 9999;
	overflow: hidden;
	padding: var(--spacing--3xs) 0;
}

.item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	padding: 0 var(--spacing--sm);
	min-height: 32px;
	line-height: 32px;
	cursor: pointer;
	user-select: none;
	font-size: var(--font-size--2xs);
	color: var(--color--text);
	transition:
		background-color var(--animation--duration) var(--animation--easing),
		color var(--animation--duration) var(--animation--easing);

	&[data-highlighted]:not([data-disabled]) {
		background-color: var(--color--background);
		color: var(--color--text--shade-1);
		outline: none;
	}

	&[data-disabled] {
		cursor: not-allowed;
		color: var(--color--text--tint-2);
		pointer-events: none;
	}
}

.itemText {
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.loading-dropdown {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.loadingItem {
	padding: 0 var(--spacing--sm);
}
</style>
