<script setup lang="ts">
import { computed } from 'vue';
import type { IWorkflowDb, UserAction } from '@/Interface';
import type {
	WorkflowVersion,
	WorkflowHistoryActionTypes,
	WorkflowVersionId,
} from '@/types/workflowHistory';
import WorkflowPreview from '@/components/WorkflowPreview.vue';
import WorkflowHistoryListItem from '@/components/WorkflowHistory/WorkflowHistoryListItem.vue';
import { useI18n } from '@/composables';

const i18n = useI18n();

const props = defineProps<{
	workflow: IWorkflowDb | null;
	workflowVersion: WorkflowVersion | null;
	actions: UserAction[];
	isListLoading?: boolean;
}>();

const emit = defineEmits<{
	(
		event: 'action',
		value: {
			action: WorkflowHistoryActionTypes[number];
			id: WorkflowVersionId;
			data: { formattedCreatedAt: string };
		},
	): void;
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
			loaderType="spinner"
		/>
		<ul :class="$style.info">
			<workflow-history-list-item
				:class="$style.card"
				v-if="props.workflowVersion"
				:full="true"
				:index="-1"
				:item="props.workflowVersion"
				:isActive="false"
				:actions="props.actions"
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
					<n8n-button type="tertiary" size="small" data-test-id="action-toggle-button">
						{{ i18n.baseText('workflowHistory.content.actions') }}
						<n8n-icon class="ml-3xs" icon="chevron-down" size="small" />
					</n8n-button>
				</template>
			</workflow-history-list-item>
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
				padding-bottom: var(--spacing-3xs);
				* {
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
