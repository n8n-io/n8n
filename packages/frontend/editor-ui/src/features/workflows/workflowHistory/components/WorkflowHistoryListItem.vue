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

import { N8nActionToggle, N8nIconButton, N8nTooltip, N8nText } from '@n8n/design-system';
import {
	getLastPublishedVersion,
	formatTimestamp,
	getVersionLabel,
} from '@/features/workflows/workflowHistory/utils';
import { useUsersStore } from '@/features/settings/users/users.store';
import type { WorkflowHistoryAction } from '@/features/workflows/workflowHistory/types';

const props = withDefaults(
	defineProps<{
		item: WorkflowHistory;
		index: number;
		compareWith?: { name: string; versionId: WorkflowVersionId } | null;
		actions: Array<UserAction<IUser>>;
		isSelected?: boolean;
		isVersionActive?: boolean;
		isGrouped?: boolean;
		isWorkflowDiffsEnabled?: boolean;
	}>(),
	{
		compareWith: null,
		isSelected: false,
		isVersionActive: false,
		isGrouped: false,
		isWorkflowDiffsEnabled: false,
	},
);
const emit = defineEmits<{
	action: [value: WorkflowHistoryAction];
	preview: [value: { event: MouseEvent; id: WorkflowVersionId }];
	mounted: [value: { index: number; offsetTop: number; isSelected: boolean }];
	compare: [value: { id: WorkflowVersionId }];
}>();

const i18n = useI18n();
const usersStore = useUsersStore();

const actionsVisible = ref(false);
const itemElement = ref<HTMLElement | null>(null);

const formattedCreatedAt = computed<string>(() => {
	const { date, time } = formatTimestamp(props.item.createdAt);
	return i18n.baseText('workflowHistory.item.createdAt', { interpolate: { date, time } });
});

const authorLabel = computed<string>(() => {
	const allAuthors = props.item.authors.split(', ');
	let displayLabel = allAuthors[0];

	if (allAuthors.length > 1) {
		displayLabel = `${displayLabel} + ${allAuthors.length - 1}`;
	}

	return displayLabel;
});

const versionName = computed(() => {
	if (props.index === 0) {
		return i18n.baseText('workflowHistory.item.currentChanges');
	}

	return getVersionLabel(props.item);
});

const versionPublishInfo = computed(() => {
	const publishInfo = getLastPublishedVersion(props.item.workflowPublishHistory);
	return publishInfo;
});

const isPublishedVersion = computed(() => Boolean(versionPublishInfo.value));

const getPublishedUserName = (userId: string | undefined | null) => {
	if (!userId) {
		return null;
	}
	const user = usersStore.usersById[userId];
	return user?.fullName ?? user?.email ?? null;
};

const mainTooltipInfo = computed<{
	content: string | null;
	date: string | null;
	user: string | null;
}>(() => {
	if (props.isGrouped || !versionPublishInfo.value) {
		return { content: null, date: null, user: null };
	}

	const user = getPublishedUserName(versionPublishInfo.value.userId);
	return {
		content: user
			? i18n.baseText('workflowHistory.item.publishedBy')
			: i18n.baseText('workflowHistory.item.active'),
		date: versionPublishInfo.value.createdAt,
		user,
	};
});

const mainTooltipContent = computed(() => mainTooltipInfo.value.content);
const mainTooltipUser = computed(() => mainTooltipInfo.value.user);
const mainTooltipDate = computed(() => mainTooltipInfo.value.date);

const mainTooltipFormattedDate = computed(() => {
	if (!mainTooltipDate.value) {
		return null;
	}
	const { date, time } = formatTimestamp(mainTooltipDate.value);
	return i18n.baseText('workflowHistory.item.createdAt', { interpolate: { date, time } });
});

const isCompareDisabled = computed(() => !props.compareWith?.versionId);

const compareTooltipContent = computed(() => {
	return props.compareWith?.name ? `Compare with ${props.compareWith.name}` : '';
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

const onCompareClick = () => {
	if (!props.compareWith?.versionId) {
		return;
	}
	emit('compare', { id: props.compareWith.versionId });
};

onMounted(() => {
	emit('mounted', {
		index: props.index,
		offsetTop: itemElement.value?.offsetTop ?? 0,
		isSelected: props.isSelected,
	});
});
</script>
<template>
	<N8nTooltip placement="left" :disabled="!mainTooltipContent" :show-after="300">
		<template #content>
			<div>
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
				[$style.firstItem]: props.index === 0,
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
					<div :class="$style.mainRow">
						<N8nText size="small" :bold="true" color="text-dark" :class="$style.mainLine">
							{{ versionName }}
							<template v-if="isPublishedVersion">
								({{ i18n.baseText('workflowHistory.item.active') }})
							</template>
						</N8nText>
					</div>
					<div :class="$style.metaRow">
						<N8nText size="small" color="text-base" :class="$style.metaAuthor">
							{{ authorLabel }},
						</N8nText>
						<N8nText tag="time" size="small" color="text-base" :class="$style.metaTime">
							{{ formattedCreatedAt }}
						</N8nText>
					</div>
				</div>
				<N8nTooltip
					v-if="props.isWorkflowDiffsEnabled"
					:content="compareTooltipContent"
					:disabled="isCompareDisabled"
					placement="top"
				>
					<N8nIconButton
						variant="ghost"
						icon="file-diff"
						:disabled="isCompareDisabled"
						:class="$style.compareButton"
						data-test-id="workflow-history-compare-item-button"
						@click.stop="onCompareClick"
					/>
				</N8nTooltip>
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
$authorMaxWidth: 130px;

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

	&.firstItem {
		margin-top: 0;
	}

	// Line segment in the gap above this item (not for first item)
	&:not(.firstItem):not(.grouped)::before {
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
	min-width: 0;
}

.metaAuthor {
	display: block;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: $authorMaxWidth;
}

.metaTime {
	white-space: nowrap;
	flex-shrink: 0;
}

.actions {
	display: block;
	padding: var(--spacing--3xs);
	flex-shrink: 0;
	align-self: center;
}

.compareButton {
	flex-shrink: 0;
}
</style>
