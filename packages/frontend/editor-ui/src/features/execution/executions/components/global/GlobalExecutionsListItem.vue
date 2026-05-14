<script lang="ts" setup>
import AnimatedSpinner from '@/app/components/AnimatedSpinner.vue';
import CallerKindBadge from '../CallerKindBadge.vue';
import ExecutionsTime from '../ExecutionsTime.vue';
import GlobalExecutionsListItemQueuedTooltip from './GlobalExecutionsListItemQueuedTooltip.vue';
import { useExecutionHelpers } from '../../composables/useExecutionHelpers';
import { useI18n } from '@n8n/i18n';
import { VIEWS } from '@/app/constants';
import type { PermissionsRecord } from '@n8n/permissions';
import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';
import type { IconColor } from '@n8n/design-system/types/icon';
import type { ExecutionStatus, ExecutionSummary } from 'n8n-workflow';
import { WAIT_INDEFINITELY } from 'n8n-workflow';
import type { ExecutionCallerKind } from '@n8n/api-types';
import type { SingleNodeExecutionSummaryExtras } from '../../executions.types';
import { computed, ref, useCssModule } from 'vue';
import { type IconName } from '@n8n/design-system/components/N8nIcon/icons';

import { ElDropdown, ElDropdownItem, ElDropdownMenu } from 'element-plus';
import {
	N8nButton,
	N8nCheckbox,
	N8nIcon,
	N8nIconButton,
	N8nTag,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useRouter } from 'vue-router';
import {
	formatSessionShortId,
	getCallerLabel,
	getCallerNameSuffix,
	getSingleNodeHeadline,
} from '../../executions.utils';

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
		execution: ExecutionSummary & SingleNodeExecutionSummaryExtras;
		selected?: boolean;
		workflowName?: string;
		workflowPermissions: PermissionsRecord['workflow'];
		concurrencyCap: number;
		isCloudDeployment?: boolean;
		/**
		 * When `true`, the row is rendered inside a session group header that
		 * already shows the caller + session metadata, so the caller chip and
		 * session chip are suppressed to avoid duplication.
		 */
		compact?: boolean;
		/**
		 * When set, the row is rendered as a child of an expanded session group
		 * with the given caller kind. Drives the visual hierarchy cues (left rule
		 * coloured by kind, subtle tint, slight indent) so the child rows read
		 * as belonging to the session header above them rather than as adjacent
		 * ungrouped executions.
		 */
		sessionKind?: ExecutionCallerKind;
	}>(),
	{
		selected: false,
		workflowName: '',
		compact: false,
		sessionKind: undefined,
	},
);

const style = useCssModule();
const locale = useI18n();
const executionHelpers = useExecutionHelpers();
const router = useRouter();

const isStopping = ref(false);

const isRunning = computed(() => props.execution.status === 'running');

const isSingleNodeExecution = computed(() => props.execution.mode === 'single-node');

const singleNodeHeadline = computed(() =>
	isSingleNodeExecution.value
		? getSingleNodeHeadline(
				props.execution,
				locale.baseText('executionsList.singleNode.headlineFallback'),
			)
		: '',
);

const singleNodeCallerLabel = computed(() =>
	isSingleNodeExecution.value ? getCallerLabel(props.execution.caller, locale) : '',
);

const callerKind = computed(() =>
	isSingleNodeExecution.value ? props.execution.caller?.kind : undefined,
);

const callerNameSuffix = computed(() =>
	isSingleNodeExecution.value ? getCallerNameSuffix(props.execution.caller) : '',
);

const sessionId = computed(() =>
	isSingleNodeExecution.value ? props.execution.caller?.sessionId : undefined,
);

const sessionShort = computed(() => formatSessionShortId(sessionId.value));

function onSessionChipClick() {
	if (!sessionId.value) return;
	void router.push({
		query: {
			...router.currentRoute.value.query,
			metadata: `caller.sessionId=${sessionId.value}`,
		},
	});
}

const SOURCE_ICON: Record<string, IconName> = {
	mcp: 'bot',
	cli: 'terminal',
	sdk: 'code',
	'instance-ai': 'bot',
};

const sourceIconName = computed<IconName>(() => {
	const kind = props.execution.caller?.kind;
	if (!kind) return 'plug-zap';
	return SOURCE_ICON[kind] ?? 'plug-zap';
});

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
		[style.sessionChildRow]: !!props.sessionKind,
		[style[`sessionChildRow--${props.sessionKind}`]]: !!props.sessionKind,
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
	<tr :class="classes" :data-session-kind="sessionKind">
		<td :class="{ [$style.sessionChildFirstCell]: !!sessionKind }">
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
			<template v-if="isSingleNodeExecution">
				<div :class="$style.singleNodeCell">
					<RouterLink
						:to="{
							name: VIEWS.EXECUTION_PREVIEW,
							params: { workflowId: execution.workflowId, executionId: execution.id },
						}"
						:class="$style.workflowName"
						data-test-id="execution-list-single-node-name"
						target="_blank"
					>
						{{ singleNodeHeadline }}
					</RouterLink>
					<template v-if="!compact">
						<span v-if="callerKind" :class="$style.singleNodeCaller">
							<N8nText size="xsmall" color="text-light">
								{{ locale.baseText('executionsList.singleNode.viaPrefix') }}
							</N8nText>
							<CallerKindBadge :kind="callerKind" />
							<N8nText v-if="callerNameSuffix" size="xsmall" color="text-light">
								{{ callerNameSuffix }}
							</N8nText>
						</span>
						<N8nTag
							v-if="sessionId"
							:text="sessionShort"
							:class="$style.sessionChip"
							data-test-id="executions-session-chip"
							clickable
							@click.stop="onSessionChipClick"
						/>
					</template>
				</div>
			</template>
			<N8nTooltip v-else :content="execution.workflowName || workflowName" placement="top">
				<RouterLink
					:to="{
						name: VIEWS.EXECUTION_PREVIEW,
						params: { workflowId: execution.workflowId, executionId: execution.id },
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
			<N8nTooltip v-if="execution.mode === 'manual'" content="Manual Execution" placement="top">
				<N8nIcon icon="flask-conical" />
			</N8nTooltip>
			<N8nTooltip v-else-if="execution.mode === 'chat'" content="Chat Execution" placement="top">
				<N8nIcon icon="messages-square" />
			</N8nTooltip>
			<N8nTooltip
				v-else-if="isSingleNodeExecution"
				:content="
					singleNodeCallerLabel || locale.baseText('executionsList.singleNode.headlineFallback')
				"
				placement="top"
			>
				<N8nIcon :icon="sourceIconName" />
			</N8nTooltip>
		</td>
		<td>
			<N8nButton
				variant="ghost"
				v-if="!execution.stoppedAt || execution.waitTill"
				data-test-id="stop-execution-button"
				:loading="isStopping"
				:disabled="isStopping"
				@click.stop="onStopExecution"
			>
				{{ locale.baseText('executionsList.stop') }}
			</N8nButton>
		</td>
		<td>
			<ElDropdown v-if="!isRunning" trigger="click" @command="handleActionItemClick">
				<N8nIconButton variant="subtle" icon="ellipsis-vertical" />
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
	color: var(--color--text--shade-1);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--lg);
	max-width: 450px;
	min-width: 0;
	white-space: nowrap;
}

.singleNodeCell {
	display: flex;
	align-items: center;
	flex-wrap: nowrap;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.singleNodeCaller {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);
	flex: 0 0 auto;
}

.sessionChip {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--xs);
	cursor: pointer;
	flex: 0 0 auto;
}

/*
 * Child-of-session-group treatment. The visual goal is "these rows obviously
 * belong to the session above them": subtle tint distinct from the standard
 * row stripe + a kind-coloured rule running down the leftmost edge of the
 * first cell + a small indent so children sit "inside" the chevron column of
 * the session header.
 *
 * The left rule is rendered as an inset box-shadow on the first cell rather
 * than a border to avoid disturbing the row's existing column widths.
 */
tr.sessionChildRow {
	background-color: var(--background--subtle);
}

.sessionChildFirstCell {
	box-shadow: inset 3px 0 0 var(--color--text--tint-1);
	padding-left: var(--spacing--l);
}

tr.sessionChildRow--mcp .sessionChildFirstCell {
	box-shadow: inset 3px 0 0 var(--color--primary);
}

tr.sessionChildRow--cli .sessionChildFirstCell {
	box-shadow: inset 3px 0 0 var(--color--success);
}

tr.sessionChildRow--sdk .sessionChildFirstCell {
	box-shadow: inset 3px 0 0 var(--color--warning);
}

tr.sessionChildRow--instance-ai .sessionChildFirstCell {
	box-shadow: inset 3px 0 0 var(--color--primary);
}
</style>
