<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import type { IExecutionUIData } from '../../composables/useExecutionHelpers';
import { EnterpriseEditionFeature, VIEWS } from '@/app/constants';
import ExecutionsTime from '../ExecutionsTime.vue';
import { useExecutionHelpers } from '../../composables/useExecutionHelpers';
import type { ExecutionSummary } from 'n8n-workflow';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useI18n } from '@n8n/i18n';
import type { PermissionsRecord } from '@n8n/permissions';
import { useSettingsStore } from '@/app/stores/settings.store';
import { toDayMonth, toTime } from '@/app/utils/formatters/dateFormatter';
import { useExecutionsStore } from '../../executions.store';
import { useToast } from '@/app/composables/useToast';

import {
	N8nActionDropdown,
	N8nIcon,
	N8nIconButton,
	N8nSpinner,
	N8nTags,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
const props = defineProps<{
	execution: ExecutionSummary;
	highlight?: boolean;
	showGap?: boolean;
	workflowPermissions: PermissionsRecord['workflow'];
}>();

const emit = defineEmits<{
	retryExecution: [{ execution: ExecutionSummary; command: string }];
	mounted: [string];
}>();

const route = useRoute();
const locale = useI18n();
const executionsStore = useExecutionsStore();
const { showError } = useToast();

const executionHelpers = useExecutionHelpers();
const workflowsStore = useWorkflowsStore();
const settingsStore = useSettingsStore();

const isAdvancedExecutionFilterEnabled = computed(
	() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.AdvancedExecutionFilters],
);
const isAnnotationEnabled = computed(() => isAdvancedExecutionFilterEnabled.value);

const currentWorkflow = computed(() => (route.params.name as string) || workflowsStore.workflowId);
const retryExecutionActions = computed(() => [
	{
		id: 'current-workflow',
		label: locale.baseText('executionsList.retryWithCurrentlySavedWorkflow'),
	},
	{
		id: 'original-workflow',
		label: locale.baseText('executionsList.retryWithOriginalWorkflow'),
	},
]);
const executionUIDetails = computed<IExecutionUIData>(() =>
	executionHelpers.getUIDetails(props.execution),
);
const isActive = computed(() => props.execution.id === route.params.executionId);
const isRetriable = computed(() => executionHelpers.isExecutionRetriable(props.execution));

const isPinned = computed(() => Boolean(props.execution.pinned));
const hasNote = computed(() => Boolean(props.execution.note && props.execution.note.trim().length));
const notePreview = computed(() => props.execution.note?.trim() ?? '');
const isPinning = ref(false);

onMounted(() => {
	emit('mounted', props.execution.id);
});

function onRetryMenuItemSelect(action: string): void {
	emit('retryExecution', { execution: props.execution, command: action });
}

async function onTogglePin(event: MouseEvent) {
	event.preventDefault();
	event.stopPropagation();

	if (!props.execution.id || !props.workflowPermissions.update || isPinning.value) {
		return;
	}

	isPinning.value = true;
	try {
		await executionsStore.updateExecutionPin(props.execution.id, !isPinned.value);
	} catch (error) {
		showError(error, 'executionDetails.pin.error');
	} finally {
		isPinning.value = false;
	}
}
</script>

<template>
	<div
		:class="{
			['execution-card']: true,
			[$style.WorkflowExecutionsCard]: true,
			[$style.active]: isActive,
			[$style[executionUIDetails.name]]: true,
			[$style.highlight]: highlight,
			[$style.showGap]: showGap,
			[$style.pinned]: execution.pinned,
		}"
	>
		<RouterLink
			:class="$style.executionLink"
			:to="{
				name: VIEWS.EXECUTION_PREVIEW,
				params: { name: currentWorkflow, executionId: execution.id },
				query: route.query,
			}"
			:data-test-execution-status="executionUIDetails.name"
		>
			<div :class="$style.description">
				<N8nText
					v-if="executionUIDetails.name === 'new'"
					color="text-dark"
					:bold="true"
					size="medium"
					data-test-id="execution-time"
				>
					{{ toDayMonth(executionUIDetails.createdAt) }} -
					{{ locale.baseText('executionDetails.startingSoon') }}
				</N8nText>
				<N8nText v-else color="text-dark" :bold="true" size="medium" data-test-id="execution-time">
					{{ executionUIDetails.startTime }}
				</N8nText>
				<div :class="$style.executionStatus">
					<N8nSpinner
						v-if="executionUIDetails.name === 'running'"
						size="small"
						:class="[$style.spinner, 'mr-4xs']"
					/>
					<N8nText :class="$style.statusLabel" size="small">{{ executionUIDetails.label }}</N8nText>
					{{ ' ' }}
					<N8nText
						v-if="executionUIDetails.name === 'running' && !execution.stoppedAt"
						:color="isActive ? 'text-dark' : 'text-base'"
						size="small"
						data-test-id="execution-time-in-status"
					>
						{{ locale.baseText('executionDetails.runningTimeRunning') }}
						<!-- Just here to make typescript happy, since `startedAt` will always be defined for running executions -->
						<ExecutionsTime :start-time="execution.startedAt ?? execution.createdAt" />
					</N8nText>
					<N8nText
						v-if="executionUIDetails.name === 'new' && execution.createdAt"
						:color="isActive ? 'text-dark' : 'text-base'"
						size="small"
					>
						<span
							>{{ locale.baseText('executionDetails.at') }} {{ toTime(execution.createdAt) }}</span
						>
					</N8nText>
					<N8nText
						v-else-if="executionUIDetails.runningTime !== ''"
						:color="isActive ? 'text-dark' : 'text-base'"
						size="small"
					>
						{{
							locale.baseText('executionDetails.runningTimeFinished', {
								interpolate: { time: executionUIDetails?.runningTime },
							})
						}}
					</N8nText>
				</div>
				<div v-if="execution.mode === 'retry'">
					<N8nText :color="isActive ? 'text-dark' : 'text-base'" size="small">
						{{ locale.baseText('executionDetails.retry') }} #{{ execution.retryOf }}
					</N8nText>
				</div>
				<div v-if="isAnnotationEnabled" :class="$style.annotation">
					<div v-if="execution.annotation?.vote" :class="$style.ratingIcon">
						<N8nIcon v-if="execution.annotation.vote == 'up'" :class="$style.up" icon="thumbs-up" />
						<N8nIcon v-else :class="$style.down" icon="thumbs-down" />
					</div>
					<N8nTags
						v-if="executionUIDetails.tags.length > 0"
						:tags="executionUIDetails.tags"
						:clickable="false"
					></N8nTags>
				</div>
			</div>
			<div :class="$style.icons">
				<N8nTooltip
					v-if="hasNote"
					:content="notePreview"
					placement="top"
					:teleported="false"
					effect="dark"
				>
					<N8nIcon :class="[$style.icon, $style.noteIcon]" icon="file-text" />
				</N8nTooltip>
				<N8nTooltip
					placement="top"
					:content="
						isPinned
							? locale.baseText('executionsList.pin.unpin')
							: locale.baseText('executionsList.pin.pin')
					"
				>
					<N8nIconButton
						size="small"
						type="tertiary"
						:loading="isPinning"
						:disabled="!workflowPermissions.update || isPinning"
						:title="
							isPinned
								? locale.baseText('executionsList.pin.unpin')
								: locale.baseText('executionsList.pin.pin')
						"
						icon="bookmark"
						:class="[$style.icon, $style.pinIcon, { [$style.pinnedIcon]: isPinned }]"
						data-test-id="execution-pin-button"
						@click="onTogglePin"
					/>
				</N8nTooltip>
				<N8nActionDropdown
					v-if="isRetriable"
					:class="[$style.icon, $style.retry]"
					:items="retryExecutionActions"
					:disabled="!workflowPermissions.execute"
					activator-icon="redo-2"
					data-test-id="retry-execution-button"
					@select="onRetryMenuItemSelect"
				/>
				<N8nTooltip v-if="execution.mode === 'manual'" placement="top">
					<template #content>
						<span>{{ locale.baseText('executionsList.test') }}</span>
					</template>
					<N8nIcon :class="[$style.icon, $style.manual]" icon="flask-conical" />
				</N8nTooltip>
				<N8nTooltip v-if="execution.mode === 'evaluation'" placement="top">
					<template #content>
						<span>{{ locale.baseText('executionsList.evaluation') }}</span>
					</template>
					<N8nIcon :class="[$style.icon, $style.evaluation]" icon="check-check" />
				</N8nTooltip>
			</div>
		</RouterLink>
	</div>
</template>

<style module lang="scss">
@use '@/app/css/variables' as *;

.WorkflowExecutionsCard {
	--execution-list-item--color--background: var(--execution-card--color--background);
	--execution-list-item--color--background--highlight: var(--color--warning--tint-1);

	display: flex;
	flex-direction: column;
	padding-right: var(--spacing--md);

	&.active {
		border-left: var(--spacing--4xs) var(--border-style) transparent !important;

		.executionStatus {
			color: var(--color--text--shade-1) !important;
		}
	}

	&:hover,
	&.active {
		.executionLink {
			--execution-list-item--color--background: var(--execution-card--color--background--hover);
		}
	}

	&.new,
	&.running {
		.spinner {
			position: relative;
			top: 1px;
		}
		&,
		& .executionLink {
			border-left: var(--spacing--4xs) var(--border-style)
				var(--execution-card--border-color--running);
		}
		.statusLabel,
		.spinner {
			color: var(--color--warning);
		}
	}

	&.success {
		&,
		& .executionLink {
			border-left: var(--spacing--4xs) var(--border-style)
				var(--execution-card--border-color--success);
		}
	}

	&.new {
		&,
		& .executionLink {
			border-left: var(--spacing--4xs) var(--border-style)
				var(--execution-card--border-color--waiting);
		}
		.statusLabel {
			color: var(--execution-card--color--text--waiting);
		}
	}

	&.waiting {
		&,
		& .executionLink {
			border-left: var(--spacing--4xs) var(--border-style)
				var(--execution-card--border-color--waiting);
		}
		.statusLabel {
			color: var(--color--secondary);
		}
	}

	&.error {
		&,
		& .executionLink {
			border-left: var(--spacing--4xs) var(--border-style)
				var(--execution-card--border-color--error);
		}
		.statusLabel {
			color: var(--color--danger);
		}
	}

	&.unknown {
		&,
		& .executionLink {
			border-left: var(--spacing--4xs) var(--border-style)
				var(--execution-card--border-color--unknown);
		}
	}

	&.pinned {
		.executionLink {
			border-left-color: var(--color--foreground--shade-1);
			background: var(--color--background--light-2);
		}
	}

	.annotation {
		display: flex;
		flex-direction: row;
		gap: var(--spacing--3xs);
		align-items: center;
		margin: var(--spacing--4xs) 0 0;

		.ratingIcon {
			.up {
				color: var(--color--success);
			}
			.down {
				color: var(--color--danger);
			}
		}
	}
}

.executionLink {
	background: var(--execution-list-item--color--background);
	display: flex;
	width: 100%;
	align-items: center;
	justify-content: space-between;
	color: var(--color--text);
	font-size: var(--font-size--xs);
	padding: var(--spacing--xs);
	padding-right: var(--spacing--sm);
	position: relative;
	left: calc(
		-1 * var(--spacing--4xs)
	); // Hide link border under card border so it's not visible when not hovered

	&:active {
		.icon,
		.statusLabel {
			color: var(--color--text);
		}
	}
}

.icons {
	display: flex;
	align-items: center;
}

.icon {
	font-size: var(--font-size--sm);

	&.retry {
		svg {
			color: var(--color--primary);
		}
	}

	&.manual {
		position: relative;
		top: 1px;
	}

	& + & {
		margin-left: var(--spacing--2xs);
	}
}

.noteIcon {
	color: var(--color--foreground--shade-1);
}

.pinIcon {
	color: var(--color--foreground--shade-1);

	&.pinnedIcon {
		color: var(--color--warning--shade-1);
	}
}

.showGap {
	margin-bottom: var(--spacing--2xs);
	.executionLink {
		border-bottom: 1px solid var(--color--foreground--shade-1);
	}
}
</style>
