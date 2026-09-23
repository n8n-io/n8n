<script setup lang="ts">
import {
	N8nDropdownMenu,
	N8nIconButton,
	N8nTooltip,
	type DropdownMenuExposed,
	type DropdownMenuItemProps,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useDebounceFn } from '@vueuse/core';
import { computed, nextTick, ref, watch } from 'vue';

import { DEBOUNCE_TIME } from '@/app/constants';
import { getDebounceTime } from '@n8n/composables/useDebounce';

import type {
	AssistantMentionItem,
	AssistantMentionSelection,
	WorkflowArtifactReference,
} from './assistantAtMentions.types';
import { useArtifactMentionIndex } from './composables/useArtifactMentionIndex';
import {
	createArtifactMentionSourceProvider,
	createWorkflowMentionSourceProvider,
	useAssistantMentionSources,
} from './composables/useAssistantMentionSources';
import { buildMentionAttachment } from './utils/buildMentionAttachment';

interface MentionMenuData {
	item: AssistantMentionItem;
}

type MentionMenuItem = DropdownMenuItemProps<string, MentionMenuData>;

const props = withDefaults(
	defineProps<{
		modelValue: boolean;
		query: string;
		projectId?: string;
		artifacts?: readonly WorkflowArtifactReference[];
		activeWorkflowId?: string;
		excludedKeys?: readonly string[];
		inputElement?: HTMLTextAreaElement | null;
		reference?: HTMLElement | null;
		disabled?: boolean;
	}>(),
	{
		projectId: undefined,
		artifacts: () => [],
		activeWorkflowId: undefined,
		excludedKeys: () => [],
		inputElement: null,
		reference: null,
		disabled: false,
	},
);

const emit = defineEmits<{
	'update:modelValue': [open: boolean];
	select: [selection: AssistantMentionSelection];
}>();

const i18n = useI18n();
const dropdownRef = ref<DropdownMenuExposed>();
const artifactIndex = useArtifactMentionIndex({
	artifacts: () => props.artifacts,
	activeWorkflowId: () => props.activeWorkflowId,
});
const artifactProvider = createArtifactMentionSourceProvider({
	artifacts: () => props.artifacts,
	artifactIndex,
});
const workflowProvider = createWorkflowMentionSourceProvider({
	projectId: () => props.projectId,
	artifactWorkflowIds: () => props.artifacts.map(({ id }) => id),
});
const sources = useAssistantMentionSources([artifactProvider, workflowProvider]);
const searchPending = ref(false);
let highlightedForCurrentOpen = false;
const excludedKeys = computed(() => new Set(props.excludedKeys));

function isMenuItem(item: MentionMenuItem | undefined): item is MentionMenuItem {
	return item !== undefined;
}

function toMenuItem(item: AssistantMentionItem, searchMode: boolean): MentionMenuItem | undefined {
	const indexEntry = artifactIndex.getEntry(item.workflowId);
	const isExcluded = excludedKeys.value.has(item.key);
	const children = item.children?.map((child) => toMenuItem(child, false)).filter(isMenuItem);
	if (isExcluded && children?.length === 0) return undefined;
	if (isExcluded && !item.hasChildren) return undefined;

	return {
		id: item.key,
		label: searchMode ? item.breadcrumbs.join(' > ') : item.label,
		data: { item },
		selectable: item.hasChildren && !isExcluded ? true : undefined,
		children,
		loading:
			item.hasChildren === true && item.children === undefined && indexEntry?.status !== 'error',
		loadingItemCount: 3,
	};
}

const menuItems = computed<MentionMenuItem[]>(() => {
	if (props.query.trim()) {
		return sources.searchResults.value.map((item) => toMenuItem(item, true)).filter(isMenuItem);
	}
	const sections = sources.browseSections.value.map((section) => ({
		...section,
		items: section.items.map((item) => toMenuItem(item, false)).filter(isMenuItem),
	}));

	return sections.flatMap((section) => {
		if (section.items.length === 0) return [];
		return [
			{
				id: `section:${section.id}`,
				label: i18n.baseText(
					section.id === 'artifacts'
						? 'instanceAi.mentions.artifactsSection'
						: 'instanceAi.mentions.workflowsSection',
				),
				header: true,
			},
			...section.items,
		];
	});
});

const itemsById = computed(() => {
	const items = new Map<string, AssistantMentionItem>();
	const visit = (menuItemsToVisit: MentionMenuItem[]) => {
		for (const menuItem of menuItemsToVisit) {
			if (menuItem.data) items.set(menuItem.id, menuItem.data.item);
			if (menuItem.children) visit(menuItem.children);
		}
	};
	visit(menuItems.value);
	return items;
});

const runSearch = useDebounceFn(async (query: string) => {
	if (!props.modelValue || query !== props.query.trim()) return;
	try {
		await sources.search(query);
	} finally {
		if (query === props.query.trim()) searchPending.value = false;
	}
}, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));

watch(
	[() => props.modelValue, () => props.query],
	([open, query]) => {
		if (!open) {
			searchPending.value = false;
			return;
		}
		highlightedForCurrentOpen = false;
		const normalizedQuery = query.trim();
		if (normalizedQuery) {
			searchPending.value = true;
			sources.clearSearchResults();
			void runSearch(normalizedQuery);
		} else {
			searchPending.value = false;
			void sources.browse();
		}
	},
	{ immediate: true },
);

watch(
	() => props.modelValue,
	(open) => {
		highlightedForCurrentOpen = false;
		if (open && menuItems.value.length > 0) {
			highlightedForCurrentOpen = true;
			void nextTick(() => dropdownRef.value?.highlightFirstItem());
		}
	},
);
watch(menuItems, (items) => {
	if (!props.modelValue || highlightedForCurrentOpen || items.length === 0) return;
	highlightedForCurrentOpen = true;
	void nextTick(() => dropdownRef.value?.highlightFirstItem());
});

function handleSelect(itemId: string): void {
	const item = itemsById.value.get(itemId);
	if (!item) return;
	const selection = buildMentionAttachment(item, artifactIndex.getIndex(item.workflowId));
	if (selection) emit('select', selection);
}

function handleSubmenuToggle(itemId: string, open: boolean): void {
	if (!open) return;
	const item = itemsById.value.get(itemId);
	if (!item || item.kind !== 'workflow') return;
	if (artifactIndex.getEntry(item.workflowId)?.status === 'error') {
		void artifactIndex.retry(item.workflowId);
	} else {
		void artifactIndex.load(item.workflowId);
	}
}

function handleExternalKeydown(event: KeyboardEvent): boolean {
	return dropdownRef.value?.handleExternalKeydown(event) ?? false;
}

defineExpose({ handleExternalKeydown });
</script>

<template>
	<N8nDropdownMenu
		ref="dropdownRef"
		:model-value="modelValue"
		:items="menuItems"
		:external-focus-target="inputElement"
		:reference="reference ?? undefined"
		:disabled="disabled"
		:loading="searchPending"
		:empty-text="i18n.baseText('instanceAi.mentions.noResults')"
		placement="top-start"
		searchable
		search-mode="external"
		data-test-id="instance-ai-mention-menu"
		@update:model-value="emit('update:modelValue', $event)"
		@select="handleSelect"
		@submenu:toggle="handleSubmenuToggle"
	>
		<template #trigger>
			<N8nTooltip :content="i18n.baseText('instanceAi.mentions.buttonLabel')" placement="top">
				<N8nIconButton
					icon="at-sign"
					variant="ghost"
					size="medium"
					:title="i18n.baseText('instanceAi.mentions.buttonLabel')"
					:aria-label="i18n.baseText('instanceAi.mentions.buttonLabel')"
					data-test-id="instance-ai-mention-button"
				/>
			</N8nTooltip>
		</template>
	</N8nDropdownMenu>
</template>
