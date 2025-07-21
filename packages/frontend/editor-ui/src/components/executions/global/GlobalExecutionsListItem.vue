<script lang="ts" setup>
import AnimatedSpinner from '@/components/AnimatedSpinner.vue';
import ExecutionsTime from '@/components/executions/ExecutionsTime.vue';
import { useExecutionHelpers } from '@/composables/useExecutionHelpers';
import { useI18n } from '@n8n/i18n';
import { VIEWS } from '@/constants';
import type { PermissionsRecord } from '@n8n/permissions';
import { convertToDisplayDate } from '@/utils/formatters/dateFormatter';
import {
	N8nButton,
	N8nCheckbox,
	N8nIcon,
	N8nIconButton,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import type { IconColor } from '@n8n/design-system/types/icon';
import type { ExecutionStatus, ExecutionSummary } from 'n8n-workflow';
import { WAIT_INDEFINITELY } from 'n8n-workflow';
import { computed, ref, useCssModule } from 'vue';
import { type IconName } from '@n8n/design-system/components/N8nIcon/icons';

type Command = 'retrySaved' | 'retryOriginal' | 'delete';

const emit = defineEmits<{
	stop: [data: ExecutionSummary];
	select: [data: ExecutionSummary];
	retrySaved: [data: ExecutionSummary];
	retryOriginal: [data: ExecutionSummary];
	delete: [data: ExecutionSummary];
	goToUpgrade: [];
}>();

const props = withDefaults(
	defineProps<{
		execution: ExecutionSummary;
		selected?: boolean;
		workflowName?: string;
		workflowPermissions: PermissionsRecord['workflow'];
		concurrencyCap: number;
		isCloudDeployment?: boolean;
	}>(),
	{
		selected: false,
		workflowName: '',
	},
);

const style = useCssModule();
const locale = useI18n();
const executionHelpers = useExecutionHelpers();

const isStopping = ref(false);

const isRunning = computed(() => props.execution.status === 'running');

const isWaitTillIndefinite = computed(() => {
	if (!props.execution.waitTill) {
		return false;
	}

	return new Date(props.execution.waitTill).getTime() === WAIT_INDEFINITELY.getTime();
});

const isRetriable = computed(() => executionHelpers.isExecutionRetriable(props.execution));

const EXECUTION_STATUS = {
	CRASHED: 'crashed',
	ERROR: 'error',
	WAITING: 'waiting',
	SUCCESS: 'success',
	NEW: 'new',
	RUNNING: 'running',
	UNKNOWN: 'unknown',
	CANCELED: 'canceled',
} as const;

const executionIconStatusDictionary: Record<ExecutionStatus, { icon: IconName; color: IconColor }> =
	{
		[EXECUTION_STATUS.CRASHED]: {
			icon: 'status-error',
			color: 'danger',
		},
		[EXECUTION_STATUS.ERROR]: {
			icon: 'status-error',
			color: 'danger',
		},
		[EXECUTION_STATUS.WAITING]: {
			icon: 'status-waiting',
			color: 'secondary',
		},
		[EXECUTION_STATUS.SUCCESS]: {
			icon: 'status-completed',
			color: 'success',
		},
		[EXECUTION_STATUS.NEW]: {
			icon: 'status-new',
			color: 'foreground-xdark',
		},
		[EXECUTION_STATUS.RUNNING]: {
			icon: 'spinner',
			color: 'secondary',
		},
		[EXECUTION_STATUS.UNKNOWN]: {
			icon: 'status-unknown',
			color: 'foreground-xdark',
		},
		[EXECUTION_STATUS.CANCELED]: {
			icon: 'status-canceled',
			color: 'foreground-xdark',
		},
	};

const errorStatuses: ExecutionStatus[] = [EXECUTION_STATUS.ERROR, EXECUTION_STATUS.CRASHED];
const classes = computed(() => {
	return {
		[style.dangerBg]: errorStatuses.includes(props.execution.status),
	};
});

const formattedStartedAtDate = computed(() => {
	return props.execution.startedAt
		? formatDate(props.execution.startedAt)
		: locale.baseText('executionsList.startingSoon');
});

const formattedWaitTillDate = computed(() => {
	return props.execution.waitTill ? formatDate(props.execution.waitTill) : '';
});

const formattedStoppedAtDate = computed(() => {
	return props.execution.stoppedAt
		? locale.displayTimer(
				new Date(props.execution.stoppedAt).getTime() -
					new Date(props.execution.startedAt ?? props.execution.createdAt).getTime(),
				true,
			)
		: '';
});

function getStatusLabel(status: ExecutionStatus) {
	if (status === EXECUTION_STATUS.CRASHED) {
		return locale.baseText('executionsList.error');
	}
	return locale.baseText(`executionsList.${status}`);
}

const statusRender = computed(() => {
	return {
		...executionIconStatusDictionary[props.execution.status],
		label: getStatusLabel(props.execution.status),
	};
});

function formatDate(fullDate: Date | string | number) {
	const { date, time } = convertToDisplayDate(fullDate);
	return locale.baseText('executionsList.started', { interpolate: { time, date } });
}

function onStopExecution() {
	isStopping.value = true;
	emit('stop', props.execution);
}

function onSelect() {
	emit('select', props.execution);
}

async function handleActionItemClick(commandData: Command) {
	//@ts-ignore todo: fix this type
	emit(commandData, props.execution);
}
</script>
<template>
	<tr :class="classes">
		<td>
			<N8nCheckbox
				:model-value="selected"
				data-test-id="select-execution-checkbox"
				:disabled="!Boolean(execution.id && execution.stoppedAt)"
				class="mb-0"
				:style="{ marginTop: '-3px' }"
				@update:model-value="onSelect"
			/>
		</td>
		<td>
			<N8nTooltip :content="execution.workflowName || workflowName" placement="top">
				<RouterLink
					:to="{
						name: VIEWS.EXECUTION_PREVIEW,
						params: { name: execution.workflowId, executionId: execution.id },
					}"
					:class="$style.workflowName"
					target="_blank"
				>
					{{ execution.workflowName || workflowName }}
				</RouterLink>
			</N8nTooltip>
		</td>
		<td data-test-id="execution-status">
			<GlobalExecutionsListItemQueuedTooltip
				v-if="isWaitTillIndefinite || execution.status === EXECUTION_STATUS.NEW"
				:status="props.execution.status"
				:concurrency-cap="props.concurrencyCap"
				:is-cloud-deployment="props.isCloudDeployment"
				@go-to-upgrade="emit('goToUpgrade')"
			>
				<div>
					<N8nIcon :icon="statusRender.icon" :color="statusRender.color" class="mr-2xs" />
					{{ statusRender.label }}
				</div>
			</GlobalExecutionsListItemQueuedTooltip>
			<N8nTooltip
				v-else
				:disabled="execution.status !== EXECUTION_STATUS.WAITING"
				:content="
					locale.baseText('executionsList.statusWaiting', {
						interpolate: { status: execution.status, time: formattedWaitTillDate },
					})
				"
			>
				<div>
					<N8nText
						v-if="execution.status === EXECUTION_STATUS.RUNNING"
						color="secondary"
						class="mr-2xs"
					>
						<AnimatedSpinner />
					</N8nText>
					<N8nIcon
						v-else
						size="medium"
						:icon="statusRender.icon"
						:color="statusRender.color"
						class="mr-2xs"
					/>
					{{ statusRender.label }}
				</div>
			</N8nTooltip>
		</td>
		<td>
			{{ formattedStartedAtDate }}
		</td>
		<td data-test-id="execution-time">
			<template v-if="formattedStoppedAtDate">
				{{ formattedStoppedAtDate }}
			</template>
			<ExecutionsTime v-else :start-time="execution.startedAt ?? execution.createdAt" />
		</td>
		<td>
			<span v-if="execution.id">{{ execution.id }}</span>
			<span v-if="execution.retryOf">
				<br />
				<small> ({{ locale.baseText('executionsList.retryOf') }} {{ execution.retryOf }}) </small>
			</span>
			<span v-else-if="execution.retrySuccessId">
				<br />
				<small>
					({{ locale.baseText('executionsList.successRetry') }} {{ execution.retrySuccessId }})
				</small>
			</span>
		</td>
		<td>
			<N8nIcon v-if="execution.mode === 'manual'" icon="flask-conical" />
		</td>
		<td>
			<N8nButton
				v-if="!execution.stoppedAt || execution.waitTill"
				data-test-id="stop-execution-button"
				type="secondary"
				:loading="isStopping"
				:disabled="isStopping"
				@click.stop="onStopExecution"
			>
				{{ locale.baseText('executionsList.stop') }}
			</N8nButton>
		</td>
		<td>
			<ElDropdown v-if="!isRunning" trigger="click" @command="handleActionItemClick">
				<N8nIconButton text type="tertiary" icon="ellipsis-vertical" />
				<template #dropdown>
					<ElDropdownMenu
						:class="{
							[$style.actions]: true,
							[$style.deleteOnly]: !isRetriable,
						}"
					>
						<ElDropdownItem
							v-if="isRetriable"
							data-test-id="execution-retry-saved-dropdown-item"
							:class="$style.retryAction"
							command="retrySaved"
							:disabled="!workflowPermissions.execute"
						>
							{{ locale.baseText('executionsList.retryWithCurrentlySavedWorkflow') }}
						</ElDropdownItem>
						<ElDropdownItem
							v-if="isRetriable"
							data-test-id="execution-retry-original-dropdown-item"
							:class="$style.retryAction"
							command="retryOriginal"
							:disabled="!workflowPermissions.execute"
						>
							{{ locale.baseText('executionsList.retryWithOriginalWorkflow') }}
						</ElDropdownItem>
						<ElDropdownItem
							data-test-id="execution-delete-dropdown-item"
							:class="$style.deleteAction"
							command="delete"
							:disabled="!workflowPermissions.update"
						>
							{{ locale.baseText('generic.delete') }}
						</ElDropdownItem>
					</ElDropdownMenu>
				</template>
			</ElDropdown>
		</td>
	</tr>
</template>

<style lang="scss" module>
tr.dangerBg {
	background-color: rgba(215, 56, 58, 0.1);
}

.workflowName {
	display: inline-block;
	overflow: hidden;
	text-overflow: ellipsis;
	line-height: 1.2;
	max-width: 100%;
	color: var(--color-text-dark);
	font-size: var(--font-size-s);
	line-height: var(--font-line-height-loose);
	max-width: 450px;
}
</style>
