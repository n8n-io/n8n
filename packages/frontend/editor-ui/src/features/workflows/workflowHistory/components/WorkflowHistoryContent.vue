<script setup lang="ts">
import { computed } from 'vue';
import type { IWorkflowDb, UserAction } from '@/Interface';
import type {
	WorkflowVersion,
	WorkflowHistoryActionTypes,
	WorkflowVersionId,
} from '@n8n/rest-api-client/api/workflowHistory';
import WorkflowPreview from '@/app/components/WorkflowPreview.vue';
import WorkflowHistoryListItem from './WorkflowHistoryListItem.vue';
import { useI18n } from '@n8n/i18n';
import type { IUser } from 'n8n-workflow';

import { N8nButton, N8nIcon } from '@n8n/design-system';
const i18n = useI18n();

const props = defineProps<{
	workflow: IWorkflowDb | null;
	workflowVersion: WorkflowVersion | null;
	actions: Array<UserAction<IUser>>;
	isVersionActive?: boolean;
	isListLoading?: boolean;
	isFirstItemShown?: boolean;
}>();

const emit = defineEmits<{
	action: [
		value: {
			action: WorkflowHistoryActionTypes[number];
			id: WorkflowVersionId;
			data: { formattedCreatedAt: string };
		},
	];
}>();

const workflowVersionPreview = computed<IWorkflowDb | undefined>(() => {
	if (!props.workflowVersion || !props.workflow) {
		return;
	}
	const { pinData, ...workflow } = props.workflow;
	return {
		...workflow,
		nodes: props.workflowVersion.nodes,
		connections: props.workflowVersion.connections,
	};
});

const versionName = computed(() => {
	// TODO: this should be returned as part of the history item payload
	return props.isVersionActive ? 'Version X' : null;
});

const formattedPublishedAt = computed<string | null>(() => {
	if (!props.isVersionActive || !props.workflowVersion) {
		return null;
	}

	return 'Published at X';
});

const actions = computed(() => {
	let filteredActions = props.actions;
	if (props.isFirstItemShown) {
		filteredActions = filteredActions.filter((action) => action.value !== 'restore');
	}

	if (props.isVersionActive) {
		filteredActions = filteredActions.filter((action) => action.value !== 'publish');
	}

	return filteredActions;
});

const onAction = ({
	action,
	id,
	data,
}: {
	action: WorkflowHistoryActionTypes[number];
	id: WorkflowVersionId;
	data: { formattedCreatedAt: string };
}) => {
	emit('action', { action, id, data });
};
</script>

<template>
	<div :class="$style.content">
		<WorkflowPreview
			v-if="props.workflowVersion"
			:workflow="workflowVersionPreview"
			:loading="props.isListLoading"
			loader-type="spinner"
		/>
		<ul :class="$style.info">
			<WorkflowHistoryListItem
				v-if="props.workflowVersion"
				:class="$style.card"
				:index="-1"
				:item="props.workflowVersion"
				:is-selected="false"
				:actions="actions"
				@action="onAction"
			>
				<template #default="{ formattedCreatedAt }">
					<section :class="$style.text">
						<p v-if="versionName" :class="$style.mainLine">
							{{ versionName }}
						</p>
						<p v-if="formattedPublishedAt" :class="$style.metaItem">
							<span :class="$style.label">
								{{ i18n.baseText('workflowHistory.item.publishedAtLabel') }}
							</span>
							<time :datetime="props.workflowVersion.updatedAt">{{ formattedPublishedAt }}</time>
						</p>
						<p :class="$style.metaItem">
							<span :class="$style.label">
								{{ i18n.baseText('workflowHistory.item.createdAtLabel') }}
							</span>
							<time :datetime="props.workflowVersion.createdAt">{{ formattedCreatedAt }}</time>
						</p>
						<p :class="$style.metaItem">
							<span :class="$style.label">
								{{ i18n.baseText('workflowHistory.content.editedBy') }}:
							</span>
							<span>{{ props.workflowVersion.authors }}</span>
						</p>
						<p :class="$style.metaItem">
							<span :class="$style.label">
								{{ i18n.baseText('workflowHistory.content.versionId') }}:
							</span>
							<data :value="props.workflowVersion.versionId">{{
								props.workflowVersion.versionId
							}}</data>
						</p>
					</section>
				</template>
				<template #action-toggle-button>
					<N8nButton type="tertiary" size="large" data-test-id="action-toggle-button">
						{{ i18n.baseText('workflowHistory.content.actions') }}
						<N8nIcon class="ml-3xs" icon="chevron-down" size="small" />
					</N8nButton>
				</template>
			</WorkflowHistoryListItem>
		</ul>
	</div>
</template>

<style module lang="scss">
.content {
	position: absolute;
	display: block;
	left: 0;
	top: 0;
	width: 100%;
	height: 100%;
	overflow: auto;
}

.info {
	position: absolute;
	z-index: 1;
	top: 0;
	left: 0;
	width: 100%;
}

.card {
	padding: var(--spacing--sm) var(--spacing--lg) 0 var(--spacing--xl);
	border: 0;
	align-items: start;

	.text {
		display: flex;
		flex-direction: column;
		flex: 1 1 auto;

		p {
			display: flex;
			align-items: center;
			padding: 0;
			margin: 0;
			cursor: default;
			gap: var(--spacing--5xs);
		}

		.mainLine {
			font-size: var(--font-size--md);
			font-weight: var(--font-weight--bold);
			color: var(--color--text--shade-1);
		}

		.metaItem {
			font-size: var(--font-size--sm);
			color: var(--color--text);
		}

		.label {
			color: var(--color--text--tint-1);
			padding-right: var(--spacing--4xs);
		}

		time,
		span,
		data {
			max-width: unset;
			justify-self: unset;
			white-space: unset;
			overflow: visible;
			text-overflow: unset;
			padding: 0;
			font-size: var(--font-size--sm);
		}
	}
}
</style>
