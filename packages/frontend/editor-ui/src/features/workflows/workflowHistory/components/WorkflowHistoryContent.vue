<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { IWorkflowDb, UserAction } from '@/Interface';
import type {
	WorkflowVersion,
	WorkflowHistoryActionTypes,
} from '@n8n/rest-api-client/api/workflowHistory';
import WorkflowPreview from '@/app/components/WorkflowPreview.vue';
import { useI18n } from '@n8n/i18n';
import type { IUser } from 'n8n-workflow';

import {
	N8nActionToggle,
	N8nButton,
	N8nIcon,
	N8nLink,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { IS_DRAFT_PUBLISH_ENABLED } from '@/app/constants';
import { formatTimestamp, generateVersionName } from '@/features/workflows/workflowHistory/utils';
import type { WorkflowHistoryAction } from '@/features/workflows/workflowHistory/types';

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
	action: [value: WorkflowHistoryAction];
}>();

const isDraftPublishEnabled = IS_DRAFT_PUBLISH_ENABLED;

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
	if (props.workflowVersion?.name) {
		return props.workflowVersion.name;
	}
	return props.isVersionActive && props.workflowVersion
		? generateVersionName(props.workflowVersion.versionId)
		: formattedCreatedAt.value;
});

const MAX_DESCRIPTION_LENGTH = 200;
const isDescriptionExpanded = ref(false);

const description = computed(() => props.workflowVersion?.description ?? '');
const isDescriptionLong = computed(() => description.value.length > MAX_DESCRIPTION_LENGTH);
const displayDescription = computed(() => {
	if (!isDescriptionLong.value || isDescriptionExpanded.value) {
		return description.value;
	}
	return description.value.substring(0, MAX_DESCRIPTION_LENGTH) + '... ';
});

const toggleDescription = () => {
	isDescriptionExpanded.value = !isDescriptionExpanded.value;
};

const actions = computed(() => {
	let filteredActions = props.actions;

	if (props.isFirstItemShown) {
		filteredActions = filteredActions.filter((action) => action.value !== 'restore');
	}

	if (isDraftPublishEnabled) {
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

const onAction = (value: string) => {
	if (!props.workflowVersion) {
		return;
	}
	const action = value as WorkflowHistoryActionTypes[number];
	emit('action', {
		action,
		id: props.workflowVersion.versionId,
		data: {
			formattedCreatedAt: formattedCreatedAt.value,
			versionName: versionNameDisplay.value,
			description: description.value,
		},
	});
};

watch(
	() => props.workflowVersion,
	() => {
		isDescriptionExpanded.value = false;
	},
);
</script>

<template>
	<div :class="$style.content">
		<WorkflowPreview
			v-if="props.workflowVersion"
			:workflow="workflowVersionPreview"
			:loading="props.isListLoading"
			loader-type="spinner"
		/>
		<div v-if="props.workflowVersion" :class="$style.info">
			<div :class="$style.card">
				<div v-if="isDraftPublishEnabled" :class="$style.descriptionBox">
					<N8nTooltip v-if="versionNameDisplay" :content="versionNameDisplay">
						<N8nText :class="$style.mainLine" bold color="text-dark">{{
							versionNameDisplay
						}}</N8nText>
					</N8nTooltip>
					<N8nText v-if="description" size="small" color="text-base">
						{{ displayDescription }}
						<N8nLink v-if="isDescriptionLong" size="small" @click="toggleDescription">
							{{
								isDescriptionExpanded
									? i18n.baseText('generic.showLess')
									: i18n.baseText('generic.showMore')
							}}
						</N8nLink>
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
				<N8nActionToggle
					:class="$style.actions"
					:actions="actions"
					placement="bottom-end"
					data-test-id="workflow-history-content-actions"
					@action="onAction"
				>
					<N8nButton type="tertiary" size="large" data-test-id="action-toggle-button">
						{{ i18n.baseText('workflowHistory.content.actions') }}
						<N8nIcon class="ml-3xs" icon="chevron-down" size="small" />
					</N8nButton>
				</N8nActionToggle>
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

.info {
	position: absolute;
	z-index: 1;
	top: 0;
	left: 0;
	width: 100%;
}

$descriptionBoxMaxWidth: 330px;

.card {
	display: flex;
	align-items: start;
	justify-content: space-between;
	padding: var(--spacing--sm) var(--spacing--lg) 0;
}

.descriptionBox {
	display: flex;
	flex-direction: column;
	max-width: $descriptionBoxMaxWidth;
	gap: var(--spacing--3xs);
	margin-top: var(--spacing--3xs);
	padding: var(--spacing--xs);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius);
	background-color: var(--color--background--light-3);
}

.mainLine {
	@include mixins.utils-ellipsis;
	cursor: default;
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

.label {
	color: var(--color--text--tint-1);
	padding-right: var(--spacing--4xs);
}

.actions {
	display: block;
	padding: var(--spacing--3xs);
}
</style>
