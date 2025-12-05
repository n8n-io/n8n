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

import { N8nActionToggle, N8nTooltip, N8nBadge } from '@n8n/design-system';
import {
	getLastPublishedByUser,
	formatTimestamp,
} from '@/features/workflows/workflowHistory/utils';
import { IS_DRAFT_PUBLISH_ENABLED } from '@/app/constants';
import { useUsersStore } from '@/features/settings/users/users.store';
import type { WorkflowHistoryAction } from '@/features/workflows/workflowHistory/types';

const props = withDefaults(
	defineProps<{
		item: WorkflowHistory;
		index: number;
		timelineIndex?: number;
		actions: Array<UserAction<IUser>>;
		isSelected?: boolean;
		isVersionActive?: boolean;
	}>(),
	{
		isSelected: false,
		isVersionActive: false,
	},
);
const emit = defineEmits<{
	action: [value: WorkflowHistoryAction];
	preview: [value: { event: MouseEvent; id: WorkflowVersionId }];
	mounted: [
		value: {
			index: number;
			itemIndex: number;
			offsetTop: number;
			isSelected: boolean;
		},
	];
}>();

const i18n = useI18n();
const usersStore = useUsersStore();

const actionsVisible = ref(false);
const effectiveTimelineIndex = computed(() =>
	props.timelineIndex === undefined ? props.index : props.timelineIndex,
);
const itemElement = ref<HTMLElement | null>(null);
const authorElement = ref<HTMLElement | null>(null);
const isAuthorElementTruncated = ref(false);

const isDraftPublishEnabled = IS_DRAFT_PUBLISH_ENABLED;

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
	return props.item.name;
});

const lastPublishInfo = computed(() => {
	if (!props.isVersionActive) {
		return null;
	}

	const lastPublishedByUser = getLastPublishedByUser(props.item.workflowPublishHistory);
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

const idLabel = computed<string>(() =>
	i18n.baseText('workflowHistory.item.id', { interpolate: { id: props.item.versionId } }),
);

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
		index: effectiveTimelineIndex.value,
		itemIndex: props.index,
		offsetTop: itemElement.value?.offsetTop ?? 0,
		isSelected: props.isSelected,
	});
	isAuthorElementTruncated.value =
		(authorElement.value?.scrollWidth ?? 0) > (authorElement.value?.clientWidth ?? 0);
});
</script>
<template>
	<li
		ref="itemElement"
		data-test-id="workflow-history-list-item"
		:class="{
			[$style.item]: true,
			[$style.selected]: props.isSelected,
			[$style.actionsVisible]: actionsVisible,
		}"
	>
		<slot :formatted-created-at="formattedCreatedAt">
			<p v-if="isDraftPublishEnabled" :class="$style.content" @click="onItemClick">
				<span v-if="versionName" :class="$style.mainLine">{{ versionName }}</span>
				<span :class="$style.metaRow">
					<time :datetime="item.createdAt" :class="$style.metaItem">
						{{ i18n.baseText('workflowHistory.item.savedAtLabel') }} {{ formattedCreatedAt }}
					</time>
					<N8nTooltip
						placement="right-end"
						:disabled="authors.size < 2 && !isAuthorElementTruncated"
					>
						<template #content>{{ props.item.authors }}</template>
						<span ref="authorElement" :class="$style.metaItem">{{ authors.label }}</span>
					</N8nTooltip>
				</span>
				<span v-if="publishedAt || publishedByUserName" :class="$style.metaRowSecondary">
					<time v-if="publishedAt" :datetime="item.updatedAt" :class="$style.metaItem">
						{{ i18n.baseText('workflowHistory.item.publishedAtLabel') }} {{ publishedAt }}
					</time>
					<span v-if="publishedByUserName" :class="$style.metaItem">
						{{ publishedByUserName }}
					</span>
				</span>
			</p>
			<p v-else :class="$style.contentLegacy" @click="onItemClick">
				<time :datetime="item.createdAt">{{ formattedCreatedAt }}</time>
				<N8nTooltip placement="right-end" :disabled="authors.size < 2 && !isAuthorElementTruncated">
					<template #content>{{ props.item.authors }}</template>
					<span ref="authorElement">{{ authors.label }}</span>
				</N8nTooltip>
				<data :value="item.versionId">{{ idLabel }}</data>
			</p>
		</slot>
		<div :class="$style.tail">
			<N8nBadge
				v-if="isDraftPublishEnabled && props.isVersionActive"
				size="medium"
				:class="$style.publishedBadge"
				:show-border="false"
			>
				{{ i18n.baseText('workflowHistory.item.active') }}
			</N8nBadge>
			<N8nBadge v-if="!isDraftPublishEnabled && props.index === 0">
				{{ i18n.baseText('workflowHistory.item.latest') }}
			</N8nBadge>
			<N8nActionToggle
				theme="dark"
				:class="$style.actions"
				:actions="props.actions"
				placement="bottom-end"
				@action="onAction"
				@click.stop
				@visible-change="onVisibleChange"
			>
				<slot name="action-toggle-button" />
			</N8nActionToggle>
		</div>
	</li>
</template>
<style module lang="scss">
.item {
	position: relative;
	display: grid;
	grid-template-columns: 1fr auto;
	align-items: stretch;
	border-left: 2px var(--border-style) transparent;
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground);
	color: var(--color--text);
	font-size: var(--font-size--2xs);
}

.item::before {
	content: '';
	position: absolute;
	top: 0;
	bottom: 0;
	left: var(--spacing--lg);
	width: 2px;
	background-color: var(--color--foreground--tint-1);
}

.item::after {
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

.content,
.contentLegacy {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--sm);
	padding-left: calc(var(--spacing--lg) + var(--spacing--sm));
	cursor: pointer;
	flex: 1 1 auto;
}

.mainLine {
	color: var(--color--text--shade-1);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
}

.metaRow,
.metaRowSecondary {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.metaItem {
	max-width: 180px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	font-size: var(--font-size--2xs);
	color: var(--color--text);
	font-weight: var(--font-weight--regular);
}

.contentLegacy {
	time {
		padding: 0 0 var(--spacing--5xs);
		color: var(--color--text--shade-1);
		font-size: var(--font-size--sm);
		font-weight: var(--font-weight--bold);
	}

	span,
	data {
		max-width: 160px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		margin-top: calc(var(--spacing--4xs) * -1);
		font-size: var(--font-size--2xs);
	}
}

.tail {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: var(--spacing--3xs);
	padding-right: var(--spacing--sm);
}

.item.selected {
	background-color: var(--color--background);
	border-left-color: var(--color--primary);

	.content,
	.contentLegacy {
		cursor: default;
	}
}

.item:hover,
.item.actionsVisible {
	border-left-color: var(--color--foreground--shade-2);
}

.actions {
	display: block;
	padding: var(--spacing--3xs);
}

.publishedBadge {
	background-color: var(--color--success);
	color: var(--color--foreground--tint-2);

	:global(.n8n-text) {
		font-size: var(--font-size--2xs);
		line-height: var(--line-height--sm);
	}
}
</style>
