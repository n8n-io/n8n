<script setup lang="ts">
import { computed, ref } from 'vue';
import dateformat from 'dateformat';
import type { UserAction } from 'n8n-design-system';
import type { WorkflowHistory, WorkflowHistoryActionTypes } from '@/types/workflowHistory';
import type { TupleToUnion } from '@/utils/typeHelpers';
import { useI18n } from '@/composables';

const props = defineProps<{
	item: WorkflowHistory;
	actions: UserAction[];
	active: boolean;
}>();
const emit = defineEmits<{
	(
		event: 'action',
		value: { action: TupleToUnion<WorkflowHistoryActionTypes>; id: WorkflowHistory['versionId'] },
	): void;
	(event: 'preview', value: { event: Event; id: WorkflowHistory['versionId'] }): void;
}>();

const i18n = useI18n();

const actionsVisible = ref(false);

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
	i18n.baseText('workflowHistory.item.id', { interpolate: { id: props.item.versionId } }),
);

const onAction = (action: TupleToUnion<WorkflowHistoryActionTypes>) => {
	emit('action', { action, id: props.item.versionId });
};

const onVisibleChange = (visible: boolean) => {
	actionsVisible.value = visible;
};

const onItemClick = (event: Event) => {
	emit('preview', { event, id: props.item.versionId });
};
</script>
<template>
	<li
		:class="{
			[$style.item]: true,
			[$style.active]: props.active,
			[$style.actionsVisible]: actionsVisible,
		}"
	>
		<p @click="onItemClick">
			<strong>{{ formattedCreatedAtDate }}</strong>
			<n8n-tooltip placement="right-end" :disabled="authors.size < 2">
				<template #content>{{ props.item.authors }}</template>
				<span>{{ authors.label }}</span>
			</n8n-tooltip>
			<small>{{ idLabel }}</small>
		</p>
		<div :class="$style.tail">
			<n8n-badge :class="$style.badge">
				{{ i18n.baseText('workflowHistory.item.latest') }}
			</n8n-badge>
			<n8n-action-toggle
				theme="dark"
				:class="$style.actions"
				:actions="props.actions"
				@action="onAction"
				@click.stop
				@visible-change="onVisibleChange"
				data-test-id="workflow-history-list-item-actions"
			/>
		</div>
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

	.tail {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.badge {
		display: none;
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

	&:first-child {
		.badge {
			display: inline;
		}
	}
}

.actions {
	display: block;
	padding: var(--spacing-3xs);
}
</style>
