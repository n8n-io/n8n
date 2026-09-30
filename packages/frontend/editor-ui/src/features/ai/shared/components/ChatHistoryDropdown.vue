<script setup lang="ts">
import { getRelativeDate } from '@/features/ai/chatHub/chat.utils';
import { N8nActionDropdown, N8nDropdownMenu, N8nIconButton, N8nText } from '@n8n/design-system';
import type { ActionDropdownItem, DropdownMenuItemProps } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useEventListener } from '@vueuse/core';
import { computed, onBeforeUnmount, ref, useId } from 'vue';

export interface ChatHistoryItemData {
	updatedAt?: string;
	actions?: Array<ActionDropdownItem<string>>;
}

export type ChatHistoryItem = DropdownMenuItemProps<string, ChatHistoryItemData>;

const DOUBLE_CLICK_DELAY = 300;

const props = withDefaults(
	defineProps<{
		items: ChatHistoryItem[];
		searchPlaceholder: string;
		contentTestId: string;
		contentId?: string;
		actionButtonLabel: string;
		modelValue?: boolean;
		dataTestId?: string;
		maxHeight?: string | number;
		loading?: boolean;
		emptyText?: string;
		editingItemId?: string;
		actionsDisabled?: boolean;
		itemDoubleClickEnabled?: boolean;
	}>(),
	{
		modelValue: undefined,
		contentId: undefined,
		dataTestId: undefined,
		maxHeight: undefined,
		loading: false,
		emptyText: undefined,
		editingItemId: undefined,
		actionsDisabled: false,
		itemDoubleClickEnabled: false,
	},
);

const emit = defineEmits<{
	'update:modelValue': [open: boolean];
	search: [query: string];
	select: [itemId: string];
	action: [actionId: string, itemId: string];
	'item-dblclick': [itemId: string];
}>();

const slots = defineSlots<{
	trigger?: () => unknown;
	loading?: () => unknown;
	empty?: () => unknown;
	footer?: () => unknown;
	'item-edit'?: (props: { item: ChatHistoryItem; ui: { class: string } }) => unknown;
	'item-trailing'?: (props: { item: ChatHistoryItem }) => unknown;
}>();

const i18n = useI18n();
const generatedContentId = useId();
const contentId = computed(() => props.contentId ?? generatedContentId);
const dropdownRef = ref<{
	close: () => void;
	highlightFirstItem: () => void;
	focusTrigger: () => void;
} | null>(null);
let pendingItemClick: ReturnType<typeof setTimeout> | undefined;
const groupOrder = ['Today', 'Yesterday', 'This week', 'Older'] as const;
const groupLabels = {
	Today: i18n.baseText('userActivity.today'),
	Yesterday: i18n.baseText('userActivity.yesterday'),
	'This week': i18n.baseText('instanceAi.sidebar.group.thisWeek'),
	Older: i18n.baseText('instanceAi.sidebar.group.older'),
};

const groupedItems = computed<ChatHistoryItem[]>(() => {
	const groups = new Map<(typeof groupOrder)[number], ChatHistoryItem[]>();
	const undated: ChatHistoryItem[] = [];
	const now = new Date();

	for (const item of props.items) {
		if (!item.data?.updatedAt) {
			undated.push(item);
			continue;
		}

		const relativeDate = getRelativeDate(now, item.data.updatedAt);
		const group = groupOrder.find((name) => name === relativeDate) ?? 'Older';
		const items = groups.get(group) ?? [];
		items.push(item);
		groups.set(group, items);
	}

	return [
		...groupOrder.flatMap((group) => {
			const items = (groups.get(group) ?? []).sort(
				(a, b) => Date.parse(b.data?.updatedAt ?? '') - Date.parse(a.data?.updatedAt ?? ''),
			);
			return items.length > 0
				? [{ id: `group-${group}`, label: groupLabels[group], header: true }, ...items]
				: [];
		}),
		...undated,
	];
});

const cancelPendingItemClick = () => {
	if (pendingItemClick) clearTimeout(pendingItemClick);
	pendingItemClick = undefined;
};

const handleItemClick = (event: MouseEvent, item: ChatHistoryItem) => {
	if (!props.itemDoubleClickEnabled || item.disabled) return;

	event.stopPropagation();
	cancelPendingItemClick();
	if (event.detail > 1) return;

	pendingItemClick = setTimeout(() => {
		pendingItemClick = undefined;
		emit('select', item.id);
		dropdownRef.value?.close();
	}, DOUBLE_CLICK_DELAY);
};

const handleItemDoubleClick = (item: ChatHistoryItem) => {
	if (item.disabled) return;
	cancelPendingItemClick();
	emit('item-dblclick', item.id);
};

onBeforeUnmount(cancelPendingItemClick);

useEventListener(
	document,
	'keydown',
	(event: KeyboardEvent) => {
		if (!(event.target instanceof HTMLElement)) return;
		const menu = event.target.closest<HTMLElement>('[data-menu-content]');
		if (menu?.id !== contentId.value) return;

		if (event.key === 'Tab') {
			const focusableElements = [...menu.querySelectorAll<HTMLElement>('*')].filter(
				(element) => element.tabIndex >= 0 && !element.matches(':disabled, [aria-disabled="true"]'),
			);
			const currentIndex = focusableElements.indexOf(event.target);
			const nextIndex = currentIndex + (event.shiftKey ? -1 : 1);

			if (currentIndex >= 0 && focusableElements[nextIndex]) event.stopPropagation();
			return;
		}

		if (event.key === 'Enter' && event.target.closest('button')) event.stopPropagation();
	},
	{ capture: true },
);

const highlightFirstItem = () => {
	dropdownRef.value?.highlightFirstItem();
};

const focusTrigger = () => {
	dropdownRef.value?.focusTrigger();
};

defineExpose({ highlightFirstItem, focusTrigger });
</script>

<template>
	<N8nDropdownMenu
		ref="dropdownRef"
		:id="contentId"
		:model-value="props.modelValue"
		:items="groupedItems"
		:loading="props.loading"
		:max-height="props.maxHeight"
		:data-test-id="props.dataTestId"
		:content-test-id="props.contentTestId"
		:search-placeholder="props.searchPlaceholder"
		:empty-text="props.emptyText"
		:extra-popper-class="$style.menuContent"
		width="calc(var(--spacing--5xl) + var(--spacing--3xl) + var(--spacing--xl))"
		placement="bottom-start"
		searchable
		@update:model-value="emit('update:modelValue', $event)"
		@search="emit('search', $event)"
		@select="emit('select', $event)"
	>
		<template v-if="slots.trigger" #trigger>
			<slot name="trigger" />
		</template>
		<template v-if="slots.loading" #loading>
			<slot name="loading" />
		</template>
		<template v-if="slots.empty" #empty>
			<slot name="empty" />
		</template>

		<template #item-label="{ item, ui }">
			<slot
				v-if="item.data && props.editingItemId === item.id"
				name="item-edit"
				:item="item"
				:ui="ui"
			/>
			<N8nText
				v-else
				:class="[ui.class, $style.itemLabel]"
				:title="item.label"
				size="medium"
				:color="item.disabled ? 'text-xlight' : 'text-dark'"
				@click="handleItemClick($event, item)"
				@dblclick.stop="handleItemDoubleClick(item)"
			>
				{{ item.label }}
			</N8nText>
		</template>

		<template #item-trailing="{ item, ui }">
			<div
				v-if="item.data && (slots['item-trailing'] || item.data.actions?.length)"
				:class="[ui.class, $style.itemTrailing]"
				@click.stop
			>
				<slot name="item-trailing" :item="item" />
				<N8nActionDropdown
					v-if="item.data.actions?.length"
					:items="item.data.actions"
					:class="$style.actionDropdown"
					placement="bottom-start"
					:disabled="props.actionsDisabled || item.disabled"
					suppress-close-auto-focus
					@select="emit('action', $event, item.id)"
				>
					<template #activator>
						<N8nIconButton
							variant="ghost"
							icon="ellipsis-vertical"
							:disabled="props.actionsDisabled || item.disabled"
							:aria-label="props.actionButtonLabel"
						/>
					</template>
				</N8nActionDropdown>
			</div>
		</template>

		<template v-if="slots.footer" #footer>
			<slot name="footer" />
		</template>
	</N8nDropdownMenu>
</template>

<style lang="scss" module>
.menuContent {
	width: var(--n8n--dropdown-menu-width);
}

.itemLabel {
	display: block;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.itemTrailing {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.actionDropdown {
	margin-block: calc(var(--spacing--2xs) * -1);
}

@media (hover: hover) {
	.actionDropdown {
		width: 0;
		overflow: hidden;
		opacity: 0;
	}

	:global([role='menuitem']:hover) .actionDropdown,
	:global([role='menuitem'][aria-selected='true']) .actionDropdown,
	:global([role='menuitem']:focus-within) .actionDropdown,
	.actionDropdown:has([aria-expanded='true']) {
		width: auto;
		opacity: 1;
	}
}
</style>
