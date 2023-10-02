<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import dateformat from 'dateformat';
import type { UserAction } from 'n8n-design-system';
import type {
	WorkflowHistory,
	WorkflowVersionId,
	WorkflowHistoryActionTypes,
} from '@/types/workflowHistory';
import { useI18n } from '@/composables';

const props = defineProps<{
	item: WorkflowHistory;
	index: number;
	actions: UserAction[];
	isActive: boolean;
}>();
const emit = defineEmits<{
	(
		event: 'action',
		value: { action: WorkflowHistoryActionTypes[number]; id: WorkflowVersionId },
	): void;
	(event: 'preview', value: { event: MouseEvent; id: WorkflowVersionId }): void;
	(event: 'mounted', value: { index: number; offsetTop: number; isActive: boolean }): void;
}>();

const i18n = useI18n();

const actionsVisible = ref(false);
const itemElement = ref<HTMLElement | null>(null);

const formattedCreatedAtDate = computed<string>(() => {
	const currentYear = new Date().getFullYear().toString();
	const [date, time] = dateformat(
		props.item.createdAt,
		`${props.item.createdAt.startsWith(currentYear) ? '' : 'yyyy '} mmm d"#"HH:MM`,
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

const onAction = (action: WorkflowHistoryActionTypes[number]) => {
	emit('action', { action, id: props.item.versionId });
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
		<p @click="onItemClick">
			<time :datetime="item.createdAt">{{ formattedCreatedAtDate }}</time>
			<n8n-tooltip placement="right-end" :disabled="authors.size < 2">
				<template #content>{{ props.item.authors }}</template>
				<span>{{ authors.label }}</span>
			</n8n-tooltip>
			<data :value="item.versionId">{{ idLabel }}</data>
		</p>
		<div :class="$style.tail">
			<n8n-badge v-if="props.index === 0">
				{{ i18n.baseText('workflowHistory.item.latest') }}
			</n8n-badge>
			<n8n-action-toggle
				theme="dark"
				:class="$style.actions"
				:actions="props.actions"
				@action="onAction"
				@click.stop
				@visible-change="onVisibleChange"
			/>
		</div>
	</li>
</template>
<style module lang="scss">
.item {
	display: flex;
	position: relative;
	align-items: center;
	justify-content: space-between;
	border-left: 2px var(--border-style-base) transparent;
	border-bottom: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);
	color: var(--color-text-base);
	font-size: var(--font-size-2xs);

	p {
		display: grid;
		padding: var(--spacing-s);
		line-height: unset;
		cursor: pointer;

		time {
			padding: 0 0 var(--spacing-2xs);
			color: var(--color-text-dark);
			font-size: var(--font-size-s);
			font-weight: var(--font-weight-bold);
		}

		span {
			justify-self: start;
		}

		data {
			max-width: 160px;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
			padding-top: var(--spacing-4xs);
			font-size: var(--font-size-2xs);
		}
	}

	.tail {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	&.active {
		background-color: var(--color-background-base);
		border-left-color: var(--color-primary);

		p {
			cursor: default;
		}
	}

	&:hover,
	&.actionsVisible {
		border-left-color: var(--color-foreground-xdark);
	}
}

.actions {
	display: block;
	padding: var(--spacing-3xs);
}
</style>
