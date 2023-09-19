<script setup lang="ts">
import { computed, ref } from 'vue';
import dateformat from 'dateformat';
import type { UserAction } from 'n8n-design-system';
import type {
	WorkflowHistory,
	WorkflowHistoryActionTypes,
	WorkflowHistoryUnsaved,
} from '@/types/workflowHistory';
import type { TupleToUnion } from '@/utils/typeHelpers';
import { useI18n } from '@/composables';
import { isWorkflowHistoryItemUnsaved } from '@/utils';

const props = defineProps<{
	item: WorkflowHistory | WorkflowHistoryUnsaved;
	actions: UserAction[];
	active: boolean;
}>();
const emit = defineEmits<{
	(
		event: 'action',
		value: { action: TupleToUnion<WorkflowHistoryActionTypes>; id: WorkflowHistory['id'] },
	): void;
	(event: 'preview', value: { id: WorkflowHistory['id'] }): void;
}>();

const i18n = useI18n();

const actionsVisible = ref(false);

const isUnsaved = computed<boolean>(() => isWorkflowHistoryItemUnsaved(props.item));
const isCurrent = computed<boolean>(() => isUnsaved.value);

const formattedCreatedAtDate = computed<string>(() => {
	const currentYear = new Date().getFullYear().toString();
	const [date, time] = dateformat(
		props.item.createdAt,
		`${props.item.createdAt.startsWith(currentYear) ? '' : 'yyyy '} mmm d"#"HH:MM`,
	).split('#');

	return i18n.baseText('workflowHistory.item.createdAt', { interpolate: { date, time } });
});

const authors = computed<{ label: string; tooltip: string }>(() => {
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
	i18n.baseText('workflowHistory.item.id', { interpolate: { id: props.item.id } }),
);

const onAction = (action: TupleToUnion<WorkflowHistoryActionTypes>) => {
	emit('action', { action, id: props.item.id });
};

const onVisibleChange = (visible: boolean) => {
	actionsVisible.value = visible;
};

const onItemClick = () => {
	if (!isCurrent.value && !props.active) {
		emit('preview', { id: props.item.id });
	}
};
</script>
<template>
	<li
		:class="{
			[$style.item]: true,
			[$style.active]: props.active,
			[$style.actionsVisible]: actionsVisible,
			[$style.current]: isCurrent,
		}"
	>
		<p v-if="isUnsaved">
			<strong>{{ props.item.title }}</strong>
			<span>{{ props.item.authors }}</span>
		</p>
		<p v-else @click="onItemClick">
			<strong>{{ formattedCreatedAtDate }}</strong>
			<n8n-tooltip placement="right-end" :disabled="authors.size < 2">
				<template #content>{{ props.item.authors }}</template>
				<span>{{ authors.label }}</span>
			</n8n-tooltip>
			<small>{{ idLabel }}</small>
		</p>
		<n8n-badge v-if="isCurrent" class="mr-s">
			{{ i18n.baseText('workflowHistory.item.current') }}
		</n8n-badge>
		<n8n-action-toggle
			v-else
			theme="dark"
			:class="$style.actions"
			:actions="props.actions"
			@action="onAction"
			@click.stop
			@visible-change="onVisibleChange"
			data-test-id="workflow-history-list-item-actions"
		/>
	</li>
</template>
<style module lang="scss">
.item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	border-left: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);
	border-bottom: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);
	color: var(--color-text-base);
	font-size: var(--font-size-2xs);

	p {
		padding: var(--spacing-s);
		flex: 1 1 auto;
		line-height: unset;
		cursor: pointer;
	}

	strong,
	small {
		display: block;
	}

	small {
		padding: var(--spacing-4xs) 0 0;
		font-size: var(--font-size-2xs);
	}

	strong {
		padding: 0 0 var(--spacing-2xs);
		color: var(--color-text-dark);
		font-size: var(--font-size-s);
		font-weight: var(--font-weight-bold);
	}

	&.active {
		background-color: var(--color-background-base);
		border-left: 2px var(--border-style-base) var(--color-primary);

		p {
			padding-left: calc(var(--spacing-s) - 1px);
			cursor: default;
		}
	}

	&:hover,
	&.actionsVisible {
		border-left: 2px var(--border-style-base) var(--color-foreground-xdark);

		p {
			padding-left: calc(var(--spacing-s) - 1px);
		}
	}

	&.current {
		p {
			cursor: default;
		}
	}
}

.actions {
	display: block;
	padding: var(--spacing-3xs);
}
</style>
