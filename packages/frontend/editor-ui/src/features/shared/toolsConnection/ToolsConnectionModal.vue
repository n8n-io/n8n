<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from 'vue';
import { N8nDialog, N8nIcon, N8nInput, N8nRecycleScroller, N8nText } from '@n8n/design-system';
import { type BaseTextKey, useI18n } from '@n8n/i18n';
import { useDebounceFn } from '@vueuse/core';
import { DEBOUNCE_TIME, getDebounceTime } from '@/app/constants/durations';

import ToolRow from './ToolRow.vue';
import ToolDetailView from './ToolDetailView.vue';
import ToolSettingsView from './ToolSettingsView.vue';
import {
	SECTION_TAB,
	TAB_ORDER,
	type FlattenedRow,
	type SectionKey,
	type TabId,
	type ToolConnectionItem,
	type ToolConnectionSettings,
} from './types';

const props = withDefaults(
	defineProps<{
		open?: boolean;
		items: ToolConnectionItem[];
		sections: SectionKey[];
		detailItem?: ToolConnectionItem | null;
		detailMode?: 'detail' | 'settings';
	}>(),
	{
		open: false,
		detailItem: null,
		detailMode: 'detail',
	},
);

const emit = defineEmits<{
	'update:open': [value: boolean];
	'update:detailItem': [value: ToolConnectionItem | null];
	disconnect: [item: ToolConnectionItem];
	save: [item: ToolConnectionItem, settings?: ToolConnectionSettings];
	'select-credential': [item: ToolConnectionItem, authType: string, credentialId: string];
	'open-detail': [item: ToolConnectionItem];
	connect: [item: ToolConnectionItem];
}>();

const i18n = useI18n();

const ITEM_HEIGHT = 58;

const searchQuery = ref('');
const debouncedSearchQuery = ref('');
const setDebouncedSearch = useDebounceFn((value: string) => {
	debouncedSearchQuery.value = value;
}, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));
watch(searchQuery, (value) => {
	void setDebouncedSearch(value);
});

const activeTab = ref<TabId>('services');

const searchInputRef = useTemplateRef('searchInputRef');
const scrollerRef = useTemplateRef('scrollerRef');

function focusSearchInput() {
	void nextTick(() => {
		searchInputRef.value?.focus();
	});
}

watch(
	() => props.open,
	(isOpen) => {
		if (isOpen) {
			searchQuery.value = '';
			debouncedSearchQuery.value = '';
			activeTab.value = 'services';
			focusSearchInput();
		}
	},
);

onMounted(() => {
	if (props.open) {
		focusSearchInput();
	}
});

const hasActiveSearch = computed(() => debouncedSearchQuery.value.length > 0);

function matchesQuery(item: ToolConnectionItem): boolean {
	if (!debouncedSearchQuery.value) return true;
	const query = debouncedSearchQuery.value.toLowerCase();
	return (
		item.title.toLowerCase().includes(query) ||
		(item.description ?? '').toLowerCase().includes(query)
	);
}

const hasConnectedSection = computed(() => props.sections.includes('connected'));

const SECTION_KINDS: Record<Exclude<SectionKey, 'connected'>, Array<ToolConnectionItem['kind']>> = {
	nodes: ['node', 'mcp-server'],
	agents: ['agent'],
	data: ['data-store'],
	workflows: ['workflow'],
};

function itemsForSection(section: SectionKey): ToolConnectionItem[] {
	if (section === 'connected') return props.items.filter((item) => item.isConnected);
	const kinds = SECTION_KINDS[section];
	return props.items.filter(
		(item) => kinds.includes(item.kind) && (hasConnectedSection.value ? !item.isConnected : true),
	);
}

const SECTION_I18N_KEY: Record<Exclude<SectionKey, 'connected'>, BaseTextKey> = {
	nodes: 'tools.connection.sections.availableNodes',
	agents: 'tools.connection.sections.availableAgents',
	data: 'tools.connection.sections.availableData',
	workflows: 'tools.connection.sections.availableWorkflows',
};

function sectionTitle(section: SectionKey): string | null {
	if (section === 'connected') return null;
	return i18n.baseText(SECTION_I18N_KEY[section]);
}

const flattenedRows = computed<FlattenedRow[]>(() => {
	const rows: FlattenedRow[] = [];
	for (const section of props.sections) {
		const sectionItems = itemsForSection(section).filter(matchesQuery);
		if (sectionItems.length === 0) continue;
		const title = sectionTitle(section);
		if (title !== null) {
			rows.push({
				kind: 'section-header',
				key: `header:${section}`,
				section,
				title,
				count: sectionItems.length,
			});
		}
		for (const item of sectionItems) {
			rows.push({ kind: 'item', key: `item:${section}:${item.id}`, section, item });
		}
	}
	return rows;
});

const availableTabs = computed<TabId[]>(() => {
	const tabsWithRows = new Set<TabId>();
	for (const section of props.sections) {
		if (itemsForSection(section).filter(matchesQuery).length > 0) {
			tabsWithRows.add(SECTION_TAB[section]);
		}
	}
	return TAB_ORDER.filter((id) => tabsWithRows.has(id));
});

const tabsVisible = computed(() => availableTabs.value.length > 1);

function findFirstRowKeyForTab(tab: TabId): string | undefined {
	return flattenedRows.value.find((row) => SECTION_TAB[row.section] === tab)?.key;
}

async function selectTab(tab: TabId) {
	activeTab.value = tab;
	const targetKey = findFirstRowKeyForTab(tab);
	if (!targetKey) return;
	await nextTick();
	scrollerRef.value?.scrollToKey(targetKey);
}

const TAB_I18N: Record<TabId, BaseTextKey> = {
	services: 'tools.connection.tabs.services',
	agents: 'tools.connection.tabs.agents',
	data: 'tools.connection.tabs.data',
	workflows: 'tools.connection.tabs.workflows',
};

watch(availableTabs, (matching) => {
	if (matching.length > 0 && !matching.includes(activeTab.value)) {
		activeTab.value = matching[0];
	}
});

const isListEmpty = computed(() => flattenedRows.value.length === 0);
const emptyMessage = computed(() => {
	if (hasActiveSearch.value) {
		return i18n.baseText('tools.connection.empty.noResults', {
			interpolate: { query: debouncedSearchQuery.value },
		});
	}
	return i18n.baseText('tools.connection.empty.title');
});

function openDetail(item: ToolConnectionItem) {
	emit('open-detail', item);
	emit('update:detailItem', item);
}

function closeDetail() {
	emit('update:detailItem', null);
}

function handleOpenChange(value: boolean) {
	emit('update:open', value);
	if (!value) {
		closeDetail();
	}
}
</script>

<template>
	<N8nDialog
		:open="open"
		size="xlarge"
		:header="detailItem ? '' : i18n.baseText('tools.connection.title')"
		:show-close-button="!detailItem"
		:aria-label="i18n.baseText('tools.connection.title')"
		data-test-id="tools-connection-modal"
		@update:open="handleOpenChange"
	>
		<div :class="$style.body">
			<ToolSettingsView
				v-if="detailItem && detailMode === 'settings'"
				:key="detailItem.id"
				:item="detailItem"
				@back="closeDetail"
				@close="handleOpenChange(false)"
				@disconnect="emit('disconnect', $event)"
				@save="(item, settings) => emit('save', item, settings)"
				@select-credential="
					(item, authType, credentialId) => emit('select-credential', item, authType, credentialId)
				"
			>
				<template v-if="$slots['settings-body']" #body="slotProps">
					<slot name="settings-body" v-bind="slotProps" />
				</template>
			</ToolSettingsView>
			<ToolDetailView
				v-else-if="detailItem"
				:item="detailItem"
				@back="closeDetail"
				@close="handleOpenChange(false)"
				@select-credential="
					(item, authType, credentialId) => emit('select-credential', item, authType, credentialId)
				"
			>
				<template v-if="$slots['detail-body']" #body="slotProps">
					<slot name="detail-body" v-bind="slotProps" />
				</template>
			</ToolDetailView>
			<template v-else>
				<N8nInput
					ref="searchInputRef"
					v-model="searchQuery"
					:placeholder="i18n.baseText('tools.connection.search.placeholder')"
					clearable
					data-test-id="tools-connection-search"
					:class="$style.searchInput"
				>
					<template #prefix>
						<N8nIcon icon="search" />
					</template>
				</N8nInput>

				<div
					v-if="tabsVisible"
					:class="$style.tabs"
					role="tablist"
					data-test-id="tools-connection-tabs"
				>
					<button
						v-for="tab in availableTabs"
						:key="tab"
						type="button"
						role="tab"
						:class="[$style.tab, { [$style.tabActive]: activeTab === tab }]"
						:aria-selected="activeTab === tab"
						:data-test-id="`tools-connection-tab-${tab}`"
						@click="selectTab(tab)"
					>
						{{ i18n.baseText(TAB_I18N[tab]) }}
					</button>
				</div>

				<div v-if="isListEmpty" :class="$style.empty" data-test-id="tools-connection-empty">
					<N8nText color="text-light">{{ emptyMessage }}</N8nText>
				</div>
				<div v-else :class="$style.listWrapper">
					<N8nRecycleScroller
						ref="scrollerRef"
						:items="flattenedRows"
						:item-size="ITEM_HEIGHT"
						item-key="key"
						:class="$style.scroller"
					>
						<template #default="{ item: row }">
							<div
								v-if="row.kind === 'section-header'"
								:class="$style.sectionHeader"
								data-test-id="tools-connection-section-header"
							>
								<N8nText size="small" color="text-light">
									{{ row.title }}
								</N8nText>
							</div>
							<ToolRow
								v-else
								:item="row.item"
								@open-detail="openDetail($event)"
								@connect="emit('connect', $event)"
							/>
						</template>
					</N8nRecycleScroller>
				</div>
			</template>
		</div>
	</N8nDialog>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	height: 70vh;
	max-height: 640px;
	min-height: 0;
	margin-top: var(--spacing--2xs);
}

.searchInput {
	width: 100%;
	flex-shrink: 0;
}

.tabs {
	display: flex;
	gap: var(--spacing--md);
	border-bottom: 1px solid var(--color--background--light-2);
	flex-shrink: 0;
}

.tab {
	background: none;
	border: 0;
	padding: var(--spacing--3xs) 0;
	margin-bottom: -1px;
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
	color: var(--color--text--tint-1);
	cursor: pointer;
	border-bottom: 2px solid transparent;
	transition:
		color 120ms ease,
		border-color 120ms ease;

	&:hover {
		color: var(--color--text);
	}

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--border-color);
		outline-offset: 2px;
	}
}

.tabActive {
	color: var(--color--primary);
	border-bottom-color: var(--color--primary);
}

.listWrapper {
	flex: 1 1 0;
	min-height: 0;
	overflow: hidden;
}

.scroller {
	height: 100%;
	overflow-y: auto;
}

.sectionHeader {
	display: flex;
	align-items: center;
	padding: var(--spacing--xs) var(--spacing--3xs) var(--spacing--3xs);
}

.empty {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--xl);
	min-height: 200px;
}
</style>
