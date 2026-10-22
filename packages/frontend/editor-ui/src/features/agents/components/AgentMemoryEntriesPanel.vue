<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { N8nButton, N8nIcon, N8nIconButton, N8nText, updatedIconSet } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system';
import type { AgentMemoryEntryDto, AgentMemoryEntrySourceDto } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';

import { MODAL_CONFIRM } from '@/app/constants';
import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';
import { deleteAgentMemoryEntry, listAgentMemoryEntries } from '../composables/useAgentApi';
import { useAgentConfirmationModal } from '../composables/useAgentConfirmationModal';
import { useAgentIntegrationsCatalog } from '../composables/useAgentIntegrationsCatalog';
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
const { catalog, ensureLoaded } = useAgentIntegrationsCatalog();

const entries = ref<AgentMemoryEntryDto[]>([]);
const total = ref(0);
const nextCursor = ref<string | null>(null);
const loading = ref(false);
const deletingId = ref<string | null>(null);
const showAll = ref(false);

const pageSize = computed(() => (showAll.value ? FULL_PAGE_SIZE : INLINE_PAGE_SIZE));

const SURFACE_ICONS: Record<string, IconName> = {
	'n8n-chat': 'message-circle',
	preview: 'flask-conical',
	build: 'wrench',
};

const SURFACE_LABELS: Record<string, BaseTextKey> = {
	'n8n-chat': 'agents.builder.memory.entries.source.chat' as BaseTextKey,
	preview: 'agents.builder.memory.entries.source.preview' as BaseTextKey,
	build: 'agents.builder.memory.entries.source.build' as BaseTextKey,
};

function isStale(projectId: string, agentId: string) {
	return projectId !== props.projectId || agentId !== props.agentId;
}

async function loadEntries({ append }: { append: boolean }) {
	const { projectId, agentId } = props;
	loading.value = true;
	try {
		const page = await listAgentMemoryEntries(rootStore.restApiContext, projectId, agentId, {
			limit: pageSize.value,
			cursor: append ? (nextCursor.value ?? undefined) : undefined,
		});
		if (isStale(projectId, agentId)) return;
		entries.value = append ? [...entries.value, ...page.items] : page.items;
		total.value = page.total;
		nextCursor.value = page.nextCursor;
	} catch (error) {
		if (!isStale(projectId, agentId)) {
			showError(error, i18n.baseText('agents.builder.memory.entries.loadError' as BaseTextKey));
		}
	} finally {
		if (!isStale(projectId, agentId)) loading.value = false;
	}
}

async function setShowAll(value: boolean) {
	showAll.value = value;
	await loadEntries({ append: false });
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
	} catch (error) {
		showError(error, i18n.baseText('agents.builder.memory.entries.deleteError' as BaseTextKey));
	} finally {
		deletingId.value = null;
	}
}

function isIconName(icon: unknown): icon is IconName {
	return typeof icon === 'string' && icon in updatedIconSet;
}

function integrationIcon(kind: string): IconName {
	const icon = catalog.value?.find(({ type }) => type === kind)?.icon;
	return isIconName(icon) ? icon : 'zap';
}

function sourceIcon(source: AgentMemoryEntrySourceDto | undefined): IconName {
	if (!source) return 'brain';
	return SURFACE_ICONS[source.kind] ?? integrationIcon(source.kind);
}

function sourcePlace(source: AgentMemoryEntrySourceDto): string | undefined {
	if (source.isDirectMessage) {
		return i18n.baseText('agents.builder.memory.entries.source.directMessage' as BaseTextKey);
	}
	if (source.place) return source.place;
	const surfaceLabel = SURFACE_LABELS[source.kind];
	if (surfaceLabel) return i18n.baseText(surfaceLabel);
	return catalog.value?.find(({ type }) => type === source.kind)?.label;
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
	await loadEntries({ append: false });
	await ensureLoaded(props.projectId).catch(() => undefined);
});

watch(
	() => [props.projectId, props.agentId],
	async () => {
		showAll.value = false;
		await loadEntries({ append: false });
	},
);
</script>

<template>
	<AgentPanel
		:header="i18n.baseText('agents.builder.memory.entries.title' as BaseTextKey)"
		:description="i18n.baseText('agents.builder.memory.entries.description' as BaseTextKey)"
		data-testid="agent-memory-entries-panel"
	>
		<template #header="{ headerId }">
			<div :class="$style.header">
				<N8nIconButton
					v-if="showAll"
					icon="arrow-left"
					variant="ghost"
					size="small"
					:aria-label="i18n.baseText('agents.builder.memory.entries.back' as BaseTextKey)"
					data-testid="agent-memory-entries-back"
					@click="setShowAll(false)"
				/>
				<div :class="$style.copy">
					<N8nText :id="headerId" tag="h3" step="sm" :bold="true">
						{{ i18n.baseText('agents.builder.memory.entries.title' as BaseTextKey) }}
					</N8nText>
					<N8nText v-if="!showAll" color="text-light">
						{{ i18n.baseText('agents.builder.memory.entries.description' as BaseTextKey) }}
					</N8nText>
				</div>
				<N8nButton
					v-if="!showAll && total > INLINE_PAGE_SIZE"
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

		<N8nText
			v-if="!loading && entries.length === 0"
			color="text-light"
			data-testid="agent-memory-entries-empty"
		>
			{{ i18n.baseText('agents.builder.memory.entries.empty' as BaseTextKey) }}
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
			@click="loadEntries({ append: true })"
		>
			{{ i18n.baseText('agents.builder.memory.entries.loadMore' as BaseTextKey) }}
		</N8nButton>
	</AgentPanel>
</template>

<style module lang="scss">
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
