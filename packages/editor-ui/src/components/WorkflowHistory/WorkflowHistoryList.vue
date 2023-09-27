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
const shouldAutoScroll = ref(true);
const observer = ref<IntersectionObserver | null>(null);

const actions = computed<UserAction[]>(() =>
	props.actionTypes.map((value) => ({
		label: i18n.baseText(`workflowHistory.item.actions.${value}`),
		disabled: false,
		value,
	})),
);

const observeElement = (element: Element) => {
	observer.value = new IntersectionObserver(
		([entry]) => {
			if (entry.isIntersecting) {
				shouldAutoScroll.value = false;
				observer.value?.unobserve(element);
				observer.value?.disconnect();
				observer.value = null;
				emit('loadMore', { take: props.takeItemsAtOnce });
			}
		},
		{
			root: listElement.value,
			threshold: 0.01,
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
	shouldAutoScroll.value = false;
	emit('action', { action, id });
};

const onPreview = ({ event, id }: { event: Event; id: WorkflowHistory['versionId'] }) => {
	shouldAutoScroll.value = false;
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
	if (active && shouldAutoScroll.value) {
		shouldAutoScroll.value = false;
		listElement.value?.scrollTo({ top: offsetTop, behavior: 'smooth' });
	}

	if (index === props.items.length - 1) {
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
		<li v-if="!props.items.length" :class="$style.empty">
			{{ i18n.baseText('workflowHistory.empty') }}
			<br />
			{{ i18n.baseText('workflowHistory.hint') }}
		</li>
	</ul>
</template>

<style module lang="scss">
.list {
	height: 100%;
	overflow: auto;
	position: relative;

	&::before {
		content: '';
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		width: var(--border-width-base);
		background-color: var(--color-foreground-base);
	}
}

.empty {
	display: flex;
	position: absolute;
	height: 100%;
	padding: 0 25%;
	justify-content: center;
	align-items: center;
	text-align: center;
	color: var(--color-text-base);
	font-size: var(--font-size-s);
	line-height: var(--font-line-height-loose);
}
</style>
