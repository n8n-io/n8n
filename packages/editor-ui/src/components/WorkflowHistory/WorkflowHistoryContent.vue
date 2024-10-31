<script setup lang="ts">
import { computed } from 'vue';
import type { IWorkflowDb, UserAction } from '@/Interface';
import type {
	WorkflowVersion,
	WorkflowHistoryActionType,
	WorkflowVersionId,
} from '@/types/workflowHistory';
import WorkflowPreview from '@/components/WorkflowPreview.vue';
import WorkflowHistoryListItem from '@/components/WorkflowHistory/WorkflowHistoryListItem.vue';
import { useI18n } from '@/composables/useI18n';
import { compareWorkflows } from '@/utils/workflowDiff';
import { WORKFLOW_HISTORY_ACTIONS } from '@/constants';

const i18n = useI18n();

const props = defineProps<{
	workflow: IWorkflowDb | null;
	workflowVersion: WorkflowVersion | null;
	workflowDiff?: WorkflowVersion | null;
	actions: UserAction[];
	isListLoading?: boolean;
	isFirstItemShown?: boolean;
}>();

const emit = defineEmits<{
	action: [
		value: {
			action: WorkflowHistoryActionType;
			id: WorkflowVersionId;
			data?: { formattedCreatedAt: string };
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

const workflowDiffPreview = computed<IWorkflowDb | undefined>(() => {
	if (!props.workflowDiff || !props.workflow) {
		return;
	}

	const { pinData, ...workflow } = props.workflow;
	return {
		...workflow,
		nodes: props.workflowDiff.nodes,
		connections: props.workflowDiff.connections,
	};
});

const workflowComparison = computed(() => {
	if (!workflowVersionPreview.value || !workflowDiffPreview.value) {
		return;
	}

	return compareWorkflows(workflowVersionPreview.value, workflowDiffPreview.value);
});

const actions = computed(() =>
	props.isFirstItemShown
		? props.actions.filter((action) => action.value !== 'restore')
		: props.actions,
);

const onAction = ({
	action,
	id,
	data,
}: {
	action: WorkflowHistoryActionType;
	id: WorkflowVersionId;
	data: { formattedCreatedAt: string };
}) => {
	emit('action', { action, id, data });
};

function onClickCloseDiff() {
	emit('action', {
		action: WORKFLOW_HISTORY_ACTIONS.CLOSEDIFF,
		id: props.workflowVersion?.versionId ?? '',
	});
}
</script>

<template>
	<div :class="$style.content">
		<div :class="$style.splitView">
			<div v-if="props.workflowVersion" :class="$style.splitViewPanel">
				<WorkflowPreview
					:workflow="workflowVersionPreview"
					:diff="workflowComparison"
					:loading="props.isListLoading"
					loader-type="spinner"
				/>
				<div :class="$style.info">
					<WorkflowHistoryListItem
						:class="$style.card"
						:index="-1"
						:item="props.workflowVersion"
						:is-active="false"
						:actions="actions"
						@action="onAction"
					>
						<template #default="{ formattedCreatedAt }">
							<section :class="$style.text">
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
							<n8n-button type="tertiary" size="large" data-test-id="action-toggle-button">
								{{ i18n.baseText('workflowHistory.content.actions') }}
								<n8n-icon class="ml-3xs" icon="chevron-down" size="small" />
							</n8n-button>
						</template>
					</WorkflowHistoryListItem>
				</div>
			</div>
			<div v-if="props.workflowDiff" :class="$style.splitViewPanel">
				<WorkflowPreview
					:workflow="workflowDiffPreview"
					:diff="workflowComparison"
					:loading="props.isListLoading"
					loader-type="spinner"
				/>
				<div :class="$style.info">
					<WorkflowHistoryListItem
						:class="$style.card"
						:index="-1"
						:item="props.workflowDiff"
						:is-active="false"
					>
						<template #default="{ formattedCreatedAt }">
							<section :class="$style.text">
								<p>
									<span :class="$style.label">
										{{ i18n.baseText('workflowHistory.content.title') }}:
									</span>
									<time :datetime="props.workflowDiff.createdAt">{{ formattedCreatedAt }}</time>
								</p>
								<p>
									<span :class="$style.label">
										{{ i18n.baseText('workflowHistory.content.editedBy') }}:
									</span>
									<span>{{ props.workflowDiff.authors }}</span>
								</p>
								<p>
									<span :class="$style.label">
										{{ i18n.baseText('workflowHistory.content.versionId') }}:
									</span>
									<data :value="props.workflowDiff.versionId">{{
										props.workflowDiff.versionId
									}}</data>
								</p>
							</section>
						</template>
						<template #button>
							<n8n-button
								type="tertiary"
								size="large"
								data-test-id="close-diff-button"
								@click="onClickCloseDiff"
							>
								{{ i18n.baseText('workflowHistory.item.actions.closediff') }}
								<n8n-icon class="ml-3xs" icon="times" size="small" />
							</n8n-button>
						</template>
					</WorkflowHistoryListItem>
				</div>
			</div>
		</div>
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

.splitView {
	display: flex;
	flex-direction: row;
	width: 100%;
	height: 100%;

	.splitViewPanel {
		flex: 1 0 50%;
		display: flex;
		flex-direction: column;
		position: relative;

		&:first-child {
			border-right: 1px double var(--color-foreground-base);
		}
	}
}

.info {
	position: absolute;
	z-index: 1;
	top: 0;
	left: 0;
	width: 100%;
}

.card {
	padding: var(--spacing-s) var(--spacing-l) 0 var(--spacing-xl);
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
			cursor: default;

			&:first-child {
				padding-top: var(--spacing-3xs);
				padding-bottom: var(--spacing-4xs);
				* {
					margin-top: auto;
					font-size: var(--font-size-m);
				}
			}

			&:last-child {
				padding-top: var(--spacing-3xs);

				* {
					font-size: var(--font-size-2xs);
				}
			}

			.label {
				color: var(--color-text-light);
				padding-right: var(--spacing-4xs);
			}

			* {
				max-width: unset;
				justify-self: unset;
				white-space: unset;
				overflow: hidden;
				text-overflow: unset;
				padding: 0;
				font-size: var(--font-size-s);
			}
		}
	}
}
</style>
