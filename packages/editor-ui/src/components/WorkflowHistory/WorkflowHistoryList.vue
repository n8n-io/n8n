<script setup lang="ts">
import { computed } from 'vue';
import type { UserAction } from 'n8n-design-system';
import { useI18n } from '@/composables';
import type {
	WorkflowHistory,
	WorkflowHistoryActionTypes,
	WorkflowHistoryUnsaved,
} from '@/types/workflowHistory';
import WorkflowHistoryListItem from '@/components/WorkflowHistory/WorkflowHistoryListItem.vue';
import type { TupleToUnion } from '@/utils/typeHelpers';

const props = withDefaults(
	defineProps<{
		items: Array<WorkflowHistory | WorkflowHistoryUnsaved>;
		activeItemId: WorkflowHistory['id'];
		actionTypes: WorkflowHistoryActionTypes;
	}>(),
	{
		items: () => [],
	},
);
const emit = defineEmits<{
	(
		event: 'action',
		value: { action: TupleToUnion<WorkflowHistoryActionTypes>; id: WorkflowHistory['id'] },
	): void;
	(event: 'preview', value: { event: Event; id: WorkflowHistory['id'] }): void;
}>();

const i18n = useI18n();

const actions = computed<UserAction[]>(() =>
	props.actionTypes.map((value) => ({
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
	emit('action', { action, id });
};

const onPreview = ({ event, id }: { event: Event; id: WorkflowHistory['id'] }) => {
	emit('preview', { event, id });
};
</script>

<template>
	<ul :class="$style.list">
		<workflow-history-list-item
			v-for="(item, index) in props.items"
			:key="item.id"
			:index="index"
			:item="item"
			:active="item.id === props.activeItemId"
			:actions="actions"
			@action="onAction"
			@preview="onPreview"
		/>
	</ul>
</template>

<style module lang="scss">
.list {
	height: 100%;
	overflow: auto;
}
</style>
