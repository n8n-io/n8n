<script setup lang="ts">
import { computed, ref } from 'vue';
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
import { N8nLoading, N8nIcon } from '@n8n/design-system';
import { IS_DRAFT_PUBLISH_ENABLED } from '@/app/constants';
import type {
	WorkflowHistoryAction,
	WorkflowHistoryTimelineEntry,
} from '@/features/workflows/workflowHistory/types';
import { groupUnnamedVersions } from '@/features/workflows/workflowHistory/utils';

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
const shouldAutoScroll = ref(true);
const expandedGroups = ref<Record<string, boolean>>({});

const { observe: observeForLoadMore } = useIntersectionObserver({
	root: listElement,
	threshold: 0.01,
	onIntersect: () =>
		emit('loadMore', { take: props.requestNumberOfItems, skip: props.items.length }),
});

const groupedEntries = computed(() => groupUnnamedVersions(props.items));

const timelineEntries = computed<WorkflowHistoryTimelineEntry[]>(() => {
	const entries: WorkflowHistoryTimelineEntry[] = [];

	groupedEntries.value.forEach((entry) => {
		if (entry.type === 'group') {
			entries.push(entry);

			if (expandedGroups.value[entry.id]) {
				entry.items.forEach((item, offset) => {
					entries.push({
						type: 'item',
						item,
						itemIndex: entry.itemIndexes[offset],
					});
				});
			}
		} else {
			entries.push(entry);
		}
	});

	return entries;
});

const toggleGroup = (id: string) => {
	expandedGroups.value[id] = !expandedGroups.value[id];
};

const getActions = (item: WorkflowHistory, index: number) => {
	let filteredActions = props.actions;

	if (index === 0) {
		filteredActions = filteredActions.filter((action) => action.value !== 'restore');
	}

	if (IS_DRAFT_PUBLISH_ENABLED) {
		if (item.versionId === props.activeVersionId) {
			filteredActions = filteredActions.filter((action) => action.value !== 'publish');
		} else {
			filteredActions = filteredActions.filter((action) => action.value !== 'unpublish');
		}
	} else {
		filteredActions = filteredActions.filter(
			(action) => action.value !== 'publish' && action.value !== 'unpublish',
		);
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
	index,
	itemIndex,
	offsetTop,
	isSelected,
}: {
	index: number;
	itemIndex: number;
	offsetTop: number;
	isSelected: boolean;
}) => {
	if (isSelected && shouldAutoScroll.value) {
		shouldAutoScroll.value = false;
		listElement.value?.scrollTo({ top: offsetTop, behavior: 'smooth' });
	}

	if (
		itemIndex === props.items.length - 1 &&
		props.lastReceivedItemsLength === props.requestNumberOfItems
	) {
		observeForLoadMore(listElement.value?.children[index]);
	}
};
</script>

<template>
	<ul ref="listElement" :class="$style.list" data-test-id="workflow-history-list">
		<template
			v-for="(entry, index) in timelineEntries"
			:key="entry.type === 'group' ? entry.id : entry.item.versionId"
		>
			<li
				v-if="entry.type === 'group'"
				:class="$style.group"
				data-test-id="workflow-history-unnamed-group"
			>
				<button
					type="button"
					:class="$style.groupToggle"
					data-test-id="workflow-history-unnamed-group-toggle"
					@click="toggleGroup(entry.id)"
				>
					<N8nIcon
						:icon="expandedGroups[entry.id] ? 'chevron-down' : 'chevron-right'"
						size="small"
					/>
				</button>
				<span :class="$style.groupLabel">
					{{
						i18n.baseText('workflowHistory.group.unnamedCountLabel', {
							interpolate: { count: String(entry.count) },
						})
					}}
				</span>
			</li>
			<WorkflowHistoryListItem
				v-else
				:index="entry.itemIndex"
				:timeline-index="index"
				:item="entry.item"
				:is-selected="entry.item.versionId === props.selectedItem?.versionId"
				:is-version-active="entry.item.versionId === props.activeVersionId"
				:actions="getActions(entry.item, entry.itemIndex)"
				@action="onAction"
				@preview="onPreview"
				@mounted="onItemMounted"
			/>
		</template>
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
.list {
	position: absolute;
	left: 0;
	top: 0;
	width: 100%;
	height: 100%;
	overflow: auto;
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

.retention {
	display: grid;
	padding: var(--spacing--sm);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--lg);
	text-align: center;
}

.group {
	position: relative;
	display: grid;
	grid-template-columns: 1fr auto;
	align-items: center;
	padding: var(--spacing--sm);
	padding-left: calc(var(--spacing--lg) + var(--spacing--sm));
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground);
	font-size: var(--font-size--2xs);
	color: var(--color--text);
}

.group::before {
	content: '';
	position: absolute;
	top: 0;
	bottom: 0;
	left: var(--spacing--lg);
	width: 2px;
	background-color: var(--color--foreground--tint-1);
}

.group::after {
	content: '';
	position: absolute;
	top: 50%;
	left: var(--spacing--lg);
	width: 10px;
	height: 10px;
	border-radius: 9999px;
	border: 2px solid var(--color--foreground--shade-2);
	background-color: var(--color--background);
	transform: translate(-50%, -50%);
}

.groupToggle {
	background: none;
	border: none;
	padding: 0;
	margin-right: var(--spacing--xs);
	cursor: pointer;
	display: inline-flex;
	align-items: center;
	justify-content: center;
}

.groupLabel {
	justify-self: flex-start;
}
</style>
