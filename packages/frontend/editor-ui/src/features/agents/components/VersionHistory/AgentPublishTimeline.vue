<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { useNow } from '@vueuse/core';
import dateformat from 'dateformat';
import type { AgentPublishHistoryItemDto } from '@n8n/api-types';
import { N8nButton, N8nLoading, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@n8n/composables/useToast';
import { generateVersionLabelFromId } from '@n8n/composables/useWorkflowVersionLabel';
import { useIntersectionObserver } from '@/app/composables/useIntersectionObserver';
import { formatPublicationDuration } from '@/app/utils/publicationHistoryUtils';
import { listAgentPublishHistory } from '../../composables/useAgentApi';
import { formatTimestamp } from './agentVersionHistory.utils';
import AgentVersionStatusIndicator from './AgentVersionStatusIndicator.vue';

const props = defineProps<{ projectId: string; agentId: string }>();
const i18n = useI18n();
const rootStore = useRootStore();
const toast = useToast();
const now = useNow({ interval: 1000 });
const events = ref<AgentPublishHistoryItemDto[]>([]);
const loading = ref(true);
const hasMore = ref(false);
const hasError = ref(false);
const list = ref<HTMLElement | null>(null);
const sentinel = ref<HTMLElement | null>(null);
const PAGE_SIZE = 20;
let fetchedCount = 0;
let requestToken = 0;
let retryRefresh = true;

async function load(refresh = false) {
	if (!refresh && (loading.value || !hasMore.value)) return;
	const token = ++requestToken;
	loading.value = true;
	hasError.value = false;

	try {
		const data = await listAgentPublishHistory(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
			{
				take: PAGE_SIZE,
				skip: refresh ? 0 : fetchedCount,
			},
		);

		if (token !== requestToken) return;

		events.value = refresh
			? data
			: [...new Map([...events.value, ...data].map((event) => [event.id, event])).values()];
		fetchedCount = (refresh ? 0 : fetchedCount) + data.length;
		hasMore.value = data.length === PAGE_SIZE;
	} catch (error) {
		if (token !== requestToken) return;

		hasError.value = true;
		retryRefresh = refresh;
		toast.showError(error, i18n.baseText('agents.versionHistory.timeline.error'));
	} finally {
		if (token === requestToken) loading.value = false;
	}
}

const { observe } = useIntersectionObserver({
	root: list,
	threshold: 0.01,
	onIntersect: () => {
		void load();
	},
});

watch([sentinel, hasMore, () => events.value.length], ([target, more]) => {
	if (target && more) observe(target);
});

onMounted(() => {
	void load(true);
});

onBeforeUnmount(() => {
	requestToken++;
});

defineExpose({ refresh: () => load(true) });

const entries = computed(() =>
	events.value.map((event) => {
		const started = new Date(event.createdAt);
		const version =
			event.name ??
			(event.versionId
				? generateVersionLabelFromId(event.versionId)
				: i18n.baseText('agents.versionHistory.timeline.deletedVersion'));
		const title =
			event.event === 'activated'
				? i18n.baseText('agents.versionHistory.timeline.published', { interpolate: { version } })
				: i18n.baseText('agents.versionHistory.timeline.unpublished');
		const duration = event.isLegacy
			? i18n.baseText('agents.versionHistory.timeline.legacyDuration')
			: i18n.baseText(
					event.event === 'activated'
						? 'workflowHistory.publishTimeline.activeDuration'
						: 'workflowHistory.publishTimeline.inactiveDuration',
					{
						interpolate: {
							duration: formatPublicationDuration(
								started,
								event.endedAt ? new Date(event.endedAt) : now.value,
							),
						},
					},
				);
		const { date, time } = formatTimestamp(event.createdAt);
		const timestamp = i18n.baseText('agents.versionHistory.item.createdAt', {
			interpolate: { date, time },
		});
		const tooltip = [
			title,
			`${event.author}, ${timestamp}`,
			event.description,
			event.isLegacy ? i18n.baseText('agents.versionHistory.timeline.legacyHint') : null,
		]
			.filter(Boolean)
			.join('\n');
		const shortDate = dateformat(
			started,
			started.toDateString() === now.value.toDateString()
				? 'HH:MM'
				: started.getFullYear() === now.value.getFullYear()
					? 'd mmm'
					: 'd mmm yyyy',
		);

		return { ...event, title, duration, tooltip, shortDate };
	}),
);
</script>

<template>
	<div ref="list" :class="$style.timeline" data-test-id="agent-publish-timeline">
		<N8nLoading v-if="loading && !events.length" :rows="6" :loading="true" animated />
		<div v-else-if="!events.length" :class="$style.empty" :role="hasError ? 'alert' : undefined">
			<N8nText size="small" color="text-base">{{
				i18n.baseText(
					hasError
						? 'agents.versionHistory.timeline.error'
						: 'agents.versionHistory.timeline.empty',
				)
			}}</N8nText>
		</div>
		<ol v-else :class="$style.entries">
			<li
				v-for="entry in entries"
				:key="entry.id"
				:class="[$style.entry, { [$style.active]: entry.isActive }]"
				data-test-id="agent-publish-timeline-entry"
			>
				<N8nTooltip :content="entry.tooltip" placement="left">
					<div :class="$style.entryContent">
						<N8nText size="small" color="text-base" :class="$style.duration">{{
							entry.duration
						}}</N8nText>
						<div :class="$style.row">
							<span
								role="img"
								:aria-label="
									entry.isActive
										? i18n.baseText('agents.versionHistory.item.publishedBadge')
										: entry.title
								"
								:class="$style.marker"
							>
								<AgentVersionStatusIndicator :status="entry.isActive ? 'published' : 'default'" />
							</span>
							<N8nText size="small" :bold="true" :class="$style.title">{{ entry.title }}</N8nText>
							<N8nText
								tag="time"
								size="small"
								color="text-base"
								:datetime="entry.createdAt"
								:class="$style.date"
								>{{ entry.shortDate }}</N8nText
							>
						</div>
					</div>
				</N8nTooltip>
			</li>
		</ol>
		<div v-if="hasMore" ref="sentinel" :class="$style.sentinel" />
		<N8nLoading v-if="loading && events.length" :rows="1" :loading="true" />
		<N8nButton v-if="hasError" variant="ghost" :disabled="loading" @click="load(retryRefresh)">{{
			i18n.baseText('generic.retry')
		}}</N8nButton>
	</div>
</template>

<style module lang="scss">
.timeline {
	flex: 1;
	min-height: 0;
	overflow-y: auto;
	padding: var(--spacing--2xs);
}
.empty {
	padding: var(--spacing--lg);
	text-align: center;
}
.entries {
	list-style: none;
	padding: 0;
	margin: 0;
}
.entry {
	position: relative;
	border-radius: var(--radius);
	padding: var(--spacing--xs) var(--spacing--2xs);
}
.entry:not(:last-child)::after {
	content: '';
	position: absolute;
	left: calc(var(--spacing--2xs) + var(--spacing--lg) / 2);
	top: calc(100% - var(--spacing--xs));
	height: var(--spacing--lg);
	border-left: var(--border);
	pointer-events: none;
}
.active {
	background: var(--background--subtle);
}
.entryContent {
	min-width: 0;
}
.duration {
	display: block;
	padding-left: calc(var(--spacing--lg) + var(--spacing--2xs));
	margin-bottom: var(--spacing--xs);
}
.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}
.marker {
	width: var(--spacing--lg);
	flex-shrink: 0;
	display: flex;
	justify-content: center;
}
.title {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	flex: 1;
}
.date {
	flex-shrink: 0;
}
.sentinel {
	height: var(--spacing--5xs);
}
</style>
