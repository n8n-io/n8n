<script setup lang="ts">
import { computed, ref } from 'vue';
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
		watchNthItemFromEnd: number;
		takeItemsAtOnce: number;
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

const listElement = ref<Element | null>(null);
const listScrollabilityEnsured = ref(false);
const isAutoScrolled = ref(false);
const observer = ref<IntersectionObserver | null>(null);

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
		const firstListItemElementHeight = listElement.value.children[0].clientHeight ?? 1;

		const listCapacity = Math.ceil(clientHeight / firstListItemElementHeight);

		if (!scrollable) {
			emit('loadMore', { take: listCapacity - props.items.length + 1 });
		}
	}
};

const observeElement = (element: Element) => {
	observer.value = new IntersectionObserver(
		([entry]) => {
			if (entry.isIntersecting && entry.intersectionRatio === 1) {
				observer.value?.unobserve(element);
				observer.value?.disconnect();
				observer.value = null;
				emit('loadMore', { take: props.takeItemsAtOnce });
			}
		},
		{
			root: listElement.value,
			threshold: 1,
		},
	);

	observer.value.observe(element);
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

const onItemMounted = ({
	index,
	offsetTop,
	active,
}: {
	index: number;
	offsetTop: number;
	active: boolean;
}) => {
	if (index === props.items.length - 1 && !listScrollabilityEnsured.value) {
		listScrollabilityEnsured.value = true;
		ensureListScrollability();
	}

	if (active && !isAutoScrolled.value) {
		isAutoScrolled.value = true;
		listElement.value?.scrollTo({ top: offsetTop, behavior: 'smooth' });
	}

	if (index === props.items.length - props.watchNthItemFromEnd) {
		observeElement(listElement.value?.children[index] as Element);
	}
};
</script>

<template>
	<ul :class="$style.list" ref="listElement">
		<workflow-history-list-item
			v-for="(item, index) in props.items"
			:key="item.versionId"
			:index="index"
			:item="item"
			:active="item.versionId === props.activeItem?.versionId"
			:actions="actions"
			@action="onAction"
			@preview="onPreview"
			@mounted="onItemMounted"
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
