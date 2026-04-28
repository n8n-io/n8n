<script lang="ts" setup>
import { truncate } from '@n8n/utils';
import { useToast } from '@/app/composables/useToast';
import { useAgentSessionsStore } from '@/features/agents/agentSessions.store';
import { AGENT_BUILDER_VIEW, CONTINUE_SESSION_ID_PARAM } from '@/features/agents/constants';
import { useThreadTitle } from '@/features/agents/utils/thread-title';
import type {
	ExecutionThread,
	ThreadExecution,
} from '@/features/agents/composables/useAgentThreadsApi';
import SessionTimelineChart from '@/features/agents/components/SessionTimelineChart.vue';
import SessionEventFilter from '@/features/agents/components/SessionEventFilter.vue';
import SessionTimelineTable from '@/features/agents/components/SessionTimelineTable.vue';
import SessionDetailPanel from '@/features/agents/components/SessionDetailPanel.vue';
import {
	flattenExecutionsToTimelineItems,
	computeIdleRanges,
	sessionBounds,
	itemFilterKey,
	kindColorToken,
	builtinToolLabelKey,
} from '@/features/agents/session-timeline.utils';
import type { FilterOption, TimelineItem } from '@/features/agents/session-timeline.types';
import { useI18n } from '@n8n/i18n';
import { N8nIcon, N8nInput } from '@n8n/design-system';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const i18n = useI18n();
const threadTitleOf = useThreadTitle();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const sessionsStore = useAgentSessionsStore();

const projectId = computed(() => route.params.projectId as string);
const agentId = computed(() => route.params.agentId as string);
const threadId = computed(() => route.params.threadId as string);

const thread = ref<ExecutionThread | null>(null);
const executions = ref<ThreadExecution[]>([]);
const loading = ref(true);
const selectedIndex = ref<number | null>(null);
const selectedFilters = ref<Set<string>>(new Set());
const searchQuery = ref('');

const items = computed<TimelineItem[]>(() => flattenExecutionsToTimelineItems(executions.value));
const idleRanges = computed(() => computeIdleRanges(items.value));
const bounds = computed(() => sessionBounds(items.value));

function labelForKey(key: string): string {
	if (key.startsWith('tool:')) {
		const toolName = key.slice('tool:'.length);
		const builtinKey = builtinToolLabelKey(toolName);
		return builtinKey ? i18n.baseText(builtinKey) : toolName;
	}
	switch (key) {
		case 'user':
			return i18n.baseText('agentSessions.timeline.user');
		case 'agent':
			return i18n.baseText('agentSessions.timeline.agent');
		case 'workflow':
			return i18n.baseText('agentSessions.timeline.workflow');
		case 'node':
			return i18n.baseText('agentSessions.timeline.node');
		case 'working-memory':
			return i18n.baseText('agentSessions.timeline.memory');
		case 'suspension':
			return i18n.baseText('agentSessions.timeline.suspension');
		default:
			return key;
	}
}

const filterOptions = computed<FilterOption[]>(() => {
	const counts = new Map<string, number>();
	const colorByKey = new Map<string, string>();
	for (const item of items.value) {
		const key = itemFilterKey(item);
		counts.set(key, (counts.get(key) ?? 0) + 1);
		if (!colorByKey.has(key)) colorByKey.set(key, kindColorToken(item.kind));
	}
	return Array.from(counts.entries()).map(([key, count]) => ({
		key,
		label: labelForKey(key),
		color: colorByKey.get(key) ?? 'var(--color--foreground)',
		count,
	}));
});

const triggerSource = computed((): string | null => {
	if (executions.value.length === 0) return null;
	const first = executions.value[0];
	const source = first.metadata.find((m) => m.key === 'source')?.value;
	return source ?? 'chat';
});

const triggerIcon = computed((): 'slack' | 'bolt-filled' => {
	return triggerSource.value === 'slack' ? 'slack' : 'bolt-filled';
});

const triggerLabel = computed((): string => {
	const source = triggerSource.value;
	if (!source) return '';
	const name = source.charAt(0).toUpperCase() + source.slice(1);
	return i18n.baseText('agentSessions.timeline.triggeredVia', { interpolate: { source: name } });
});

const sessionTitle = computed(() => {
	if (!thread.value) return '';
	return truncate(threadTitleOf(thread.value), 64);
});

const selectedItem = computed<TimelineItem | null>(() =>
	selectedIndex.value !== null ? (items.value[selectedIndex.value] ?? null) : null,
);

onMounted(async () => {
	try {
		const result = await sessionsStore.getThreadDetail(
			projectId.value,
			threadId.value,
			agentId.value,
		);
		thread.value = result.thread;
		executions.value = result.executions;
	} catch (error) {
		toast.showError(error, i18n.baseText('agentSessions.showError.load'));
	} finally {
		loading.value = false;
	}
});

function formatDuration(ms: number): string {
	if (!ms || ms <= 0) return '0ms';
	if (ms < 1000) return `${ms}ms`;
	return `${(ms / 1000).toFixed(1)}s`;
}

function goBack() {
	void router.push({
		name: AGENT_BUILDER_VIEW,
		params: { projectId: projectId.value, agentId: agentId.value },
	});
}

function continueChat() {
	void router.push({
		name: AGENT_BUILDER_VIEW,
		params: { projectId: projectId.value, agentId: agentId.value },
		query: { [CONTINUE_SESSION_ID_PARAM]: threadId.value },
	});
}
</script>

<template>
	<div :class="$style.view">
		<div :class="$style.topBar">
			<div :class="$style.topBarLeft">
				<button :class="$style.backButton" @click="goBack">
					<N8nIcon icon="arrow-left" />
				</button>
				<span :class="$style.sessionTitle">{{ sessionTitle }}</span>
			</div>
			<div v-if="thread" :class="$style.topBarRight">
				<span>
					{{ (thread.totalPromptTokens + thread.totalCompletionTokens).toLocaleString() }}
					{{ i18n.baseText('agentSessions.drawer.tokens').toLowerCase() }}
				</span>
				<span :class="$style.sep">·</span>
				<span>${{ thread.totalCost.toFixed(4) }}</span>
				<span :class="$style.sep">·</span>
				<span>{{ formatDuration(thread.totalDuration) }}</span>
				<button
					v-if="triggerSource === 'chat'"
					:class="$style.continueButton"
					@click="continueChat"
				>
					<N8nIcon icon="message-square" :size="12" />
					{{ i18n.baseText('agentSessions.timeline.continueChat') }}
				</button>
			</div>
		</div>

		<div v-if="!loading" :class="$style.subHeader">
			<div v-if="triggerSource" :class="$style.triggerInfo">
				<N8nIcon :icon="triggerIcon" :size="12" />
				<span>{{ triggerLabel }}</span>
			</div>
			<span v-if="triggerSource" :class="$style.divider" aria-hidden="true" />
			<SessionEventFilter
				:available="filterOptions"
				:selected="selectedFilters"
				@update="(next) => (selectedFilters = next)"
			/>
			<div :class="$style.search">
				<N8nInput
					v-model="searchQuery"
					size="mini"
					:placeholder="i18n.baseText('agentSessions.timeline.searchPlaceholder')"
					clearable
				>
					<template #prefix>
						<N8nIcon icon="search" :size="12" />
					</template>
				</N8nInput>
			</div>
		</div>

		<div v-if="!loading && items.length > 0" :class="$style.chartRow">
			<SessionTimelineChart
				:items="items"
				:idle-ranges="idleRanges"
				:session-start="bounds.start"
				:session-end="bounds.end"
				:visible-kinds="selectedFilters"
				:selected-index="selectedIndex"
				@select="(idx) => (selectedIndex = idx)"
			/>
		</div>

		<div :class="$style.panels">
			<div :class="$style.tablePanel">
				<div v-if="loading" :class="$style.loading">Loading...</div>
				<SessionTimelineTable
					v-else
					:items="items"
					:idle-ranges="idleRanges"
					:selected-index="selectedIndex"
					:visible-kinds="selectedFilters"
					:search-query="searchQuery"
					@select="(idx) => (selectedIndex = idx)"
				/>
			</div>
			<div v-if="selectedItem" :class="$style.detailPanel">
				<SessionDetailPanel
					:item="selectedItem"
					:agent-name="thread?.agentName"
					@close="selectedIndex = null"
				/>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.view {
	display: flex;
	flex-direction: column;
	height: 100%;
	overflow: hidden;
}
.topBar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--2xs) var(--spacing--sm);
	background-color: var(--color--foreground--tint-2);
	flex-shrink: 0;
}
.topBarLeft {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}
.topBarRight {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	font-size: var(--font-size--2xs);
	color: var(--color--text);
}
.sep {
	color: var(--color--text--tint-1);
}
.backButton {
	background: none;
	border: none;
	color: var(--color--primary);
	cursor: pointer;
	padding: var(--spacing--4xs);
	border-radius: var(--radius);
	display: flex;
	align-items: center;
	&:hover {
		background-color: var(--color--foreground--tint-1);
	}
}
.sessionTitle {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
}
.continueButton {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	margin-left: var(--spacing--2xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	background: none;
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius);
	color: var(--color--primary);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	cursor: pointer;
	&:hover {
		background-color: var(--color--foreground--tint-1);
	}
}
.subHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xs) var(--spacing--sm);
	background-color: var(--color--foreground--tint-2);
	flex-shrink: 0;
}
.triggerInfo {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	font-size: var(--font-size--2xs);
	color: var(--color--text);
	white-space: nowrap;
}
.divider {
	width: 1px;
	height: 16px;
	background-color: var(--color--foreground);
	flex-shrink: 0;
}
.search {
	width: 220px;
}
.chartRow {
	padding: var(--spacing--sm) var(--spacing--lg);
	border-bottom: var(--border);
	flex-shrink: 0;
}
.panels {
	display: flex;
	flex: 1;
	min-height: 0;
}
.tablePanel {
	flex: 6;
	overflow-y: auto;
	padding: var(--spacing--sm) 0;
}
.detailPanel {
	flex: 4;
	overflow-y: auto;
	/* Border on the panel boundary when present; if the panel is hidden
	   (no selection) the table fills the full width without any divider. */
	border-left: var(--border);
}
.loading {
	padding: var(--spacing--sm);
	color: var(--color--text--tint-1);
}
</style>
