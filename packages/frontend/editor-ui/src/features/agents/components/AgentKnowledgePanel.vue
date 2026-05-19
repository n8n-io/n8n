<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { RouterLink, useRoute, type RouteLocationRaw } from 'vue-router';
import type { AgentKnowledgeEntry, AgentKnowledgeSource } from '@n8n/api-types';
import { N8nBadge, N8nButton, N8nCard, N8nIcon, N8nInput, N8nText } from '@n8n/design-system';
import type { BadgeTheme } from '@n8n/design-system';
import { ElSkeletonItem } from 'element-plus';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

import { useToast } from '@/app/composables/useToast';
import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';
import { useAgentKnowledgeStore } from '../agentKnowledge.store';
import { AGENT_SESSION_DETAIL_VIEW } from '../constants';
import { doesKnowledgeEntryMatchSearch } from '../utils/agent-knowledge';

interface SourceGroup {
	threadId: string;
	threadTitle: string | null;
	threadSessionNumber: number | null;
	sources: AgentKnowledgeSource[];
}

type KnowledgeMarker = NonNullable<AgentKnowledgeSource['observationMarker']>;
type MarkerAccent = KnowledgeMarker | 'unknown';

const route = useRoute();
const i18n = useI18n();
const toast = useToast();
const knowledgeStore = useAgentKnowledgeStore();
const selectedEntryId = ref<string | null>(null);
const searchQuery = ref('');

const projectId = computed(() => route.params.projectId as string);
const agentId = computed(() => route.params.agentId as string);
const markerLabelKeys = {
	critical: 'agents.builder.knowledge.marker.critical',
	important: 'agents.builder.knowledge.marker.important',
	info: 'agents.builder.knowledge.marker.info',
	completion: 'agents.builder.knowledge.marker.completion',
} as const satisfies Record<KnowledgeMarker, BaseTextKey>;
const markerThemeMap = {
	critical: 'danger',
	important: 'warning',
	info: 'primary',
	completion: 'success',
	unknown: 'tertiary',
} as const satisfies Record<MarkerAccent, BadgeTheme>;
const markerPriority: KnowledgeMarker[] = ['critical', 'important', 'completion', 'info'];

const filteredEntries = computed(() =>
	knowledgeStore.entries.filter((entry) => doesKnowledgeEntryMatchSearch(entry, searchQuery.value)),
);

const selectedEntry = computed<AgentKnowledgeEntry | null>(() => {
	if (!selectedEntryId.value) return null;
	return filteredEntries.value.find((entry) => entry.id === selectedEntryId.value) ?? null;
});

const selectedSourceGroups = computed<SourceGroup[]>(() => {
	if (!selectedEntry.value) return [];

	const groups = new Map<string, SourceGroup>();

	for (const source of selectedEntry.value.sources) {
		const existing = groups.get(source.threadId);
		if (existing) {
			existing.sources.push(source);
			continue;
		}

		groups.set(source.threadId, {
			threadId: source.threadId,
			threadTitle: source.threadTitle,
			threadSessionNumber: source.threadSessionNumber,
			sources: [source],
		});
	}

	return [...groups.values()];
});

function formatDate(value: string): string {
	const { date, time } = convertToDisplayDate(value);
	return `${date} ${time}`;
}

function selectEntry(entryId: string) {
	selectedEntryId.value = entryId;
}

function closeInspector() {
	selectedEntryId.value = null;
}

function markerLabel(marker: AgentKnowledgeSource['observationMarker'] | 'unknown'): string {
	if (!marker || marker === 'unknown')
		return i18n.baseText('agents.builder.knowledge.marker.unknown');
	return i18n.baseText(markerLabelKeys[marker]);
}

function markerTheme(marker: AgentKnowledgeSource['observationMarker'] | 'unknown'): BadgeTheme {
	return markerThemeMap[marker ?? 'unknown'];
}

function entryMarkers(entry: AgentKnowledgeEntry): KnowledgeMarker[] {
	const markers = new Set<KnowledgeMarker>();

	for (const source of entry.sources) {
		if (source.observationMarker) markers.add(source.observationMarker);
	}

	return [...markers];
}

function primaryMarker(entry: AgentKnowledgeEntry): MarkerAccent {
	const markers = entryMarkers(entry);
	return markerPriority.find((marker) => markers.includes(marker)) ?? 'unknown';
}

function sourceTitle(source: Pick<AgentKnowledgeSource, 'threadId' | 'threadTitle'>): string {
	return (
		source.threadTitle ??
		i18n.baseText('agents.builder.knowledge.threadFallback', {
			interpolate: { threadId: source.threadId },
		})
	);
}

function sourceRoute(source: Pick<AgentKnowledgeSource, 'threadId'>): RouteLocationRaw {
	return {
		name: AGENT_SESSION_DETAIL_VIEW,
		params: {
			projectId: projectId.value,
			agentId: agentId.value,
			threadId: source.threadId,
		},
	};
}

watch(
	filteredEntries,
	(entries) => {
		if (selectedEntryId.value && !entries.some((entry) => entry.id === selectedEntryId.value)) {
			selectedEntryId.value = null;
		}
	},
	{ immediate: true },
);

watch(
	[projectId, agentId],
	async ([currentProjectId, currentAgentId]) => {
		if (!currentProjectId || !currentAgentId) return;
		selectedEntryId.value = null;
		try {
			await knowledgeStore.fetchKnowledge(currentProjectId, currentAgentId);
		} catch (error) {
			toast.showError(error, i18n.baseText('agents.builder.knowledge.loadError'));
		}
	},
	{ immediate: true },
);

onBeforeUnmount(() => {
	knowledgeStore.reset();
});
</script>

<template>
	<div :class="$style.wrapper" data-testid="agent-knowledge-panel">
		<div
			v-if="knowledgeStore.loading && knowledgeStore.entries.length === 0"
			:class="[$style.browser, $style.withInspector]"
			aria-busy="true"
		>
			<N8nCard variant="outlined" :class="[$style.card, $style.listPane]">
				<div :class="$style.panelBody">
					<div :class="$style.searchSkeleton">
						<ElSkeletonItem variant="text" />
					</div>
					<N8nCard v-for="item in 5" :key="item" variant="outlined" :class="$style.entryCard">
						<ElSkeletonItem variant="h3" />
						<ElSkeletonItem variant="text" />
						<ElSkeletonItem variant="text" />
					</N8nCard>
				</div>
			</N8nCard>
			<N8nCard variant="outlined" :class="[$style.card, $style.inspectorPane]">
				<div :class="$style.panelBody">
					<ElSkeletonItem variant="h3" />
					<ElSkeletonItem variant="text" />
					<ElSkeletonItem variant="text" />
					<ElSkeletonItem variant="text" />
				</div>
			</N8nCard>
		</div>

		<div
			v-else-if="knowledgeStore.entries.length === 0"
			:class="$style.empty"
			data-testid="agent-knowledge-empty"
		>
			<N8nIcon icon="book-open" :size="32" color="text-light" />
			<N8nText tag="h4" size="large" :bold="true">
				{{ i18n.baseText('agents.builder.knowledge.empty.title') }}
			</N8nText>
			<N8nText color="text-light">
				{{ i18n.baseText('agents.builder.knowledge.empty.description') }}
			</N8nText>
		</div>

		<div v-else :class="[$style.browser, { [$style.withInspector]: selectedEntry }]">
			<N8nCard
				variant="outlined"
				:class="[$style.card, $style.listPane]"
				:aria-label="i18n.baseText('agents.builder.knowledge.listLabel')"
			>
				<div :class="$style.panelBody">
					<N8nInput
						v-model="searchQuery"
						size="medium"
						clearable
						:placeholder="i18n.baseText('agents.builder.knowledge.search.placeholder')"
						:class="$style.search"
						data-testid="agent-knowledge-search"
					>
						<template #prefix>
							<N8nIcon icon="search" :size="12" />
						</template>
					</N8nInput>

					<div
						v-if="filteredEntries.length === 0"
						:class="$style.noResults"
						data-testid="agent-knowledge-no-results"
					>
						<N8nIcon icon="search" :size="24" color="text-light" />
						<N8nText size="small" :bold="true">
							{{ i18n.baseText('agents.builder.knowledge.noResults.title') }}
						</N8nText>
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('agents.builder.knowledge.noResults.description') }}
						</N8nText>
					</div>

					<div v-else :class="$style.entryList">
						<N8nCard
							v-for="entry in filteredEntries"
							:key="entry.id"
							variant="outlined"
							role="button"
							tabindex="0"
							:class="[
								$style.entryCard,
								{ [$style.selectedEntry]: entry.id === selectedEntry?.id },
							]"
							:data-marker="primaryMarker(entry)"
							data-testid="agent-knowledge-entry"
							:aria-pressed="entry.id === selectedEntry?.id"
							@click="selectEntry(entry.id)"
							@keydown.enter.prevent="selectEntry(entry.id)"
							@keydown.space.prevent="selectEntry(entry.id)"
						>
							<div :class="$style.entryBody">
								<N8nText :class="$style.entryContent">{{ entry.content }}</N8nText>
								<div :class="$style.markerRow">
									<div :class="$style.markerBadges">
										<N8nBadge size="xsmall" :theme="markerTheme(primaryMarker(entry))">
											{{ markerLabel(primaryMarker(entry)) }}
										</N8nBadge>
									</div>
									<N8nText size="small" color="text-light" :class="$style.lastSeen">
										{{
											i18n.baseText('agents.builder.knowledge.lastSeen', {
												interpolate: { date: formatDate(entry.lastSeenAt) },
											})
										}}
									</N8nText>
								</div>
							</div>
						</N8nCard>
					</div>
				</div>
			</N8nCard>

			<N8nCard
				v-if="selectedEntry"
				variant="outlined"
				:class="[$style.card, $style.inspectorPane]"
				:aria-label="i18n.baseText('agents.builder.knowledge.inspectorLabel')"
				data-testid="agent-knowledge-inspector"
			>
				<div :class="$style.panelBody">
					<header :class="$style.inspectorHeader">
						<div>
							<N8nText tag="h3" size="large" :bold="true">
								{{ i18n.baseText('agents.builder.knowledge.inspector.title') }}
							</N8nText>
							<N8nText size="small" color="text-light">
								{{
									i18n.baseText('agents.builder.knowledge.sourceCount', {
										adjustToNumber: selectedEntry.sourceCount,
										interpolate: { count: String(selectedEntry.sourceCount) },
									})
								}}
							</N8nText>
						</div>
						<N8nButton
							variant="ghost"
							size="small"
							icon="x"
							icon-only
							:aria-label="i18n.baseText('agents.builder.knowledge.closeInspector')"
							@click="closeInspector"
						/>
					</header>

					<div :class="$style.divider" />

					<section :class="$style.memoryBlock" :data-marker="primaryMarker(selectedEntry)">
						<div :class="$style.traceCardBody">
							<N8nText size="xsmall" color="text-light" :bold="true">
								{{ i18n.baseText('agents.builder.knowledge.memory') }}
							</N8nText>
							<N8nText :class="$style.memoryText">{{ selectedEntry.content }}</N8nText>
						</div>
					</section>

					<div :class="$style.traceList">
						<section
							v-for="group in selectedSourceGroups"
							:key="group.threadId"
							:class="$style.sourceGroup"
						>
							<header :class="$style.sourceGroupHeader">
								<div :class="$style.threadTitleWrap">
									<RouterLink
										v-if="group.threadSessionNumber !== null"
										:to="sourceRoute(group)"
										:class="$style.threadLink"
									>
										{{ sourceTitle(group) }}
									</RouterLink>
									<N8nText v-else :class="$style.threadTitle">{{ sourceTitle(group) }}</N8nText>
									<N8nText
										v-if="group.threadSessionNumber !== null"
										size="xsmall"
										color="text-light"
									>
										{{
											i18n.baseText('agents.builder.knowledge.sessionNumber', {
												interpolate: { number: String(group.threadSessionNumber) },
											})
										}}
									</N8nText>
								</div>
							</header>

							<N8nCard
								v-for="source in group.sources"
								:key="source.id"
								variant="outlined"
								:class="$style.sourceCard"
								:data-marker="source.observationMarker ?? 'unknown'"
								data-testid="agent-knowledge-source"
							>
								<div :class="$style.traceCardBody">
									<div :class="$style.sourceHeader">
										<N8nBadge size="xsmall" :theme="markerTheme(source.observationMarker)">
											{{ markerLabel(source.observationMarker) }}
										</N8nBadge>
										<N8nText v-if="source.observationCreatedAt" size="xsmall" color="text-light">
											{{ formatDate(source.observationCreatedAt) }}
										</N8nText>
									</div>

									<div v-if="source.observationText" :class="$style.traceBlock">
										<N8nText size="xsmall" color="text-light" :bold="true">
											{{ i18n.baseText('agents.builder.knowledge.observation') }}
										</N8nText>
										<N8nText size="small">{{ source.observationText }}</N8nText>
									</div>

									<div :class="$style.traceBlock">
										<N8nText size="xsmall" color="text-light" :bold="true">
											{{ i18n.baseText('agents.builder.knowledge.evidence') }}
										</N8nText>
										<N8nText size="small">{{ source.evidenceText }}</N8nText>
									</div>
								</div>
							</N8nCard>
						</section>
					</div>
				</div>
			</N8nCard>
		</div>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--lg);
	height: 100%;
	min-height: 0;
	overflow: hidden;
}

.browser {
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	gap: var(--spacing--md);
	height: 100%;
	min-height: 0;
}

.withInspector {
	grid-template-columns: repeat(2, minmax(0, 1fr));
}

.card {
	display: flex;
	flex-direction: column;
	width: 100%;
}

.panelBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
	height: 100%;
	min-height: 0;
}

.listPane {
	overflow: hidden;
}

.search {
	flex-shrink: 0;
}

.entryList {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--xs);
	min-height: 0;
	overflow-y: auto;
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
}

.entryCard {
	width: 100%;
	color: var(--text-color--base);
	text-align: left;
	align-items: stretch;
	cursor: pointer;

	&:focus-visible {
		outline: var(--border-width--bold) var(--border-style--base) var(--color-primary);
		outline-offset: var(--spacing--2xs);
	}
}

.entryBody,
.traceCardBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	width: 100%;
}

.selectedEntry {
	border-color: var(--color--primary--tint-2);
	box-shadow: inset var(--spacing--3xs) 0 0 var(--color--primary);
}

.entryCard[data-marker='critical'] {
	box-shadow: inset var(--spacing--3xs) 0 0 var(--color--danger);

	&:hover {
		border-color: var(--color--danger);
	}
}

.entryCard[data-marker='important'] {
	box-shadow: inset var(--spacing--3xs) 0 0 var(--color--warning);

	&:hover {
		border-color: var(--color--warning);
	}
}

.entryCard[data-marker='completion'] {
	box-shadow: inset var(--spacing--3xs) 0 0 var(--color--success);

	&:hover {
		border-color: var(--color--success);
	}
}

.entryCard[data-marker='info'] {
	box-shadow: inset var(--spacing--3xs) 0 0 var(--color--primary);

	&:hover {
		border-color: var(--color--primary);
	}
}

.selectedEntry[data-marker='critical'] {
	border-color: var(--color--danger);
	box-shadow: inset var(--spacing--3xs) 0 0 var(--color--danger);
}

.selectedEntry[data-marker='important'] {
	border-color: var(--color--warning);
	box-shadow: inset var(--spacing--3xs) 0 0 var(--color--warning);
}

.selectedEntry[data-marker='completion'] {
	border-color: var(--color--success);
	box-shadow: inset var(--spacing--3xs) 0 0 var(--color--success);
}

.entryContent {
	display: -webkit-box;
	overflow: hidden;
	line-clamp: 3;
	-webkit-line-clamp: 3;
	-webkit-box-orient: vertical;
	white-space: pre-wrap;
}

.markerRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
	width: 100%;
}

.markerBadges {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.lastSeen {
	flex-shrink: 0;
	margin-left: auto;
	text-align: right;
}

.inspectorPane {
	gap: var(--spacing--md);
	min-height: 0;
	overflow-y: auto;
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
}

.inspectorHeader,
.sourceGroupHeader,
.sourceHeader {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.divider {
	border-top: var(--border);
}

.sourceCard {
	align-items: stretch;
}

.memoryBlock {
	padding-left: var(--spacing--sm);
	border-left: var(--spacing--3xs) var(--border-style--base) var(--color--primary);
}

.memoryBlock[data-marker='critical'] {
	border-left-color: var(--color--danger);
}

.memoryBlock[data-marker='important'] {
	border-left-color: var(--color--warning);
}

.memoryBlock[data-marker='completion'] {
	border-left-color: var(--color--success);
}

.memoryText {
	white-space: pre-wrap;
}

.traceList,
.sourceGroup {
	display: flex;
	flex-direction: column;
}

.traceList {
	gap: var(--spacing--md);
}

.sourceGroup {
	gap: var(--spacing--sm);
}

.sourceGroupHeader {
	padding-top: var(--spacing--sm);
	border-top: var(--border);
}

.threadTitleWrap {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.threadLink,
.threadTitle {
	font-size: var(--font-size--s);
	font-weight: var(--font-weight--bold);
	color: var(--text-color--base);
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.threadLink {
	text-decoration: none;

	&:hover {
		text-decoration: underline;
	}
}

.sourceCard[data-marker='critical'] {
	box-shadow: inset var(--spacing--3xs) 0 0 var(--color--danger);
}

.sourceCard[data-marker='important'] {
	box-shadow: inset var(--spacing--3xs) 0 0 var(--color--warning);
}

.sourceCard[data-marker='completion'] {
	box-shadow: inset var(--spacing--3xs) 0 0 var(--color--success);
}

.sourceCard[data-marker='info'] {
	box-shadow: inset var(--spacing--3xs) 0 0 var(--color--primary);
}

.traceBlock {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.empty,
.noResults {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--2xs);
	text-align: center;
	color: var(--text-color--base);
}

.empty {
	flex: 1;
}

.noResults {
	padding: var(--spacing--xl) var(--spacing--md);
}

.searchSkeleton {
	padding: var(--spacing--xs);
}

@include mixins.breakpoint('sm-and-down') {
	.wrapper {
		overflow-y: auto;
	}

	.browser {
		grid-template-columns: 1fr;
		height: auto;
	}

	.inspectorPane {
		overflow: visible;
	}
}
</style>
