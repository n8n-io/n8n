<script lang="ts" setup>
import { ref, computed, useCssModule } from 'vue';
import type { ExecutionSummary } from 'n8n-workflow';
import { useI18n } from '@/composables/useI18n';
import { WAIT_TIME_UNLIMITED } from '@/constants';
import { convertToDisplayDate } from '@/utils/formatters/dateFormatter';
import { i18n as locale } from '@/plugins/i18n';
import ExecutionsTime from '@/components/executions/ExecutionsTime.vue';
import { useExecutionHelpers } from '@/composables/useExecutionHelpers';
import type { PermissionsRecord } from '@/permissions';

type Command = 'retrySaved' | 'retryOriginal' | 'delete';

const emit = defineEmits<{
	stop: [data: ExecutionSummary];
	select: [data: ExecutionSummary];
	retrySaved: [data: ExecutionSummary];
	retryOriginal: [data: ExecutionSummary];
	delete: [data: ExecutionSummary];
}>();

const props = withDefaults(
	defineProps<{
		execution: ExecutionSummary;
		selected?: boolean;
		workflowName?: string;
		workflowPermissions: PermissionsRecord['workflow'];
		concurrencyCap: number;
	}>(),
	{
		selected: false,
		workflowName: '',
	},
);

const style = useCssModule();
const i18n = useI18n();
const executionHelpers = useExecutionHelpers();

const isStopping = ref(false);

const isRunning = computed(() => {
	return props.execution.status === 'running';
});

const isQueued = computed(() => {
	return props.execution.status === 'new';
});

const isWaitTillIndefinite = computed(() => {
	if (!props.execution.waitTill) {
		return false;
	}

	return new Date(props.execution.waitTill).toISOString() === WAIT_TIME_UNLIMITED;
});

const isRetriable = computed(() => executionHelpers.isExecutionRetriable(props.execution));

const classes = computed(() => {
	return {
		[style.executionListItem]: true,
		[style[props.execution.status]]: true,
	};
});

const formattedStartedAtDate = computed(() => {
	return props.execution.startedAt
		? formatDate(props.execution.startedAt)
		: i18n.baseText('executionsList.startingSoon');
});

const formattedWaitTillDate = computed(() => {
	return props.execution.waitTill ? formatDate(props.execution.waitTill) : '';
});

const formattedStoppedAtDate = computed(() => {
	return props.execution.stoppedAt
		? i18n.displayTimer(
				new Date(props.execution.stoppedAt).getTime() -
					new Date(props.execution.startedAt).getTime(),
				true,
			)
		: '';
});

const statusTooltipText = computed(() => {
	if (isQueued.value) {
		return i18n.baseText('executionsList.statusTooltipText.waitingForConcurrencyCapacity', {
			interpolate: { concurrencyCap: props.concurrencyCap },
		});
	}

	if (props.execution.status === 'waiting' && isWaitTillIndefinite.value) {
		return i18n.baseText('executionsList.statusTooltipText.theWorkflowIsWaitingIndefinitely');
	}
	return '';
});

const statusText = computed(() => {
	switch (props.execution.status) {
		case 'waiting':
			return i18n.baseText('executionsList.waiting');
		case 'canceled':
			return i18n.baseText('executionsList.canceled');
		case 'crashed':
			return i18n.baseText('executionsList.error');
		case 'new':
			return i18n.baseText('executionsList.new');
		case 'running':
			return i18n.baseText('executionsList.running');
		case 'success':
			return i18n.baseText('executionsList.succeeded');
		case 'error':
			return i18n.baseText('executionsList.error');
		default:
			return i18n.baseText('executionsList.unknown');
	}
});

const statusTextTranslationPath = computed(() => {
	switch (props.execution.status) {
		case 'waiting':
			return 'executionsList.statusWaiting';
		case 'canceled':
			return 'executionsList.statusCanceled';
		case 'crashed':
		case 'error':
		case 'success':
			if (!props.execution.stoppedAt) {
				return 'executionsList.statusTextWithoutTime';
			} else {
				return 'executionsList.statusText';
			}
		case 'new':
			return 'executionsList.statusTextWithoutTime';
		case 'running':
			return 'executionsList.statusRunning';
		default:
			return 'executionsList.statusUnknown';
	}
});

function formatDate(fullDate: Date | string | number) {
	const { date, time } = convertToDisplayDate(fullDate);
	return locale.baseText('executionsList.started', { interpolate: { time, date } });
}

function displayExecution() {
	executionHelpers.openExecutionInNewTab(props.execution.id, props.execution.workflowId);
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
			<ElCheckbox
				v-if="!!execution.stoppedAt && execution.id"
				:model-value="selected"
				label=""
				data-test-id="select-execution-checkbox"
				@update:model-value="onSelect"
			/>
		</td>
		<td>
			<span :class="$style.link" @click.stop="displayExecution">
				{{ execution.workflowName || workflowName }}
			</span>
		</td>
		<td>
			<span>{{ formattedStartedAtDate }}</span>
		</td>
		<td>
			<div :class="$style.statusColumn">
				<span v-if="isRunning" :class="$style.spinner">
					<FontAwesomeIcon icon="spinner" spin />
				</span>
				<i18n-t
					v-if="!isWaitTillIndefinite && !isQueued"
					data-test-id="execution-status"
					tag="span"
					:keypath="statusTextTranslationPath"
				>
					<template #status>
						<span :class="$style.status">{{ statusText }}</span>
					</template>
					<template #time>
						<span v-if="execution.waitTill">{{ formattedWaitTillDate }}</span>
						<span v-else-if="!!execution.stoppedAt">
							{{ formattedStoppedAtDate }}
						</span>
						<ExecutionsTime
							v-else-if="execution.status !== 'new'"
							:start-time="execution.startedAt"
						/>
					</template>
				</i18n-t>
				<N8nTooltip v-else placement="top">
					<template #content>
						<span>{{ statusTooltipText }}</span>
					</template>
					<span :class="$style.status">{{ statusText }}</span>
				</N8nTooltip>
			</div>
		</td>
		<td>
			<span v-if="execution.id">#{{ execution.id }}</span>
			<span v-if="execution.retryOf">
				<br />
				<small> ({{ i18n.baseText('executionsList.retryOf') }} #{{ execution.retryOf }}) </small>
			</span>
			<span v-else-if="execution.retrySuccessId">
				<br />
				<small>
					({{ i18n.baseText('executionsList.successRetry') }} #{{ execution.retrySuccessId }})
				</small>
			</span>
		</td>
		<td>
			<N8nTooltip v-if="execution.mode === 'manual'" placement="top">
				<template #content>
					<span>{{ i18n.baseText('executionsList.test') }}</span>
				</template>
				<FontAwesomeIcon icon="flask" />
			</N8nTooltip>
		</td>
		<td>
			<div :class="$style.buttonCell">
				<N8nButton
					v-if="!!execution.stoppedAt && execution.id"
					size="small"
					outline
					:label="i18n.baseText('executionsList.view')"
					@click.stop="displayExecution"
				/>
			</div>
		</td>
		<td>
			<div :class="$style.buttonCell">
				<N8nButton
					v-if="!execution.stoppedAt || execution.waitTill"
					data-test-id="stop-execution-button"
					size="small"
					outline
					:label="i18n.baseText('executionsList.stop')"
					:loading="isStopping"
					@click.stop="onStopExecution"
				/>
			</div>
		</td>
		<td>
			<ElDropdown v-if="!isRunning" trigger="click" @command="handleActionItemClick">
				<N8nIconButton text type="tertiary" size="mini" icon="ellipsis-v" />
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
							{{ i18n.baseText('executionsList.retryWithCurrentlySavedWorkflow') }}
						</ElDropdownItem>
						<ElDropdownItem
							v-if="isRetriable"
							data-test-id="execution-retry-original-dropdown-item"
							:class="$style.retryAction"
							command="retryOriginal"
							:disabled="!workflowPermissions.execute"
						>
							{{ i18n.baseText('executionsList.retryWithOriginalWorkflow') }}
						</ElDropdownItem>
						<ElDropdownItem
							data-test-id="execution-delete-dropdown-item"
							:class="$style.deleteAction"
							command="delete"
							:disabled="!workflowPermissions.update"
						>
							{{ i18n.baseText('generic.delete') }}
						</ElDropdownItem>
					</ElDropdownMenu>
				</template>
			</ElDropdown>
		</td>
	</tr>
</template>

<style lang="scss" module>
@import '@/styles/variables';

.executionListItem {
	--execution-list-item-background: var(--color-table-row-background);
	--execution-list-item-highlight-background: var(--color-table-row-highlight-background);
	color: var(--color-text-base);

	td {
		background: var(--execution-list-item-background);
	}

	&:nth-child(even) td {
		--execution-list-item-background: var(--color-table-row-even-background);
	}

	&:hover td {
		background: var(--color-table-row-hover-background);
	}

	td:first-child {
		width: 30px;
		padding: 0 var(--spacing-s) 0 0;

		/*
			This is needed instead of table cell border because they are overlapping the sticky header
		*/
		&::before {
			content: '';
			display: inline-block;
			width: var(--spacing-4xs);
			height: 100%;
			vertical-align: middle;
			margin-right: var(--spacing-xs);
		}
	}

	&.crashed td:first-child::before,
	&.error td:first-child::before {
		background: var(--execution-card-border-error);
	}

	&.success td:first-child::before {
		background: var(--execution-card-border-success);
	}

	&.new td:first-child::before {
		background: var(--execution-card-border-waiting);
	}

	&.running td:first-child::before {
		background: var(--execution-card-border-running);
	}

	&.waiting td:first-child::before {
		background: var(--execution-card-border-waiting);
	}

	&.unknown td:first-child::before {
		background: var(--execution-card-border-unknown);
	}
}

.link {
	color: var(--color-text-base);
	text-decoration: underline;
	cursor: pointer;
}

.statusColumn {
	display: flex;
	align-items: center;
}

.spinner {
	margin-right: var(--spacing-2xs);
}

.status {
	line-height: 22.6px;
	text-align: center;
	font-size: var(--font-size-s);
	font-weight: var(--font-weight-bold);

	.crashed &,
	.error & {
		color: var(--color-danger);
	}

	.waiting & {
		color: var(--color-secondary);
	}

	.success & {
		font-weight: var(--font-weight-normal);
	}

	.new & {
		color: var(--execution-card-text-waiting);
	}

	.running & {
		color: var(--color-warning);
	}

	.unknown & {
		color: var(--color-background-dark);
	}
}

.buttonCell {
	overflow: hidden;

	button {
		transform: translateX(1000%);
		transition: transform 0s;

		&:focus-visible,
		.executionListItem:hover & {
			transform: translateX(0);
		}
	}
}
</style>
