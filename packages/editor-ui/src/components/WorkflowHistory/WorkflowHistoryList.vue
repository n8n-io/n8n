<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue';
import { computed, ref, watch } from 'vue';
import type { UserAction } from 'n8n-design-system';
import { useI18n } from '@/composables';
import type { WorkflowHistory, WorkflowHistoryActionTypes } from '@/types/workflowHistory';
import WorkflowHistoryListItem from '@/components/WorkflowHistory/WorkflowHistoryListItem.vue';
import type { TupleToUnion } from '@/utils/typeHelpers';

const props = withDefaults(
	defineProps<{
		items: WorkflowHistory[];
		activeItem: WorkflowHistory | null;
		actionTypes: WorkflowHistoryActionTypes;
	}>(),
	{
		items: () => [],
	},
);
const emit = defineEmits<{
	(
		event: 'action',
		value: { action: TupleToUnion<WorkflowHistoryActionTypes>; id: WorkflowHistory['versionId'] },
	): void;
	(event: 'preview', value: { event: Event; id: WorkflowHistory['versionId'] }): void;
	(event: 'loadMore', value: { take: number }): void;
}>();

const i18n = useI18n();

let stopFillingUpListToScroll: (() => void) | null = null;
let stopSearchingForActiveItem: (() => void) | null = null;
const MAX_ITEMS_UNTIL_ACTIVE_FOUND = 1000;

const listElement = ref<Element | null>(null);
const listItemElements = ref<{ [key: string]: Element | ComponentPublicInstance | null }>({});
const activeListItemElement = computed<Element | ComponentPublicInstance | null>(
	() => listItemElements.value[props.activeItem?.versionId ?? ''] ?? null,
);

const assignListItemElement = (key: string, el: Element | ComponentPublicInstance | null) => {
	listItemElements.value[key] = el;
};

const actions = computed<UserAction[]>(() =>
	props.actionTypes.map((value) => ({
		label: i18n.baseText(`workflowHistory.item.actions.${value}`),
		disabled: false,
		value,
	})),
);

const ensureListScrollability = () => {
	if (listElement.value) {
		const { scrollHeight, clientHeight } = listElement.value;
		const scrollable = scrollHeight > clientHeight;
		const firstListItemElement = Object.values(listItemElements.value)[0];
		const firstListItemElementHeight: number = firstListItemElement?.$el?.clientHeight ?? 1;

		const listCapacity = Math.ceil(clientHeight / firstListItemElementHeight);

		if (!scrollable) {
			stopFillingUpListToScroll?.();
			emit('loadMore', { take: listCapacity - props.items.length + 1 });
		}
	}
};

const findActiveListItemIfNotInTheInitialList = () => {
	if (props.items.length >= MAX_ITEMS_UNTIL_ACTIVE_FOUND) {
		stopSearchingForActiveItem?.();
	}

	if (!activeListItemElement?.value?.$el && props.items.length < MAX_ITEMS_UNTIL_ACTIVE_FOUND) {
		emit('loadMore', { take: 50 });
	}
};

const onAction = ({
	action,
	id,
}: {
	action: TupleToUnion<WorkflowHistoryActionTypes>;
	id: WorkflowHistory['versionId'];
}) => {
	emit('action', { action, id });
};

const onPreview = ({ event, id }: { event: Event; id: WorkflowHistory['versionId'] }) => {
	emit('preview', { event, id });
};

const onAutoScroll = ({ offsetTop }: { offsetTop: number }) => {
	if (listElement.value) {
		listElement.value.scrollTo({ top: offsetTop, behavior: 'smooth' });
	}
};

stopFillingUpListToScroll = watch(listItemElements.value, ensureListScrollability);
stopSearchingForActiveItem = watch(listItemElements.value, findActiveListItemIfNotInTheInitialList);
</script>

<template>
	<ul :class="$style.list" ref="listElement">
		<workflow-history-list-item
			v-for="(item, index) in props.items"
			:ref="(el) => assignListItemElement(item.versionId, el)"
			:key="item.versionId"
			:index="index"
			:item="item"
			:active="item.versionId === props.activeItem?.versionId"
			:actions="actions"
			@action="onAction"
			@preview="onPreview"
			@autoScroll="onAutoScroll"
		/>
	</ul>
</template>

<style module lang="scss">
.list {
	height: 100%;
	overflow: auto;
	position: relative;
}
</style>
