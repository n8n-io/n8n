<script setup lang="ts">
import { ref } from 'vue';
import type { UserAction } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type {
	WorkflowHistory,
	WorkflowVersionId,
	WorkflowHistoryActionTypes,
	WorkflowHistoryRequestParams,
} from '@n8n/rest-api-client/api/workflowHistory';
import WorkflowHistoryListItem from './WorkflowHistoryListItem.vue';
import type { IUser } from 'n8n-workflow';
import { I18nT } from 'vue-i18n';

import { N8nLoading } from '@n8n/design-system';
const props = defineProps<{
	items: WorkflowHistory[];
	activeItem: WorkflowHistory | null;
	actions: Array<UserAction<IUser>>;
	requestNumberOfItems: number;
	lastReceivedItemsLength: number;
	evaluatedPruneTime: number;
	shouldUpgrade?: boolean;
	isListLoading?: boolean;
}>();

const emit = defineEmits<{
	action: [
		value: {
			action: WorkflowHistoryActionTypes[number];
			id: WorkflowVersionId;
			data: { formattedCreatedAt: string };
		},
	];
	preview: [value: { event: MouseEvent; id: WorkflowVersionId }];
	loadMore: [value: WorkflowHistoryRequestParams];
	upgrade: [];
}>();

const i18n = useI18n();

const listElement = ref<Element | null>(null);
const shouldAutoScroll = ref(true);
const observer = ref<IntersectionObserver | null>(null);

const getActions = (index: number) =>
	index === 0 ? props.actions.filter((action) => action.value !== 'restore') : props.actions;

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
	data,
}: {
	action: WorkflowHistoryActionTypes[number];
	id: WorkflowVersionId;
	data: { formattedCreatedAt: string };
}) => {
	shouldAutoScroll.value = false;
	emit('action', { action, id, data });
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

	if (
		index === props.items.length - 1 &&
		props.lastReceivedItemsLength === props.requestNumberOfItems
	) {
		observeElement(listElement.value?.children[index] as Element);
	}
};
</script>

<template>
	<ul ref="listElement" :class="$style.list" data-test-id="workflow-history-list">
		<WorkflowHistoryListItem
			v-for="(item, index) in props.items"
			:key="item.versionId"
			:index="index"
			:item="item"
			:is-active="item.versionId === props.activeItem?.versionId"
			:actions="getActions(index)"
			@action="onAction"
			@preview="onPreview"
			@mounted="onItemMounted"
		/>
		<li v-if="!props.items.length && !props.isListLoading" :class="$style.empty">
			{{ i18n.baseText('workflowHistory.empty') }}
			<br />
			{{ i18n.baseText('workflowHistory.hint') }}
		</li>
		<li
			v-if="props.isListLoading"
			:class="$style.loader"
			role="status"
			aria-live="polite"
			aria-busy="true"
			:aria-label="i18n.baseText('generic.loading')"
		>
			<N8nLoading :rows="3" class="mb-xs" />
			<N8nLoading :rows="3" class="mb-xs" />
			<N8nLoading :rows="3" class="mb-xs" />
		</li>
		<li v-if="props.shouldUpgrade" :class="$style.retention">
			<span>
				{{
					i18n.baseText('workflowHistory.limit', {
						interpolate: { evaluatedPruneTime: String(props.evaluatedPruneTime) },
					})
				}}
			</span>
			<I18nT keypath="workflowHistory.upgrade" tag="span" scope="global">
				<template #link>
					<a href="#" @click="emit('upgrade')">
						{{ i18n.baseText('workflowHistory.upgrade.link') }}
					</a>
				</template>
			</I18nT>
		</li>
	</ul>
</template>

<style module lang="scss">
.list {
	position: absolute;
	left: 0;
	top: 0;
	width: 100%;
	height: 100%;
	overflow: auto;
}

.empty {
	display: flex;
	position: absolute;
	height: 100%;
	padding: 0 25%;
	justify-content: center;
	align-items: center;
	text-align: center;
	color: var(--color--text);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--lg);
}

.loader {
	padding: 0 var(--spacing--sm);
}

.retention {
	display: grid;
	padding: var(--spacing--sm);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--lg);
	text-align: center;
}
</style>
