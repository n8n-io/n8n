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

import { N8nButton, N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
import { useEnvFeatureFlag } from '@/features/shared/envFeatureFlag/useEnvFeatureFlag';
import { WORKFLOWS_DRAFT_PUBLISH_ENABLED_FLAG } from '@/app/constants';
import { formatTimestamp } from '@/features/workflows/workflowHistory/utils';

const i18n = useI18n();
const envFeatureFlag = useEnvFeatureFlag();

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
			data: { formattedCreatedAt: string; versionName?: string; description?: string };
		},
	];
}>();

const isDraftPublishEnabled = computed(() =>
	envFeatureFlag.check.value(WORKFLOWS_DRAFT_PUBLISH_ENABLED_FLAG),
);

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

const formattedCreatedAt = computed<string>(() => {
	if (!props.workflowVersion) {
		return '';
	}
	const { date, time } = formatTimestamp(props.workflowVersion.createdAt);
	return i18n.baseText('workflowHistory.item.createdAt', { interpolate: { date, time } });
});

const versionNameDisplay = computed(() => {
	return props.workflowVersion?.name ?? formattedCreatedAt.value;
});

const actions = computed(() => {
	let filteredActions = props.actions;

	if (props.isFirstItemShown) {
		filteredActions = filteredActions.filter((action) => action.value !== 'restore');
	}

	if (isDraftPublishEnabled.value) {
		if (props.isVersionActive) {
			filteredActions = filteredActions.filter((action) => action.value !== 'publish');
		} else {
			filteredActions = filteredActions.filter((action) => action.value !== 'unpublish');
		}
	} else {
		filteredActions = filteredActions.filter(
			(action) => action.value !== 'publish' && action.value !== 'unpublish',
		);
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
	data: { formattedCreatedAt: string; versionName?: string; description?: string };
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
					<div v-if="isDraftPublishEnabled" :class="$style.descriptionBox">
						<N8nTooltip :content="versionNameDisplay" v-if="versionNameDisplay">
							<N8nText :class="$style.mainLine" bold color="text-dark">{{
								versionNameDisplay
							}}</N8nText>
						</N8nTooltip>
						<N8nText v-if="props.workflowVersion?.description" size="small" color="text-base">
							{{ props.workflowVersion.description }}
						</N8nText>
					</div>
					<section v-else :class="$style.textOld">
						<p>
							<span :class="$style.label">
								{{ i18n.baseText('workflowHistory.content.title') }}:
							</span>
							<time :datetime="props.workflowVersion.createdAt">{{ formattedCreatedAt }}</time>
						</p>
						<p>
							<span :class="$style.label">
								{{ i18n.baseText('workflowHistory.content.editedBy') }}:
							</span>
							<span>{{ props.workflowVersion.authors }}</span>
						</p>
						<p>
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

$descriptionBoxMaxWidth: 330px;
$descriptionBoxMinWidth: 228px;

.card {
	padding: var(--spacing--sm) var(--spacing--lg) 0 var(--spacing--xl);
	border: 0;
	align-items: start;

	.descriptionBox {
		display: flex;
		flex-direction: column;
		min-width: $descriptionBoxMinWidth;
		max-width: $descriptionBoxMaxWidth;
		gap: var(--spacing--3xs);
		margin-top: var(--spacing--3xs);
		padding: var(--spacing--xs);
		border: var(--border-width) var(--border-style) var(--color--neutral-800);
		border-radius: var(--radius);
		background-color: var(--color--neutral-900);

		.mainLine {
			@include mixins.utils-ellipsis;
			cursor: default;
		}
	}

	.textOld {
		display: flex;
		flex-direction: column;
		flex: 1 1 auto;

		p {
			display: flex;
			align-items: center;
			padding: 0;
			cursor: default;

			&:first-child {
				padding-top: var(--spacing--3xs);
				padding-bottom: var(--spacing--4xs);
				* {
					margin-top: auto;
					font-size: var(--font-size--md);
				}
			}

			&:last-child {
				padding-top: var(--spacing--3xs);

				* {
					font-size: var(--font-size--2xs);
				}
			}

			.label {
				color: var(--color--text--tint-1);
				padding-right: var(--spacing--4xs);
			}

			* {
				max-width: unset;
				justify-self: unset;
				white-space: unset;
				overflow: hidden;
				text-overflow: unset;
				padding: 0;
				font-size: var(--font-size--sm);
			}
		}
	}
}
</style>
