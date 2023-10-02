<script setup lang="ts">
import { computed, ref } from 'vue';
import type { UserAction } from 'n8n-design-system';
import { useI18n } from '@/composables';
import type {
	WorkflowHistory,
	WorkflowVersionId,
	WorkflowHistoryActionTypes,
	WorkflowHistoryRequestParams,
} from '@/types/workflowHistory';
import WorkflowHistoryListItem from '@/components/WorkflowHistory/WorkflowHistoryListItem.vue';

const props = withDefaults(
	defineProps<{
		items: WorkflowHistory[];
		activeItem: WorkflowHistory | null;
		actionTypes: WorkflowHistoryActionTypes;
		requestNumberOfItems: number;
		shouldUpgrade: boolean;
		maxRetentionPeriod: number;
	}>(),
	{
		items: () => [],
		shouldUpgrade: false,
		maxRetentionPeriod: 0,
	},
);
const emit = defineEmits<{
	(
		event: 'action',
		value: { action: WorkflowHistoryActionTypes[number]; id: WorkflowVersionId },
	): void;
	(event: 'preview', value: { event: MouseEvent; id: WorkflowVersionId }): void;
	(event: 'loadMore', value: WorkflowHistoryRequestParams): void;
	(event: 'upgrade'): void;
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
				observer.value?.unobserve(element);
				observer.value?.disconnect();
				observer.value = null;
				emit('loadMore', { take: props.requestNumberOfItems, skip: props.items.length });
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
	action: WorkflowHistoryActionTypes[number];
	id: WorkflowVersionId;
}) => {
	shouldAutoScroll.value = false;
	emit('action', { action, id });
};

const onPreview = ({ event, id }: { event: MouseEvent; id: WorkflowVersionId }) => {
	shouldAutoScroll.value = false;
	emit('preview', { event, id });
};

const onItemMounted = ({
	index,
	offsetTop,
	isActive,
}: {
	index: number;
	offsetTop: number;
	isActive: boolean;
}) => {
	if (isActive && shouldAutoScroll.value) {
		shouldAutoScroll.value = false;
		listElement.value?.scrollTo({ top: offsetTop, behavior: 'smooth' });
	}

	if (index === props.items.length - 1 && props.items.length >= props.requestNumberOfItems) {
		observeElement(listElement.value?.children[index] as Element);
	}
};
</script>

<template>
	<ul :class="$style.list" ref="listElement" data-test-id="workflow-history-list">
		<workflow-history-list-item
			v-for="(item, index) in props.items"
			:key="item.versionId"
			:index="index"
			:item="item"
			:is-active="item.versionId === props.activeItem?.versionId"
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
		<li v-if="props.shouldUpgrade && props.maxRetentionPeriod > 0" :class="$style.retention">
			<span>
				{{
					i18n.baseText('workflowHistory.limit', {
						interpolate: { maxRetentionPeriod: props.maxRetentionPeriod },
					})
				}}
			</span>
			<i18n-t keypath="workflowHistory.upgrade" tag="span">
				<template #link>
					<a href="#" @click="emit('upgrade')">
						{{ i18n.baseText('workflowHistory.upgrade.link') }}
					</a>
				</template>
			</i18n-t>
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

.retention {
	display: grid;
	padding: var(--spacing-s);
	font-size: var(--font-size-2xs);
	line-height: var(--font-line-height-loose);
	text-align: center;
}
</style>
