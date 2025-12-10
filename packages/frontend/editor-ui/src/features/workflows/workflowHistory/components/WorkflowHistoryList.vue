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
	type TimelineEntry,
} from '@/features/workflows/workflowHistory/utils';

const props = defineProps<{
	items: WorkflowHistory[];
	selectedItem?: WorkflowHistory | null;
	actions: Array<UserAction<IUser>>;
	requestNumberOfItems: number;
	lastReceivedItemsLength: number;
	evaluatedPruneDays: number;
	shouldUpgrade?: boolean;
	isListLoading?: boolean;
	activeVersionId?: string;
}>();

const emit = defineEmits<{
	action: [value: WorkflowHistoryAction];
	preview: [value: { event: MouseEvent; id: WorkflowVersionId }];
	loadMore: [value: WorkflowHistoryRequestParams];
	upgrade: [];
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
					:is-selected="versionEntry.item.versionId === props.selectedItem?.versionId"
					:is-version-active="versionEntry.item.versionId === props.activeVersionId"
					:actions="getActions(versionEntry.item, versionEntry.originalIndex)"
					:is-grouped="true"
					@action="onAction"
					@preview="onPreview"
					@mounted="onItemMounted"
				/>
			</template>

			<!-- Regular version entry -->
			<WorkflowHistoryListItem
				v-if="entry.type === 'version'"
				:index="entry.originalIndex"
				:item="entry.item"
				:is-selected="entry.item.versionId === props.selectedItem?.versionId"
				:is-version-active="entry.item.versionId === props.activeVersionId"
				:actions="getActions(entry.item, entry.originalIndex)"
				@action="onAction"
				@preview="onPreview"
				@mounted="onItemMounted"
			/>
		</template>
		<li
			v-if="props.items.length && hasMoreItems"
			ref="loadMoreSentinel"
			:class="$style.sentinel"
			aria-hidden="true"
		/>
		<li v-if="!props.items.length && !props.isListLoading" :class="$style.empty">
			{{ i18n.baseText('workflowHistory.empty') }}
			<br />
			{{ i18n.baseText('workflowHistory.hint') }}
		</li>
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
			<span>
				{{
					i18n.baseText('workflowHistory.limit', {
						interpolate: { days: String(props.evaluatedPruneDays) },
					})
				}}
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

.empty {
	display: flex;
	position: absolute;
	height: 100%;
	padding: 0 25%;
	justify-content: center;
	align-items: center;
	text-align: center;
	color: var(--color--text);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--lg);
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
