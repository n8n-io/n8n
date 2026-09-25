<script setup lang="ts">
import {
	N8nDropdownMenu,
	N8nButton,
	N8nIcon,
	N8nIconButton,
	N8nText,
	N8nTooltip,
	type DropdownMenuExposed,
	type DropdownMenuItemProps,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useDebounceFn, useElementSize } from '@vueuse/core';
import type { INodeTypeDescription } from 'n8n-workflow';
import { computed, nextTick, ref, watch } from 'vue';

import { DEBOUNCE_TIME } from '@/app/constants';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { getDebounceTime } from '@n8n/composables/useDebounce';

import AssistantMentionBreadcrumbs from './AssistantMentionBreadcrumbs.vue';
import type {
	AssistantMentionItem,
	AssistantMentionPickerOpenMetrics,
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
	nodeType?: INodeTypeDescription | null;
}

const RETRY_ITEM_PREFIX = 'retry:';
const RETRY_SOURCES_ITEM_ID = 'retry-sources';
const ERROR_ITEM_PREFIX = 'error:';
const LOADING_ITEM_PREFIX = 'loading:';

type MentionMenuItem = DropdownMenuItemProps<string, MentionMenuData>;

const props = withDefaults(
	defineProps<{
		modelValue: boolean;
		query: string;
		projectId?: string;
		artifacts?: readonly WorkflowArtifactReference[];
		activeWorkflowId?: string;
		excludedKeys?: readonly string[];
		excludedWorkflowIds?: readonly string[];
		inputElement?: HTMLTextAreaElement | null;
		reference?: HTMLElement | null;
		disabled?: boolean;
	}>(),
	{
		projectId: undefined,
		artifacts: () => [],
		activeWorkflowId: undefined,
		excludedKeys: () => [],
		excludedWorkflowIds: () => [],
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
const nodeTypesStore = useNodeTypesStore();
const dropdownRef = ref<DropdownMenuExposed>();
const referenceElement = computed(() => props.reference);
const { width: referenceWidth } = useElementSize(referenceElement);
const menuWidth = computed(() =>
	referenceWidth.value > 0 ? `${referenceWidth.value}px` : undefined,
);
const excludedKeys = computed(() => new Set(props.excludedKeys));
const artifactIndex = useArtifactMentionIndex({
	artifacts: () => props.artifacts,
	activeWorkflowId: () => props.activeWorkflowId,
});
const artifactProvider = createArtifactMentionSourceProvider({
	artifacts: () => props.artifacts,
	artifactIndex,
	excludedKeys,
});
const workflowProvider = createWorkflowMentionSourceProvider({
	projectId: () => props.projectId,
	artifactWorkflowIds: () => props.artifacts.map(({ id }) => id),
	excludedWorkflowIds: () => props.excludedWorkflowIds,
});
const sources = useAssistantMentionSources([artifactProvider, workflowProvider], { excludedKeys });
const searchPending = ref(false);
let highlightedForCurrentOpen = false;
let submenuOpenCount = 0;

function isMenuItem(item: MentionMenuItem | undefined): item is MentionMenuItem {
	return item !== undefined;
}

function toMenuItem(item: AssistantMentionItem, searchMode: boolean): MentionMenuItem | undefined {
	const indexEntry = artifactIndex.getEntry(item.workflowId);
	const isExcluded = excludedKeys.value.has(item.key);
	let children = item.children?.map((child) => toMenuItem(child, false)).filter(isMenuItem);
	if (isExcluded && children?.length === 0) return undefined;
	if (isExcluded && !item.hasChildren) return undefined;
	if (item.hasChildren && !children) {
		children =
			indexEntry?.status === 'error'
				? [
						{
							id: `${ERROR_ITEM_PREFIX}${item.workflowId}`,
							label: i18n.baseText('instanceAi.mentions.loadError'),
							disabled: true,
						},
						{
							id: `${RETRY_ITEM_PREFIX}${item.workflowId}`,
							label: i18n.baseText('generic.retry'),
							keepOpen: true,
						},
					]
				: [
						{
							id: `${LOADING_ITEM_PREFIX}${item.workflowId}`,
							label: i18n.baseText('instanceAi.mentions.loadingWorkflowContents'),
							disabled: true,
						},
					];
	}
	return {
		id: item.key,
		label: searchMode ? item.breadcrumbs.join(' > ') : item.label,
		data: {
			item,
			...(item.kind === 'node' && item.nodeTypeName
				? {
						nodeType: nodeTypesStore.getNodeType(item.nodeTypeName, item.nodeTypeVersion),
					}
				: {}),
		},
		selectable: item.hasChildren && !isExcluded ? true : undefined,
		children,
	};
}

const menuItems = computed<MentionMenuItem[]>(() => {
	if (props.query.trim()) {
		return sources.searchResults.value.map((item) => toMenuItem(item, true)).filter(isMenuItem);
	}

	const sections = sources.browseSections.value.map((section) => ({
		...section,
		hadItems: section.items.length > 0,
		items: section.items.map((item) => toMenuItem(item, false)).filter(isMenuItem),
	}));
	const hasItems = sections.some((section) => section.items.length > 0);
	if (!hasItems && sources.providerErrors.value.size > 0) return [];

	return sections.flatMap((section) => {
		if (section.id === 'workflows' && section.items.length === 0) {
			if (section.hadItems) return [];
			if (sources.isBrowsing.value) return [];
			if (sources.providerErrors.value.has('workflows')) {
				return [
					{
						id: 'section:workflows',
						label: i18n.baseText('instanceAi.mentions.workflowsSection'),
						header: true,
					},
					{
						id: 'state:workflows-error',
						label: i18n.baseText('instanceAi.mentions.loadError'),
						disabled: true,
					},
					{
						id: RETRY_SOURCES_ITEM_ID,
						label: i18n.baseText('generic.retry'),
						keepOpen: true,
					},
				];
			}
			return [
				{
					id: 'section:workflows',
					label: i18n.baseText('instanceAi.mentions.workflowsSection'),
					header: true,
				},
				{
					id: 'state:no-recent-workflows',
					label: i18n.baseText('instanceAi.mentions.noRecentWorkflows'),
					disabled: true,
				},
			];
		}
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

const isLoading = computed(
	() =>
		(props.query.trim()
			? sources.searchResults.value.length === 0
			: !sources.browseSections.value.some((section) => section.items.length > 0)) &&
		(searchPending.value || sources.isBrowsing.value || sources.isSearching.value),
);

function getResultPosition(itemId: string): number | undefined {
	function find(items: MentionMenuItem[]): number | undefined {
		let position = 0;
		for (const item of items) {
			if (item.header) {
				position = 0;
				continue;
			}
			if (item.data) position++;
			if (item.id === itemId && item.data) return position;
			const childPosition = item.children ? find(item.children) : undefined;
			if (childPosition !== undefined) return childPosition;
		}
		return undefined;
	}

	return find(menuItems.value);
}

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
	() => props.modelValue,
	(open) => {
		if (open) {
			void Promise.resolve(nodeTypesStore.loadNodeTypesIfNotLoaded()).catch(() => undefined);
		}
	},
	{ immediate: true },
);

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
			void artifactIndex.loadAll();
		}
	},
	{ immediate: true },
);

watch(
	() => props.modelValue,
	(open) => {
		highlightedForCurrentOpen = false;
		if (open) submenuOpenCount = 0;
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
	if (itemId === RETRY_SOURCES_ITEM_ID) {
		retrySources();
		return;
	}
	if (itemId.startsWith(RETRY_ITEM_PREFIX)) {
		void artifactIndex.retry(itemId.slice(RETRY_ITEM_PREFIX.length));
		return;
	}
	const item = itemsById.value.get(itemId);
	if (!item) return;
	const selection = buildMentionAttachment(item, artifactIndex.getIndex(item.workflowId));
	if (selection) {
		const resultPosition = getResultPosition(itemId);
		emit('select', {
			...selection,
			...(resultPosition !== undefined
				? {
						telemetry: {
							mode: props.query.trim() ? ('search' as const) : ('browse' as const),
							resultPosition,
							queryLength: props.query.trim().length,
						},
					}
				: {}),
		});
	}
}

function retrySources(): void {
	if (props.query.trim()) {
		void sources.search(props.query);
	} else {
		void sources.browse();
	}
}

function handleSubmenuToggle(itemId: string, open: boolean): void {
	if (!open) return;
	submenuOpenCount++;
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

/**
 * Snapshot of the list for the dismissal telemetry. Read synchronously while the
 * host closes the menu, so it still sees the query and rows the user looked at.
 * Rows sharing a visible label are what the user could not tell apart.
 */
function getOpenMetrics(): AssistantMentionPickerOpenMetrics {
	const rows = menuItems.value.filter((item) => item.data !== undefined);
	const labelCounts = new Map<string, number>();
	for (const row of rows) labelCounts.set(row.label, (labelCounts.get(row.label) ?? 0) + 1);
	const query = props.query.trim();
	return {
		mode: query ? 'search' : 'browse',
		queryLength: query.length,
		resultCount: rows.length,
		ambiguousResultCount: rows.filter((row) => (labelCounts.get(row.label) ?? 0) > 1).length,
		submenuOpenCount,
	};
}

defineExpose({ handleExternalKeydown, getOpenMetrics });
</script>

<template>
	<N8nDropdownMenu
		ref="dropdownRef"
		:model-value="modelValue"
		:items="menuItems"
		:external-focus-target="inputElement"
		:reference="reference ?? undefined"
		:width="menuWidth"
		:extra-popper-class="$style.menuContent"
		:disabled="disabled"
		:loading="isLoading"
		:loading-item-count="10"
		:empty-text="i18n.baseText('instanceAi.mentions.noResults')"
		:search-placeholder="i18n.baseText('instanceAi.mentions.searchPlaceholder')"
		placement="top-start"
		searchable
		search-mode="external"
		data-test-id="instance-ai-mention-menu"
		content-test-id="instance-ai-mention-menu-content"
		@update:model-value="emit('update:modelValue', $event)"
		@select="handleSelect"
		@submenu:toggle="handleSubmenuToggle"
	>
		<template v-if="sources.providerErrors.value.size > 0" #empty>
			<div :class="$style.errorState">
				<N8nText size="small">{{ i18n.baseText('instanceAi.mentions.loadError') }}</N8nText>
				<N8nButton size="small" variant="outline" @click="retrySources">
					{{ i18n.baseText('generic.retry') }}
				</N8nButton>
			</div>
		</template>
		<template #trigger>
			<N8nTooltip
				as-child
				:content="i18n.baseText('instanceAi.mentions.buttonLabel')"
				placement="top"
			>
				<N8nIconButton
					icon="at-sign"
					variant="ghost"
					size="medium"
					:disabled="disabled"
					:title="i18n.baseText('instanceAi.mentions.buttonLabel')"
					:aria-label="i18n.baseText('instanceAi.mentions.buttonLabel')"
					data-test-id="instance-ai-mention-button"
				/>
			</N8nTooltip>
		</template>
		<template #item-leading="{ item, ui }">
			<N8nIcon
				v-if="item.data?.item.kind === 'workflow'"
				icon="workflow"
				size="large"
				:class="ui.class"
			/>
			<N8nIcon
				v-else-if="item.data?.item.kind === 'group'"
				icon="layers"
				size="large"
				:class="ui.class"
			/>
			<NodeIcon
				v-else-if="item.data?.item.kind === 'node'"
				:node-type="item.data.nodeType"
				:size="16"
				:class="ui.class"
			/>
		</template>
		<template #item-label="{ item, ui }">
			<N8nText
				:class="ui.class"
				:title="item.label"
				size="medium"
				:color="item.disabled ? 'text-xlight' : 'text-dark'"
			>
				<AssistantMentionBreadcrumbs
					v-if="query.trim() && item.data?.item"
					:segments="item.data.item.breadcrumbs"
				/>
				<template v-else>{{ item.label }}</template>
			</N8nText>
		</template>
		<template #item-trailing="{ item, ui }">
			<N8nText
				v-if="item.data?.item.hasChildren && item.data.item.nodeCount !== undefined"
				:class="ui.class"
				size="small"
				color="text-light"
			>
				{{ item.data.item.nodeCount }}
			</N8nText>
		</template>
		<template
			v-if="query.trim() && menuItems.length > 0 && sources.providerErrors.value.size > 0"
			#footer
		>
			<div :class="$style.errorState">
				<N8nText size="small">{{ i18n.baseText('instanceAi.mentions.loadError') }}</N8nText>
				<N8nButton size="small" variant="outline" @click="retrySources">
					{{ i18n.baseText('generic.retry') }}
				</N8nButton>
			</div>
		</template>
	</N8nDropdownMenu>
</template>

<style module lang="scss">
.menuContent {
	width: var(--n8n--dropdown-menu-width);
}

.errorState {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs);
}
</style>
