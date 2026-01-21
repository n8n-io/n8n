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

import { N8nActionToggle, N8nTooltip, N8nText } from '@n8n/design-system';
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

const versionPublishInfo = computed(() => {
	const publishInfo = getLastPublishedVersion(props.item.workflowPublishHistory);
	return publishInfo;
});

const getPublishedUserName = (userId: string | undefined | null) => {
	if (!userId) {
		return null;
	}
	const user = usersStore.usersById[userId];
	return user?.fullName ?? user?.email ?? null;
};

const mainTooltipContent = computed(() => {
	if (props.isGrouped) {
		return null;
	}

	if (props.isVersionActive) {
		const hasUser = !!getPublishedUserName(lastPublishInfo.value?.userId);
		return hasUser
			? i18n.baseText('workflowHistory.item.publishedBy')
			: i18n.baseText('workflowHistory.item.active');
	}

	if (props.index === 0 && !props.isVersionActive) {
		return i18n.baseText('workflowHistory.item.currentChanges');
	}

	if (versionPublishInfo.value) {
		const hasUser = !!getPublishedUserName(versionPublishInfo.value?.userId);
		return hasUser
			? i18n.baseText('workflowHistory.item.publishedBy')
			: i18n.baseText('workflowHistory.item.active');
	}

	return formattedCreatedAt.value;
});

const mainTooltipDate = computed(() => {
	if (props.isGrouped) {
		return null;
	}

	if (props.isVersionActive && lastPublishInfo.value) {
		return lastPublishInfo.value.createdAt;
	}

	if (versionPublishInfo.value) {
		return versionPublishInfo.value.createdAt;
	}

	return null;
});

const mainTooltipUser = computed(() => {
	if (props.isGrouped) {
		return null;
	}

	if (props.isVersionActive && lastPublishInfo.value) {
		return getPublishedUserName(lastPublishInfo.value.userId);
	}

	if (versionPublishInfo.value) {
		return getPublishedUserName(versionPublishInfo.value.userId);
	}

	return null;
});

const mainTooltipFormattedDate = computed(() => {
	if (!mainTooltipDate.value) {
		return null;
	}
	const { date, time } = formatTimestamp(mainTooltipDate.value);
	return i18n.baseText('workflowHistory.item.createdAt', { interpolate: { date, time } });
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
	<N8nTooltip placement="left" :disabled="!mainTooltipContent" :show-after="300">
		<template #content>
			<div v-if="props.index === 0 && !props.isVersionActive">
				{{ mainTooltipContent }}
			</div>
			<div v-else>
				{{ mainTooltipContent }}
				<template v-if="mainTooltipUser">
					{{ mainTooltipUser }}
				</template>
				<template v-if="mainTooltipFormattedDate">
					<template v-if="mainTooltipUser">, </template>
					{{ mainTooltipFormattedDate }}
				</template>
			</div>
		</template>
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
					<span
						v-if="props.isVersionActive"
						:class="[$style.timelineDot, $style.timelineDotPublished]"
					/>
					<span
						v-else-if="props.index === 0 && !props.isVersionActive"
						:class="[$style.timelineDot, $style.timelineDotLatest]"
					/>
					<span v-else :class="[$style.timelineDot, $style.timelineDotDefault]" />
				</template>
				<span v-else :class="$style.timelineLine" />
			</span>

			<div :class="$style.wrapper">
				<div :class="$style.content">
					<!-- Named version: show name on first row, author + time on second -->
					<template v-if="versionName">
						<div :class="$style.mainRow">
							<N8nText size="small" :bold="true" color="text-dark" :class="$style.mainLine">
								{{ versionName }}
							</N8nText>
						</div>
						<div :class="$style.metaRow">
							<N8nTooltip
								placement="right-end"
								:disabled="!isAuthorElementTruncated"
								:show-after="300"
							>
								<template #content>{{ props.item.authors }}</template>
								<N8nText
									ref="authorElement"
									size="small"
									color="text-base"
									:class="$style.metaItem"
								>
									{{ authors.label }},
								</N8nText>
							</N8nTooltip>
							<N8nText tag="time" size="small" color="text-base" :class="$style.metaItem">
								{{ formattedCreatedAt }}
							</N8nText>
						</div>
					</template>
					<!-- Unnamed version: show author and time on single row -->
					<div v-else :class="$style.unnamedRow">
						<N8nTooltip placement="right-end" :disabled="!isAuthorElementTruncated">
							<template #content>{{ props.item.authors }}</template>
							<N8nText
								ref="authorElement"
								size="small"
								color="text-base"
								:class="$style.unnamedAuthor"
							>
								{{ authors.label }},
							</N8nText>
						</N8nTooltip>
						<N8nText tag="time" size="small" color="text-base" :class="$style.unnamedTime">
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
			</div>
		</li>
	</N8nTooltip>
</template>
<style module lang="scss">
@use './timeline' as *;

$timelineDotSize: 8px;
$hoverBackground: var(--color--background--light-1);

.item {
	display: flex;
	position: relative;
	align-items: center;
	justify-content: space-between;
	padding: 0 var(--spacing--3xs);
	line-height: var(--line-height--xl);
	border-radius: var(--radius);
	cursor: pointer;

	&:not(.grouped) {
		&.selected,
		&:hover {
			background-color: $hoverBackground;
		}
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

		.wrapper {
			border-radius: var(--radius);
		}

		&.selected .wrapper,
		&:hover .wrapper {
			background-color: $hoverBackground;
		}
	}
}

.wrapper {
	display: flex;
	flex: 1;
	align-items: center;
	min-width: 0;
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

.timelineDot {
	height: $timelineDotSize;
	width: $timelineDotSize;
	border-radius: 50%;
	display: inline-block;
}

.timelineDotPublished {
	background-color: var(--color--mint-600);
}

.timelineDotLatest {
	background-color: var(--color--yellow-500);
}

.timelineDotDefault {
	border: var(--border);
	border-color: var(--color--text--tint-2);
}

.timelineLine {
	@include timeline-line-style;
	position: absolute;
	top: calc(-1 * var(--spacing--xs));
	bottom: 0;
}

.content {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--3xs);
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
	white-space: nowrap;
}

.actions {
	display: block;
	padding: var(--spacing--3xs);
}

.publishedBadge {
	background-color: var(--color--success);
	color: var(--color--foreground--tint-2);
}
</style>
