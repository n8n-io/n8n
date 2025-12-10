<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import type { UserAction } from '@n8n/design-system';
import type {
	WorkflowHistory,
	WorkflowVersionId,
	WorkflowHistoryActionTypes,
} from '@n8n/rest-api-client/api/workflowHistory';
import { useI18n } from '@n8n/i18n';
import type { IUser } from 'n8n-workflow';

import { N8nActionToggle, N8nTooltip, N8nBadge, N8nIcon, N8nText } from '@n8n/design-system';
import {
	getLastPublishedVersion,
	formatTimestamp,
	generateVersionName,
} from '@/features/workflows/workflowHistory/utils';
import { useUsersStore } from '@/features/settings/users/users.store';
import type { WorkflowHistoryAction } from '@/features/workflows/workflowHistory/types';

const props = withDefaults(
	defineProps<{
		item: WorkflowHistory;
		index: number;
		actions: Array<UserAction<IUser>>;
		isSelected?: boolean;
		isVersionActive?: boolean;
		isGrouped?: boolean;
	}>(),
	{
		isSelected: false,
		isVersionActive: false,
		isGrouped: false,
	},
);
const emit = defineEmits<{
	action: [value: WorkflowHistoryAction];
	preview: [value: { event: MouseEvent; id: WorkflowVersionId }];
	mounted: [value: { index: number; offsetTop: number; isSelected: boolean }];
}>();

const i18n = useI18n();
const usersStore = useUsersStore();

const actionsVisible = ref(false);
const itemElement = ref<HTMLElement | null>(null);
const authorElement = ref<InstanceType<typeof N8nText> | null>(null);
const isAuthorElementTruncated = ref(false);

const checkAuthorTruncation = () => {
	const el = authorElement.value?.$el;
	if (el instanceof HTMLElement) {
		isAuthorElementTruncated.value = el.scrollWidth > el.clientWidth;
	}
};

const formattedCreatedAt = computed<string>(() => {
	const { date, time } = formatTimestamp(props.item.createdAt);
	return i18n.baseText('workflowHistory.item.createdAt', { interpolate: { date, time } });
});

const authors = computed<{ size: number; label: string }>(() => {
	const allAuthors = props.item.authors.split(', ');
	let label = allAuthors[0];

	if (allAuthors.length > 1) {
		label = `${label} + ${allAuthors.length - 1}`;
	}

	return {
		size: allAuthors.length,
		label,
	};
});

const versionName = computed(() => {
	if (props.item.name) {
		return props.item.name;
	}
	return props.isVersionActive ? generateVersionName(props.item.versionId) : '';
});

const lastPublishInfo = computed(() => {
	if (!props.isVersionActive) {
		return null;
	}

	const lastPublishedByUser = getLastPublishedVersion(props.item.workflowPublishHistory);
	if (!lastPublishedByUser) {
		return null;
	}
	return lastPublishedByUser;
});

const publishedAt = computed(() => {
	if (!lastPublishInfo.value) {
		return null;
	}
	const { date, time } = formatTimestamp(lastPublishInfo.value.createdAt);
	return i18n.baseText('workflowHistory.item.createdAt', { interpolate: { date, time } });
});

const publishedByUserName = computed(() => {
	const userId = lastPublishInfo.value?.userId;
	if (!userId) {
		return null;
	}
	const user = usersStore.usersById[userId];
	return user?.fullName ?? user?.email ?? null;
});

const onAction = (value: string) => {
	const action = value as WorkflowHistoryActionTypes[number];
	emit('action', {
		action,
		id: props.item.versionId,
		data: {
			formattedCreatedAt: formattedCreatedAt.value,
			versionName: versionName.value,
			description: props.item.description,
		},
	});
};

const onVisibleChange = (visible: boolean) => {
	actionsVisible.value = visible;
};

const onItemClick = (event: MouseEvent) => {
	emit('preview', { event, id: props.item.versionId });
};

onMounted(() => {
	emit('mounted', {
		index: props.index,
		offsetTop: itemElement.value?.offsetTop ?? 0,
		isSelected: props.isSelected,
	});
	checkAuthorTruncation();
});
</script>
<template>
	<li
		ref="itemElement"
		data-test-id="workflow-history-list-item"
		role="button"
		:class="{
			[$style.item]: true,
			[$style.selected]: props.isSelected,
			[$style.actionsVisible]: actionsVisible,
			[$style.grouped]: props.isGrouped,
		}"
		@click="onItemClick"
	>
		<!-- Timeline column -->
		<span :class="$style.timelineColumn">
			<template v-if="!props.isGrouped">
				<N8nIcon v-if="props.isVersionActive" size="large" icon="circle-check" color="success" />
				<span v-else :class="$style.timelineMarker" />
			</template>
			<span v-else :class="$style.timelineLine" />
		</span>

		<div :class="$style.content">
			<!-- Named version: show name + badge on first row, author + time on second -->
			<template v-if="versionName">
				<div :class="$style.mainRow">
					<N8nText size="small" :bold="true" color="text-dark" :class="$style.mainLine">
						{{ versionName }}
					</N8nText>
					<N8nTooltip v-if="props.isVersionActive" placement="top" :disabled="!publishedAt">
						<template #content>
							<div :class="$style.tooltipContent">
								<N8nText size="small">
									{{ i18n.baseText('workflowHistory.item.publishedAtLabel') }}
									{{ publishedAt }}
								</N8nText>
								<N8nText v-if="publishedByUserName" size="small">
									{{ publishedByUserName }}
								</N8nText>
							</div>
						</template>
						<N8nBadge size="xsmall" :class="$style.publishedBadge" :show-border="false">
							{{ i18n.baseText('workflowHistory.item.active') }}
						</N8nBadge>
					</N8nTooltip>
				</div>
				<div :class="$style.metaRow">
					<N8nTooltip placement="right-end" :disabled="!isAuthorElementTruncated">
						<template #content>{{ props.item.authors }}</template>
						<N8nText ref="authorElement" size="small" color="text-light" :class="$style.metaItem">
							{{ authors.label }},
						</N8nText>
					</N8nTooltip>
					<N8nText tag="time" size="small" color="text-light" :class="$style.metaItem">
						{{ formattedCreatedAt }}
					</N8nText>
				</div>
			</template>
			<!-- Unnamed version: show author and time on single row -->
			<div v-else :class="$style.unnamedRow">
				<N8nTooltip placement="right-end" :disabled="!isAuthorElementTruncated">
					<template #content>{{ props.item.authors }}</template>
					<N8nText ref="authorElement" size="small" color="text-base" :class="$style.unnamedAuthor">
						{{ authors.label }},
					</N8nText>
				</N8nTooltip>
				<N8nText tag="time" size="small" color="text-light" :class="$style.unnamedTime">
					{{ formattedCreatedAt }}
				</N8nText>
			</div>
		</div>
		<N8nActionToggle
			:class="$style.actions"
			:actions="props.actions"
			placement="bottom-end"
			@action="onAction"
			@click.stop
			@visible-change="onVisibleChange"
		/>
	</li>
</template>
<style module lang="scss">
@use './timeline' as *;

$timelineMarkerDiameter: 13px;
$timelineMarkerBorderWidth: 1.33px;

.item {
	display: flex;
	position: relative;
	align-items: center;
	justify-content: space-between;
	padding: 0 var(--spacing--3xs);
	line-height: var(--line-height--xl);
	border-radius: var(--radius);
	cursor: pointer;

	&.selected,
	&:hover {
		background-color: var(--color--foreground--tint-1);
	}

	margin-top: var(--spacing--lg);

	&:first-child {
		margin-top: 0;
	}

	// Line segment in the gap above this item (not for first item)
	&:not(:first-child):not(.grouped)::before {
		@include timeline-gap-line;
	}

	// Grouped items have smaller gap with line going through
	&.grouped {
		margin-top: var(--spacing--xs);
	}
}

.timelineColumn {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	width: var(--spacing--lg);
	min-width: var(--spacing--lg);
	position: relative;
	align-self: stretch;
}

.timelineMarker {
	position: relative;
	width: $timelineMarkerDiameter;
	height: $timelineMarkerDiameter;
	border-radius: 50%;
	border: $timelineMarkerBorderWidth solid var(--color--foreground--shade-1);
}

.timelineLine {
	position: absolute;
	top: calc(-1 * var(--spacing--xs));
	bottom: 0;
	width: var(--border-width);
	background-color: var(--color--foreground--tint-1);
}

.content {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--2xs);
	flex: 1 1 auto;
	min-width: 0;
}

.mainRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.mainLine {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.metaRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--5xs);
	margin-top: var(--spacing--5xs);
}

.metaItem {
	max-width: 120px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

// Unnamed version styles
.unnamedRow {
	display: flex;
	align-items: center;
}

.unnamedAuthor {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 110px;
}

.unnamedTime {
	margin-left: var(--spacing--5xs);
}

.actions {
	display: block;
	padding: var(--spacing--3xs);
}

.publishedBadge {
	background-color: var(--color--success);
	color: var(--color--foreground--tint-2);
}

.tooltipContent {
	// Set min width to keep the date on the same line
	min-width: 200px;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}
</style>
