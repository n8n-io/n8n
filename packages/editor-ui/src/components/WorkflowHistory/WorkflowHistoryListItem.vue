<script setup lang="ts">
import { computed } from 'vue';
import dateformat from 'dateformat';
import type { UserAction } from 'n8n-design-system';
import type { WorkflowHistory, WorkflowHistoryActionTypes } from '@/types/workflowHistory';
import type { TupleToUnion } from '@/utils/typeHelpers';
import { useI18n } from '@/composables';

const props = defineProps<{ item: WorkflowHistory; actions: UserAction[] }>();
const emit = defineEmits<{
	(
		event: 'action',
		value: { action: TupleToUnion<WorkflowHistoryActionTypes>; id: WorkflowHistory['id'] },
	): void;
}>();

const i18n = useI18n();

const onAction = (action: TupleToUnion<WorkflowHistoryActionTypes>) => {
	emit('action', { action, id: props.item.id });
};

const formattedCreatedAtDate = computed<string>(() => {
	const currentYear = new Date().getFullYear().toString();
	const [date, time] = dateformat(
		props.item.createdAt,
		`${props.item.createdAt.startsWith(currentYear) ? '' : 'yyyy '} mmm d"#"HH:MM`,
	).split('#');

	return i18n.baseText('workflowHistory.item.createdAt', { interpolate: { date, time } });
});

const editors = computed<{ label: string; tooltip: string }>(() => {
	let label = props.item.editors[0];

	if (props.item.editors.length > 1) {
		label = `${label} + ${props.item.editors.length - 1}`;
	}

	return {
		label,
		tooltip: props.item.editors.join(', '),
	};
});

const idLabel = computed<string>(() =>
	i18n.baseText('workflowHistory.item.id', { interpolate: { id: props.item.id } }),
);
</script>
<template>
	<li :class="$style.item">
		<strong>{{ formattedCreatedAtDate }}</strong>
		<n8n-tooltip placement="left" :disabled="props.item.editors.length < 2">
			<template #content>{{ editors.tooltip }}</template>
			<span>{{ editors.label }}</span>
		</n8n-tooltip>
		<small>{{ idLabel }}</small>
		<n8n-action-toggle
			:class="$style.actions"
			:actions="props.actions"
			@action="onAction"
			@click.stop
			data-test-id="workflow-history-list-item-actions"
		/>
	</li>
</template>
<style module lang="scss">
.item {
	display: block;
	position: relative;
	padding: var(--spacing-s);
	border-left: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);
	border-bottom: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);

	strong,
	small {
		display: block;
	}
}

.actions {
	position: absolute;
	right: var(--spacing-2xs);
	top: 50%;
	transform: translateY(-50%);
}
</style>
