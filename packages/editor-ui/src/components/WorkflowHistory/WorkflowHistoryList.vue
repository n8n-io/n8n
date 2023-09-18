<script setup lang="ts">
import { computed } from 'vue';
import type { UserAction } from 'n8n-design-system';
import { useI18n } from '@/composables';
import type { WorkflowHistory, WorkflowHistoryActionTypes } from '@/types/workflowHistory';
import WorkflowHistoryListItem from '@/components/WorkflowHistory/WorkflowHistoryListItem.vue';
import type { TupleToUnion } from '@/utils/typeHelpers';

const workflowHistoryActionTypes: WorkflowHistoryActionTypes = [
	'restore',
	'clone',
	'open',
	'download',
];
const workflowHistoryActionsRecord = workflowHistoryActionTypes.map((value) => ({
	[value.toUpperCase()]: value,
}));

const props = withDefaults(
	defineProps<{
		items: WorkflowHistory[];
	}>(),
	{
		items: () => [],
	},
);

const i18n = useI18n();

const workflowHistoryItemActions = computed<UserAction[]>(() =>
	workflowHistoryActionTypes.map((value) => ({
		label: i18n.baseText(`workflowHistory.item.actions.${value}`),
		disabled: false,
		value,
	})),
);

const onAction = ({
	action,
	id,
}: {
	action: TupleToUnion<WorkflowHistoryActionTypes>;
	id: WorkflowHistory['id'];
}) => {
	console.log({ action, id });
};
</script>

<template>
	<ul :class="$style.list">
		<workflow-history-list-item
			v-for="item in props.items"
			:key="item.id"
			:item="item"
			:actions="workflowHistoryItemActions"
			@action="onAction"
		/>
	</ul>
</template>

<style module lang="scss">
.list {
	height: 100%;
	overflow: auto;
}
</style>
