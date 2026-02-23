<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import dateformat from 'dateformat';
import type { UserAction } from '@n8n/design-system';
import type {
	WorkflowHistory,
	WorkflowVersionId,
	WorkflowHistoryActionTypes,
} from '@n8n/rest-api-client/api/workflowHistory';
import { useI18n } from '@n8n/i18n';
import type { IUser } from 'n8n-workflow';

import { N8nActionToggle, N8nBadge, N8nTooltip } from '@n8n/design-system';
const props = defineProps<{
	item: WorkflowHistory;
	index: number;
	actions: Array<UserAction<IUser>>;
	isActive: boolean;
}>();
const emit = defineEmits<{
	action: [
		value: {
			action: WorkflowHistoryActionTypes[number];
			id: WorkflowVersionId;
			data: { formattedCreatedAt: string };
		},
	];
	preview: [value: { event: MouseEvent; id: WorkflowVersionId }];
	mounted: [value: { index: number; offsetTop: number; isActive: boolean }];
}>();

const i18n = useI18n();

const actionsVisible = ref(false);
const itemElement = ref<HTMLElement | null>(null);
const authorElement = ref<HTMLElement | null>(null);
const isAuthorElementTruncated = ref(false);

const formattedCreatedAt = computed<string>(() => {
	const currentYear = new Date().getFullYear().toString();
	const [date, time] = dateformat(
		props.item.createdAt,
		`${props.item.createdAt.startsWith(currentYear) ? '' : 'yyyy '}mmm d"#"HH:MM:ss`,
	).split('#');

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

const idLabel = computed<string>(() =>
	i18n.baseText('workflowHistory.item.id', { interpolate: { id: props.item.versionId } }),
);

const onAction = (value: string) => {
	const action = value as WorkflowHistoryActionTypes[number];
	emit('action', {
		action,
		id: props.item.versionId,
		data: { formattedCreatedAt: formattedCreatedAt.value },
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
		isActive: props.isActive,
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
			[$style.active]: props.isActive,
			[$style.actionsVisible]: actionsVisible,
		}"
	>
		<slot :formatted-created-at="formattedCreatedAt">
			<p @click="onItemClick">
				<time :datetime="item.createdAt">{{ formattedCreatedAt }}</time>
				<N8nTooltip placement="right-end" :disabled="authors.size < 2 && !isAuthorElementTruncated">
					<template #content>{{ props.item.authors }}</template>
					<span ref="authorElement">{{ authors.label }}</span>
				</N8nTooltip>
				<data :value="item.versionId">{{ idLabel }}</data>
			</p>
		</slot>
		<div :class="$style.tail">
			<N8nBadge v-if="props.index === 0">
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
	display: flex;
	position: relative;
	align-items: center;
	justify-content: space-between;
	border-left: 2px var(--border-style) transparent;
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground);
	color: var(--color--text);
	font-size: var(--font-size--2xs);

	p {
		display: grid;
		padding: var(--spacing--sm);
		cursor: pointer;
		flex: 1 1 auto;

		time {
			padding: 0 0 var(--spacing--5xs);
			color: var(--color--text--shade-1);
			font-size: var(--font-size--sm);
			font-weight: var(--font-weight--bold);
		}

		span,
		data {
			justify-self: start;
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
		justify-content: space-between;
	}

	&.active {
		background-color: var(--color--background);
		border-left-color: var(--color--primary);

		p {
			cursor: default;
		}
	}

	&:hover,
	&.actionsVisible {
		border-left-color: var(--color--foreground--shade-2);
	}
}

.actions {
	display: block;
	padding: var(--spacing--3xs);
}
</style>
