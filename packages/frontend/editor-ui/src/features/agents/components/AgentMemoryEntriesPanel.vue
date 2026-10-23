<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { refDebounced } from '@vueuse/core';
import { N8nButton, N8nIcon, N8nIconButton, N8nInput, N8nText } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system';
import {
	MAX_AGENT_MEMORY_SEARCH_LENGTH,
	type AgentMemoryEntryDto,
	type AgentMemoryEntrySourceDto,
	type AgentMemorySourceFacetGroupDto,
} from '@n8n/api-types';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import { useToast } from '@n8n/composables/useToast';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';

import { DEBOUNCE_TIME, MODAL_CONFIRM } from '@/app/constants';
import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';
import {
	deleteAgentMemoryEntry,
	getAgentMemorySourceFacets,
	listAgentMemoryEntries,
	type AgentMemorySourceSelection,
} from '../composables/useAgentApi';
import { useAgentConfirmationModal } from '../composables/useAgentConfirmationModal';
import { useAgentMemorySourceLabels } from '../composables/useAgentMemorySourceLabels';
import AgentMemorySourceFilter from './AgentMemorySourceFilter.vue';
import AgentPanel from './AgentPanel.vue';

const INLINE_PAGE_SIZE = 10;
const FULL_PAGE_SIZE = 25;

const props = defineProps<{
	projectId: string;
	agentId: string;
	/** The user can read memories but not delete them. */
	disabled?: boolean;
}>();

const i18n = useI18n();
const rootStore = useRootStore();
const { showError, showMessage } = useToast();
const { openAgentConfirmationModal } = useAgentConfirmationModal();
const { kindIcon, kindLabel, ensureLoaded } = useAgentMemorySourceLabels();

const entries = ref<AgentMemoryEntryDto[]>([]);
const total = ref(0);
const nextCursor = ref<string | null>(null);
const loading = ref(false);
const loadFailed = ref(false);
const deletingId = ref<string | null>(null);
/** The parent hides the other Knowledge cards while this is true. */
const showAll = defineModel<boolean>('showAll', { default: false });
/** The mode the user asked for. `showAll` can lag when the parent owns it. */
const fullList = ref(showAll.value);
/** Search and the source filter only apply to the full list. */
const search = ref('');
const debouncedSearch = refDebounced(search, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));
const sourceSelection = ref<AgentMemorySourceSelection>({});
const facetGroups = ref<AgentMemorySourceFacetGroupDto[]>([]);
const isFiltered = computed(
	() => fullList.value && (debouncedSearch.value.trim() !== '' || !!sourceSelection.value.source),
);
const emptyText = computed(() =>
	i18n.baseText(
		isFiltered.value
			? ('agents.builder.memory.entries.noMatches' as BaseTextKey)
			: ('agents.builder.memory.entries.empty' as BaseTextKey),
	),
);

function limitFor(showAllEntries: boolean) {
	return showAllEntries ? FULL_PAGE_SIZE : INLINE_PAGE_SIZE;
}

function isStale(projectId: string, agentId: string) {
	return projectId !== props.projectId || agentId !== props.agentId;
}

// Only the newest request may write state, so a slow Load more cannot land on a newer list.
let latestRequestId = 0;

function onLoadFailed(
	error: unknown,
	{ append, filtered }: { append: boolean; filtered: boolean },
) {
	loadFailed.value = true;
	// Load more must not append to a list that does not match the search or filter.
	if (!append && filtered) {
		entries.value = [];
		nextCursor.value = null;
	}
	showError(error, i18n.baseText('agents.builder.memory.entries.loadError' as BaseTextKey));
}

async function loadEntries({ append, limit }: { append: boolean; limit: number }) {
	const { projectId, agentId } = props;
	const requestId = ++latestRequestId;
	const isOutdated = () => requestId !== latestRequestId || isStale(projectId, agentId);
	const search = (fullList.value && debouncedSearch.value.trim()) || undefined;
	const filtered = !!search || (fullList.value && !!sourceSelection.value.source);
	loading.value = true;
	try {
		const page = await listAgentMemoryEntries(rootStore.restApiContext, projectId, agentId, {
			limit,
			cursor: append ? (nextCursor.value ?? undefined) : undefined,
			search,
			...(fullList.value && sourceSelection.value),
		});
		if (isOutdated()) return;
		loadFailed.value = false;
		entries.value = append ? [...entries.value, ...page.items] : page.items;
		total.value = page.total;
		nextCursor.value = page.nextCursor;
	} catch (error) {
		if (!isOutdated()) onLoadFailed(error, { append, filtered });
	} finally {
		if (!isOutdated()) loading.value = false;
	}
}

async function loadFacets() {
	const { projectId, agentId } = props;
	try {
		const facets = await getAgentMemorySourceFacets(rootStore.restApiContext, projectId, agentId);
		if (!isStale(projectId, agentId)) facetGroups.value = facets.groups;
	} catch {
		// The list still works without the filter options.
		if (!isStale(projectId, agentId)) facetGroups.value = [];
	}
}

function resetFilters() {
	search.value = '';
	sourceSelection.value = {};
}

async function setShowAll(value: boolean) {
	showAll.value = value;
	fullList.value = value;
	if (!value) resetFilters();
	await Promise.all([
		loadEntries({ append: false, limit: limitFor(value) }),
		value ? loadFacets() : undefined,
	]);
}

async function onDelete(entry: AgentMemoryEntryDto) {
	if (deletingId.value !== null) return;
	const confirmed = await openAgentConfirmationModal({
		title: i18n.baseText('agents.builder.memory.entries.deleteModal.title' as BaseTextKey),
		description: i18n.baseText(
			'agents.builder.memory.entries.deleteModal.description' as BaseTextKey,
		),
		confirmButtonText: i18n.baseText(
			'agents.builder.memory.entries.deleteModal.button.delete' as BaseTextKey,
		),
		cancelButtonText: i18n.baseText('generic.cancel'),
	});
	if (confirmed !== MODAL_CONFIRM) return;

	const { projectId, agentId } = props;
	deletingId.value = entry.id;
	try {
		await deleteAgentMemoryEntry(rootStore.restApiContext, projectId, agentId, entry.id);
		if (isStale(projectId, agentId)) return;
		entries.value = entries.value.filter(({ id }) => id !== entry.id);
		total.value = Math.max(total.value - 1, 0);
		showMessage({
			title: i18n.baseText('agents.builder.memory.entries.deleted' as BaseTextKey),
			type: 'success',
		});
		// Backfill the inline page. "View all" keeps its loaded pages.
		if (!showAll.value) await loadEntries({ append: false, limit: INLINE_PAGE_SIZE });
	} catch (error) {
		showError(error, i18n.baseText('agents.builder.memory.entries.deleteError' as BaseTextKey));
	} finally {
		deletingId.value = null;
	}
}

function sourceIcon(source: AgentMemoryEntrySourceDto | undefined): IconName {
	if (!source) return 'brain';
	return kindIcon(source.kind);
}

function sourcePlace(source: AgentMemoryEntrySourceDto): string | undefined {
	if (source.isDirectMessage) {
		return i18n.baseText('agents.builder.memory.entries.source.directMessage' as BaseTextKey);
	}
	if (source.place) return source.place;
	return kindLabel(source.kind);
}

function sourceParts(source: AgentMemoryEntrySourceDto | undefined): Array<string | undefined> {
	if (!source) return [];
	const who = source.isViewer
		? i18n.baseText('agents.builder.memory.entries.source.you' as BaseTextKey)
		: source.userName;
	return [who, sourcePlace(source)];
}

function metaLine(entry: AgentMemoryEntryDto): string {
	const others = entry.otherSourceCount;
	const othersLabel =
		others > 0
			? i18n.baseText('agents.builder.memory.entries.otherSources' as BaseTextKey, {
					adjustToNumber: others,
					interpolate: { count: String(others) },
				})
			: undefined;
	return [...sourceParts(entry.source), convertToDisplayDate(entry.createdAt).date, othersLabel]
		.filter(Boolean)
		.join(' · ');
}

onMounted(async () => {
	await Promise.all([
		loadEntries({ append: false, limit: limitFor(showAll.value) }),
		showAll.value ? loadFacets() : undefined,
	]);
	await ensureLoaded(props.projectId).catch(() => undefined);
});

watch(
	() => [props.projectId, props.agentId],
	async () => {
		showAll.value = false;
		fullList.value = false;
		resetFilters();
		facetGroups.value = [];
		await loadEntries({ append: false, limit: INLINE_PAGE_SIZE });
	},
);

watch(showAll, (value) => {
	fullList.value = value;
});

watch([debouncedSearch, sourceSelection], async () => {
	if (!fullList.value) return;
	await loadEntries({ append: false, limit: FULL_PAGE_SIZE });
});
</script>

<template>
	<div :class="$style.root" data-testid="agent-memory-entries-panel">
		<div v-if="showAll" :class="$style.backRow">
			<N8nIconButton
				icon="arrow-left"
				variant="ghost"
				size="small"
				:aria-label="i18n.baseText('agents.builder.memory.entries.back' as BaseTextKey)"
				data-testid="agent-memory-entries-back"
				@click="setShowAll(false)"
			/>
			<N8nText tag="h3" step="sm" :bold="true">
				{{ i18n.baseText('agents.builder.memory.entries.title' as BaseTextKey) }}
			</N8nText>
		</div>
		<AgentPanel
			:header="i18n.baseText('agents.builder.memory.entries.title' as BaseTextKey)"
			:header-visibility="showAll ? 'visually-hidden' : 'visible'"
		>
			<template v-if="!showAll" #header="{ headerId }">
				<div :class="$style.header">
					<div :class="$style.copy">
						<N8nText :id="headerId" tag="h3" step="sm" :bold="true">
							{{ i18n.baseText('agents.builder.memory.entries.title' as BaseTextKey) }}
						</N8nText>
						<N8nText color="text-light">
							{{ i18n.baseText('agents.builder.memory.entries.description' as BaseTextKey) }}
						</N8nText>
					</div>
					<N8nButton
						v-if="total > INLINE_PAGE_SIZE"
						variant="ghost"
						data-testid="agent-memory-entries-view-all"
						@click="setShowAll(true)"
					>
						{{
							i18n.baseText('agents.builder.memory.entries.viewAll' as BaseTextKey, {
								interpolate: { count: String(total) },
							})
						}}
						<N8nIcon icon="chevron-right" size="small" />
					</N8nButton>
				</div>
			</template>

			<div v-if="showAll" :class="$style.toolbar">
				<N8nInput
					v-model="search"
					:class="$style.search"
					size="medium"
					:placeholder="
						i18n.baseText('agents.builder.memory.entries.search.placeholder' as BaseTextKey)
					"
					:maxlength="MAX_AGENT_MEMORY_SEARCH_LENGTH"
					clearable
					data-testid="agent-memory-entries-search"
				>
					<template #prefix>
						<N8nIcon icon="search" :size="12" />
					</template>
				</N8nInput>
				<AgentMemorySourceFilter v-model="sourceSelection" :groups="facetGroups" />
			</div>
			<N8nText
				v-if="!loading && !loadFailed && entries.length === 0"
				color="text-light"
				data-testid="agent-memory-entries-empty"
			>
				{{ emptyText }}
			</N8nText>
			<ul v-else :class="$style.list">
				<li
					v-for="entry in entries"
					:key="entry.id"
					:class="$style.row"
					data-testid="agent-memory-entry"
				>
					<div :class="$style.entryCopy">
						<N8nText :class="$style.content" data-testid="agent-memory-entry-content">
							{{ entry.content }}
						</N8nText>
						<span :class="$style.meta" data-testid="agent-memory-entry-meta">
							<N8nIcon :icon="sourceIcon(entry.source)" size="small" />
							<N8nText size="small" color="text-light">{{ metaLine(entry) }}</N8nText>
						</span>
					</div>
					<N8nIconButton
						v-if="!props.disabled"
						icon="trash-2"
						variant="ghost"
						size="small"
						:disabled="deletingId !== null"
						:aria-label="i18n.baseText('agents.builder.memory.entries.delete' as BaseTextKey)"
						data-testid="agent-memory-entry-delete"
						@click="onDelete(entry)"
					/>
				</li>
			</ul>
			<N8nButton
				v-if="showAll && nextCursor"
				variant="ghost"
				:loading="loading"
				data-testid="agent-memory-entries-load-more"
				@click="loadEntries({ append: true, limit: FULL_PAGE_SIZE })"
			>
				{{ i18n.baseText('agents.builder.memory.entries.loadMore' as BaseTextKey) }}
			</N8nButton>
		</AgentPanel>
	</div>
</template>

<style module lang="scss">
.root {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
}

.toolbar {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding-bottom: var(--spacing--xs);
}

.search {
	flex: 1;
	min-width: 0;
}

.backRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.header {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--xs);
}

.copy {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	flex: 1;
	min-width: 0;
}

.list {
	display: flex;
	flex-direction: column;
	margin: 0;
	padding: 0;
	list-style: none;
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding-block: var(--spacing--xs);
	border-top: var(--border);
}

.entryCopy {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	flex: 1;
	min-width: 0;
}

.content {
	overflow-wrap: anywhere;
}

.meta {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	color: var(--text-color--subtler);
}
</style>
