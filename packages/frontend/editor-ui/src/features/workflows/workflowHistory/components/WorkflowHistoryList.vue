<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue';
import type { UserAction } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type {
	WorkflowHistory,
	WorkflowVersionId,
	WorkflowHistoryRequestParams,
} from '@n8n/rest-api-client/api/workflowHistory';
import WorkflowHistoryListItem from './WorkflowHistoryListItem.vue';
import type { IUser } from 'n8n-workflow';
import { I18nT } from 'vue-i18n';
import { useIntersectionObserver } from '@/app/composables/useIntersectionObserver';
import { N8nLoading, N8nIcon, N8nText } from '@n8n/design-system';
import type { WorkflowHistoryAction } from '@/features/workflows/workflowHistory/types';
import {
	computeTimelineEntries,
	getVersionLabel,
	type TimelineEntry,
} from '@/features/workflows/workflowHistory/utils';

const props = defineProps<{
	items: WorkflowHistory[];
	selectedItem?: WorkflowHistory | null;
	actions: Array<UserAction<IUser>>;
	requestNumberOfItems: number;
	lastReceivedItemsLength: number;
	evaluatedPruneTimeInHours: number;
	shouldUpgrade?: boolean;
	isListLoading?: boolean;
	activeVersionId?: string;
	isWorkflowDiffsEnabled?: boolean;
}>();

const emit = defineEmits<{
	action: [value: WorkflowHistoryAction];
	preview: [value: { event: MouseEvent; id: WorkflowVersionId }];
	loadMore: [value: WorkflowHistoryRequestParams];
	upgrade: [];
	compare: [value: { id: WorkflowVersionId }];
}>();

const i18n = useI18n();
const listElement = ref<Element | null>(null);
const loadMoreSentinel = ref<HTMLElement | null>(null);
const shouldAutoScroll = ref(true);
const expandedGroups = reactive<Set<string>>(new Set());

const timelineEntries = computed<TimelineEntry[]>(() => {
	return computeTimelineEntries(props.items);
});

const toggleGroup = (groupId: string) => {
	if (expandedGroups.has(groupId)) {
		expandedGroups.delete(groupId);
	} else {
		expandedGroups.add(groupId);
	}
};

const hasMoreItems = computed(() => props.lastReceivedItemsLength === props.requestNumberOfItems);

const { observe: observeForLoadMore } = useIntersectionObserver({
	root: listElement,
	threshold: 0.01,
	onIntersect: () => {
		shouldAutoScroll.value = false;
		emit('loadMore', { take: props.requestNumberOfItems, skip: props.items.length });
	},
});

watch(
	[loadMoreSentinel, hasMoreItems, () => props.items.length],
	([sentinel, canLoadMore]) => {
		if (sentinel && canLoadMore) {
			observeForLoadMore(sentinel);
		}
	},
	{ immediate: true },
);

const getActions = (item: WorkflowHistory, index: number) => {
	let filteredActions = props.actions;

	if (index === 0) {
		filteredActions = filteredActions.filter((action) => action.value !== 'restore');
	}

	if (item.versionId === props.activeVersionId) {
		filteredActions = filteredActions.filter((action) => action.value !== 'publish');
	} else {
		filteredActions = filteredActions.filter((action) => action.value !== 'unpublish');
	}

	return filteredActions;
};

const onAction = ({ action, id, data }: WorkflowHistoryAction) => {
	shouldAutoScroll.value = false;
	emit('action', { action, id, data });
};

const onPreview = ({ event, id }: { event: MouseEvent; id: WorkflowVersionId }) => {
	shouldAutoScroll.value = false;
	emit('preview', { event, id });
};

const onCompare = ({ id }: { id: WorkflowVersionId }) => {
	shouldAutoScroll.value = false;
	emit('compare', { id });
};

const getHistoryVersionLabel = (workflowHistoryItem: WorkflowHistory): string => {
	const isCurrentVersion = workflowHistoryItem.versionId === props.items[0]?.versionId;
	return isCurrentVersion
		? i18n.baseText('workflowHistory.item.currentChanges')
		: getVersionLabel(workflowHistoryItem);
};

const getItemToCompareWith = (
	item: WorkflowHistory,
	index: number,
): { name: string; versionId: WorkflowVersionId } | null => {
	if (!props.isWorkflowDiffsEnabled) {
		return null;
	}

	if (!props.selectedItem) {
		return null;
	}

	const isSelected = props.items[index]?.versionId === props.selectedItem?.versionId;

	if (isSelected) {
		const previousVersion = props.items[index + 1];
		if (!previousVersion) {
			return null;
		}

		return {
			name: getHistoryVersionLabel(previousVersion),
			versionId: previousVersion.versionId,
		};
	}

	return {
		name: getHistoryVersionLabel(props.selectedItem),
		versionId: item.versionId,
	};
};

const onItemMounted = ({
	offsetTop,
	isSelected,
}: {
	index: number;
	offsetTop: number;
	isSelected: boolean;
}) => {
	if (isSelected && shouldAutoScroll.value) {
		shouldAutoScroll.value = false;
		listElement.value?.scrollTo({ top: offsetTop, behavior: 'smooth' });
	}
};

const pruneTimeDisplay = computed(() => {
	const timeInHours = props.evaluatedPruneTimeInHours;

	if (timeInHours < 24) {
		const key = timeInHours === 1 ? 'workflowHistory.limitHour' : 'workflowHistory.limitHours';
		return i18n.baseText(key, {
			interpolate: { hours: String(timeInHours) },
		});
	} else {
		const days = Math.round(timeInHours / 24);
		const key = days === 1 ? 'workflowHistory.limitDay' : 'workflowHistory.limitDays';
		return i18n.baseText(key, { interpolate: { days: String(days) } });
	}
});
</script>

<template>
	<ul ref="listElement" :class="$style.list" data-test-id="workflow-history-list">
		<template
			v-for="entry in timelineEntries"
			:key="entry.type === 'version' ? entry.item.versionId : entry.groupId"
		>
			<!-- Group header for collapsed unnamed versions -->
			<li
				v-if="entry.type === 'group-header'"
				:class="$style.groupHeader"
				:aria-expanded="expandedGroups.has(entry.groupId)"
				role="button"
				data-test-id="workflow-history-group-header"
				@click="toggleGroup(entry.groupId)"
			>
				<N8nIcon
					:class="[$style.groupTimelineColumn, $style.groupChevron]"
					:icon="expandedGroups.has(entry.groupId) ? 'chevron-down' : 'chevron-right'"
					size="small"
				/>
				<N8nText color="text-base" size="small">
					{{
						i18n.baseText('workflowHistory.group.unnamedVersions', {
							adjustToNumber: entry.count,
							interpolate: { count: String(entry.count) },
						})
					}}
				</N8nText>
			</li>

			<!-- Expanded group versions -->
			<template v-if="entry.type === 'group-header' && expandedGroups.has(entry.groupId)">
				<WorkflowHistoryListItem
					v-for="versionEntry in entry.versions"
					:key="versionEntry.item.versionId"
					:index="versionEntry.originalIndex"
					:item="versionEntry.item"
					:compare-with="getItemToCompareWith(versionEntry.item, versionEntry.originalIndex)"
					:is-selected="versionEntry.item.versionId === props.selectedItem?.versionId"
					:is-version-active="versionEntry.item.versionId === props.activeVersionId"
					:actions="getActions(versionEntry.item, versionEntry.originalIndex)"
					:is-workflow-diffs-enabled="props.isWorkflowDiffsEnabled"
					:is-grouped="true"
					@action="onAction"
					@preview="onPreview"
					@compare="onCompare"
					@mounted="onItemMounted"
				/>
			</template>

			<!-- Regular version entry -->
			<WorkflowHistoryListItem
				v-if="entry.type === 'version'"
				:index="entry.originalIndex"
				:item="entry.item"
				:compare-with="getItemToCompareWith(entry.item, entry.originalIndex)"
				:is-selected="entry.item.versionId === props.selectedItem?.versionId"
				:is-version-active="entry.item.versionId === props.activeVersionId"
				:actions="getActions(entry.item, entry.originalIndex)"
				:is-workflow-diffs-enabled="props.isWorkflowDiffsEnabled"
				@action="onAction"
				@preview="onPreview"
				@compare="onCompare"
				@mounted="onItemMounted"
			/>
		</template>
		<li
			v-if="props.items.length && hasMoreItems"
			ref="loadMoreSentinel"
			:class="$style.sentinel"
			aria-hidden="true"
		/>
		<li
			v-if="props.isListLoading"
			:class="$style.loader"
			role="status"
			aria-live="polite"
			aria-busy="true"
			:aria-label="i18n.baseText('generic.loading')"
		>
			<N8nLoading :rows="3" class="mb-xs" />
			<N8nLoading :rows="3" class="mb-xs" />
			<N8nLoading :rows="3" class="mb-xs" />
		</li>
		<li v-if="props.shouldUpgrade" :class="$style.retention">
			<span data-test-id="prune-time-display">
				{{ pruneTimeDisplay }}
			</span>
			<I18nT keypath="workflowHistory.upgrade" tag="span" scope="global">
				<template #link>
					<a href="#" @click="emit('upgrade')">
						{{ i18n.baseText('workflowHistory.upgrade.link') }}
					</a>
				</template>
			</I18nT>
		</li>
	</ul>
</template>

<style module lang="scss">
@use './timeline' as *;

.list {
	position: absolute;
	left: 0;
	top: 0;
	width: 100%;
	height: 100%;
	overflow: auto;
	padding: var(--spacing--sm) var(--spacing--2xs);
}

.loader {
	padding: 0 var(--spacing--sm);
}

.sentinel {
	height: 1px;
}

.retention {
	display: grid;
	padding: var(--spacing--sm);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--lg);
	text-align: center;
}

.groupHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--3xs);
	margin-top: var(--spacing--lg);
	cursor: pointer;
	position: relative;

	// Line segment in the gap above this item (not for first item)
	&:not(:first-child)::before {
		@include timeline-gap-line;
	}
}

.groupTimelineColumn {
	min-width: var(--spacing--lg);
}

.groupChevron {
	color: var(--color--text--tint-1);
}
</style>
