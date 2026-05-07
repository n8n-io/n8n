<script setup lang="ts">
import type { SuggestionKeyDownProps } from '@tiptap/suggestion';
import type { ReferenceElement } from '@floating-ui/vue';
import { computed, nextTick, ref, watch } from 'vue';
import type { ComponentPublicInstance } from 'vue';

import N8nIcon from '../../../N8nIcon';
import N8nPopover from '../../../N8nPopover';
import type { SuggestionMenuItem } from './types';

const props = defineProps<{
	items: SuggestionMenuItem[];
	selectedIndex?: number;
	ariaLabel: string;
	clientRect?: (() => DOMRect | null) | null;
	dataTestId?: string;
	itemDataTestIdPrefix?: string;
}>();

const emit = defineEmits<{
	select: [item: SuggestionMenuItem];
}>();

const reference = computed<ReferenceElement | undefined>(() => {
	if (!props.clientRect) return undefined;

	return {
		getBoundingClientRect: () => props.clientRect?.() ?? new DOMRect(),
	};
});

const activeIndex = ref(0);
const itemRefs = ref<HTMLButtonElement[]>([]);

const clampIndex = (index: number) => {
	if (props.items.length === 0) return 0;
	if (!Number.isFinite(index)) return 0;

	return Math.max(0, Math.min(index, props.items.length - 1));
};

const selectNextItem = () => {
	activeIndex.value = clampIndex(activeIndex.value + 1);
};

const selectPreviousItem = () => {
	activeIndex.value = clampIndex(activeIndex.value - 1);
};

const selectFirstItem = () => {
	activeIndex.value = 0;
};

const selectLastItem = () => {
	activeIndex.value = clampIndex(props.items.length - 1);
};

watch(
	() => [props.items, props.selectedIndex] as const,
	() => {
		activeIndex.value = clampIndex(props.selectedIndex ?? 0);
	},
	{ immediate: true },
);

const activeItemId = computed(() => props.items[activeIndex.value]?.id);
const getItemId = (item: SuggestionMenuItem) => `suggestion-menu-item-${item.id}`;
const getItemDataTestId = (item: SuggestionMenuItem) =>
	props.itemDataTestIdPrefix ? `${props.itemDataTestIdPrefix}-${item.id}` : undefined;

const setItemRef = (element: Element | ComponentPublicInstance | null, index: number) => {
	if (element instanceof HTMLButtonElement) {
		itemRefs.value[index] = element;
	}
};

const scrollActiveItemIntoView = async () => {
	await nextTick();
	itemRefs.value[activeIndex.value]?.scrollIntoView({ block: 'nearest' });
};

watch(activeIndex, () => {
	void scrollActiveItemIntoView();
});

watch(
	() => props.items,
	() => {
		itemRefs.value = [];
		void scrollActiveItemIntoView();
	},
);

const handleKeyDown = (event: KeyboardEvent) => {
	if (event.key === 'ArrowDown') {
		if (event.metaKey) {
			selectLastItem();
		} else {
			selectNextItem();
		}

		return true;
	}

	if (event.key === 'ArrowUp') {
		if (event.metaKey) {
			selectFirstItem();
		} else {
			selectPreviousItem();
		}

		return true;
	}

	if (event.key === 'Enter') {
		const selectedItem = props.items[activeIndex.value];

		if (!selectedItem) return false;

		emit('select', selectedItem);
		return true;
	}

	return false;
};

const onKeyDown = ({ event }: SuggestionKeyDownProps) => handleKeyDown(event);

defineExpose({ onKeyDown });
</script>

<template>
	<N8nPopover
		:open="items.length > 0"
		:reference="reference"
		width="240px"
		max-height="280px"
		:content-class="$style.popover"
		:suppress-auto-focus="true"
		:enable-slide-in="false"
		:show-arrow="false"
		content-role="listbox"
	>
		<template #trigger>
			<span :class="$style.virtualTrigger" aria-hidden="true" />
		</template>

		<template #content>
			<div
				:class="$style.list"
				:aria-label="ariaLabel"
				:aria-activedescendant="activeItemId ? `suggestion-menu-item-${activeItemId}` : undefined"
				:data-test-id="dataTestId"
			>
				<button
					v-for="(item, index) in items"
					:id="getItemId(item)"
					:ref="(element) => setItemRef(element, index)"
					:key="item.id"
					tabindex="-1"
					type="button"
					role="option"
					:aria-selected="index === activeIndex"
					:class="[$style.item, index === activeIndex ? $style.selected : '']"
					:data-test-id="getItemDataTestId(item)"
					@mousedown.prevent
					@click="emit('select', item)"
				>
					<span :class="$style.icon">
						<N8nIcon v-if="item.icon" :icon="item.icon" />
					</span>
					<span :class="$style.label">{{ item.label }}</span>
				</button>
			</div>
		</template>
	</N8nPopover>
</template>

<style lang="scss" module>
.popover {
	padding: var(--spacing--4xs);
}

.virtualTrigger {
	position: fixed;
	width: 0;
	height: 0;
	pointer-events: none;
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	scrollbar-color: transparent;
}

.item {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	min-height: var(--height--md);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border: 0;
	border-radius: var(--radius);
	background: transparent;
	color: var(--text-color--subtle);
	font-weight: var(--font-weight--medium);
	font-size: var(--font-size--sm);
	text-align: left;
	cursor: pointer;
	user-select: none;

	&:hover,
	&.selected {
		background-color: var(--background--hover);
	}

	&:focus {
		outline: none;
		background-color: var(--background--hover);
	}
}

.icon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	color: var(--text-color--subtle);
	opacity: 0.8;
}

.label {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
