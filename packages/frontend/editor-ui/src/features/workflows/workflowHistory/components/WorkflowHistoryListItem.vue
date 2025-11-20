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

import { N8nActionToggle, N8nTooltip, N8nBadge } from '@n8n/design-system';

const props = withDefaults(
	defineProps<{
		item: WorkflowHistory;
		index: number;
		actions: Array<UserAction<IUser>>;
		isSelected: boolean;
		isVersionActive?: boolean;
	}>(),
	{
		isVersionActive: false,
	},
);
const emit = defineEmits<{
	action: [
		value: {
			action: WorkflowHistoryActionTypes[number];
			id: WorkflowVersionId;
			data: { formattedCreatedAt: string };
		},
	];
	preview: [value: { event: MouseEvent; id: WorkflowVersionId }];
	mounted: [value: { index: number; offsetTop: number; isSelected: boolean }];
}>();

const i18n = useI18n();

const actionsVisible = ref(false);
const itemElement = ref<HTMLElement | null>(null);
const authorElement = ref<HTMLElement | null>(null);
const isAuthorElementTruncated = ref(false);

const formatTimestamp = (value: string) => {
	const currentYear = new Date().getFullYear().toString();
	const [date, time] = dateformat(
		value,
		`${value.startsWith(currentYear) ? '' : 'yyyy '}mmm d"#"HH:MM:ss`,
	).split('#');

	return i18n.baseText('workflowHistory.item.createdAt', { interpolate: { date, time } });
};

const formattedCreatedAt = computed<string>(() => formatTimestamp(props.item.createdAt));

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
	// TODO: this should be returned as part of the history item payload
	return props.isVersionActive ? 'Version X' : null;
});

const publishedAt = computed(() => {
	// TODO: replace with the actual published timestamp once available
	return props.isVersionActive ? 'Published at X' : null;
});

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
			<p @click="onItemClick">
				<span v-if="versionName" :class="$style.mainLine">{{ versionName }}</span>
				<time v-if="publishedAt" :datetime="item.updatedAt" :class="$style.metaItem">
					{{ i18n.baseText('workflowHistory.item.publishedAtLabel') }} {{ publishedAt }}
				</time>
				<time :datetime="item.createdAt" :class="$style.metaItem">
					{{ i18n.baseText('workflowHistory.item.createdAtLabel') }} {{ formattedCreatedAt }}
				</time>
				<N8nTooltip placement="right-end" :disabled="authors.size < 2 && !isAuthorElementTruncated">
					<template #content>{{ props.item.authors }}</template>
					<span ref="authorElement" :class="$style.metaItem">{{ authors.label }}</span>
				</N8nTooltip>
			</p>
		</slot>
		<div :class="$style.tail">
			<N8nBadge
				v-if="props.isVersionActive"
				size="medium"
				:class="$style.publishedBadge"
				:show-border="false"
			>
				{{ i18n.baseText('workflowHistory.item.active') }}
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

		.mainLine {
			padding: 0 0 var(--spacing--5xs);
			color: var(--color--text--shade-1);
			font-size: var(--font-size--sm);
			font-weight: var(--font-weight--bold);
		}

		.metaItem {
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

	&.selected {
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

.publishedBadge {
	background-color: var(--color--success);
	color: var(--color--foreground--tint-2);

	:global(.n8n-text) {
		font-size: var(--font-size--2xs);
		line-height: var(--line-height--sm);
	}
}
</style>
