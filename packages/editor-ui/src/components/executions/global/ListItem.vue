<script lang="ts" setup>
import type { PropType } from 'vue';
import { ref, computed, useCssModule } from 'vue';
import type { ExecutionSummary } from 'n8n-workflow';
import { useI18n } from '@/composables/useI18n';
import { VIEWS, WAIT_TIME_UNLIMITED } from '@/constants';
import { useRouter } from 'vue-router';
import { convertToDisplayDate } from '@/utils/formatters/dateFormatter';
import { i18n as locale } from '@/plugins/i18n';
import ExecutionTime from '@/components/ExecutionTime.vue';

const emit = defineEmits(['stop', 'select', 'retrySaved', 'retryOriginal', 'delete']);

const props = defineProps({
	execution: {
		type: Object as PropType<ExecutionSummary>,
		required: true,
	},
	selected: {
		type: Boolean,
		default: false,
	},
	workflowName: {
		type: String,
		default: undefined,
	},
});

const style = useCssModule();
const i18n = useI18n();
const router = useRouter();

const isStopping = ref(false);

const isRunning = computed(() => {
	return props.execution.status === 'running';
});

const isWaitTillIndefinite = computed(() => {
	if (!props.execution.waitTill) {
		return false;
	}

	return new Date(props.execution.waitTill).toISOString() === WAIT_TIME_UNLIMITED;
});

const isExecutionRetriable = computed(() => {
	return (
		props.execution.stoppedAt !== undefined &&
		!props.execution.finished &&
		props.execution.retryOf === undefined &&
		props.execution.retrySuccessId === undefined &&
		!props.execution.waitTill
	);
});

const classes = computed(() => {
	return {
		[style.executionListItem]: true,
		[style[props.execution.status ?? '']]: !!props.execution.status,
	};
});

const formattedStartedAtDate = computed(() => {
	return props.execution.startedAt ? formatDate(props.execution.startedAt) : '';
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
			return i18n.baseText('executionsList.running');
		case 'running':
			return i18n.baseText('executionsList.running');
		case 'success':
			return i18n.baseText('executionsList.succeeded');
		case 'failed':
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
		case 'failed':
		case 'success':
			if (!props.execution.stoppedAt) {
				return 'executionsList.statusTextWithoutTime';
			} else {
				return 'executionsList.statusText';
			}
		case 'new':
			return 'executionsList.statusRunning';
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
	const route = router.resolve({
		name: VIEWS.EXECUTION_PREVIEW,
		params: { name: props.execution.workflowId, executionId: props.execution.id },
	});
	window.open(route.href, '_blank');
}

function onStopExecution() {
	isStopping.value = true;
	emit('stop', props.execution);
}

function onSelect() {
	emit('select', props.execution);
}

async function handleActionItemClick(commandData: 'retrySaved' | 'retryOriginal' | 'delete') {
	emit(commandData, props.execution);
}
</script>
<template>
	<tr :class="classes">
		<td>
			<el-checkbox
				v-if="execution.stoppedAt !== undefined && execution.id"
				:model-value="selected"
				label=""
				data-test-id="select-execution-checkbox"
				@update:model-value="onSelect"
			/>
		</td>
		<td>
			<span @click.stop="displayExecution">
				<a href="#" :class="$style.link">{{ execution.workflowName || workflowName }}</a>
			</span>
		</td>
		<td>
			<span>{{ formattedStartedAtDate }}</span>
		</td>
		<td>
			<div :class="$style.statusColumn">
				<span v-if="isRunning" :class="$style.spinner">
					<font-awesome-icon icon="spinner" spin />
				</span>
				<i18n-t v-if="!isWaitTillIndefinite" tag="span" :keypath="statusTextTranslationPath">
					<template #status>
						<span :class="$style.status">{{ statusText }}</span>
					</template>
					<template #time>
						<span v-if="execution.waitTill">{{ formattedWaitTillDate }}</span>
						<span v-else-if="execution.stoppedAt !== null && execution.stoppedAt !== undefined">
							{{ formattedStoppedAtDate }}
						</span>
						<ExecutionTime v-else :start-time="execution.startedAt" />
					</template>
				</i18n-t>
				<n8n-tooltip v-else placement="top">
					<template #content>
						<span>{{ statusTooltipText }}</span>
					</template>
					<span :class="$style.status">{{ statusText }}</span>
				</n8n-tooltip>
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
			<n8n-tooltip v-if="execution.mode === 'manual'" placement="top">
				<template #content>
					<span>{{ i18n.baseText('executionsList.test') }}</span>
				</template>
				<font-awesome-icon icon="flask" />
			</n8n-tooltip>
		</td>
		<td>
			<div :class="$style.buttonCell">
				<n8n-button
					v-if="execution.stoppedAt !== undefined && execution.id"
					size="small"
					outline
					:label="i18n.baseText('executionsList.view')"
					@click.stop="displayExecution"
				/>
			</div>
		</td>
		<td>
			<div :class="$style.buttonCell">
				<n8n-button
					v-if="execution.stoppedAt === undefined || execution.waitTill"
					size="small"
					outline
					:label="i18n.baseText('executionsList.stop')"
					:loading="isStopping"
					@click.stop="onStopExecution"
				/>
			</div>
		</td>
		<td>
			<el-dropdown v-if="!isRunning" trigger="click" @command="handleActionItemClick">
				<span class="retry-button">
					<n8n-icon-button
						text
						type="tertiary"
						size="mini"
						:title="i18n.baseText('executionsList.retryExecution')"
						icon="ellipsis-v"
					/>
				</span>
				<template #dropdown>
					<el-dropdown-menu
						:class="{
							[$style.actions]: true,
							[$style.deleteOnly]: !isExecutionRetriable,
						}"
					>
						<el-dropdown-item
							v-if="isExecutionRetriable"
							:class="$style.retryAction"
							command="retrySaved"
						>
							{{ i18n.baseText('executionsList.retryWithCurrentlySavedWorkflow') }}
						</el-dropdown-item>
						<el-dropdown-item
							v-if="isExecutionRetriable"
							:class="$style.retryAction"
							command="retryOriginal"
						>
							{{ i18n.baseText('executionsList.retryWithOriginalWorkflow') }}
						</el-dropdown-item>
						<el-dropdown-item :class="$style.deleteAction" command="delete">
							{{ i18n.baseText('generic.delete') }}
						</el-dropdown-item>
					</el-dropdown-menu>
				</template>
			</el-dropdown>
		</td>
	</tr>
</template>

<style lang="scss" module>
@import '@/styles/variables';

@keyframes execution-item-animation {
	0% {
		background-color: var(--color-table-row-background);
	}
	25% {
		background-color: var(--color-table-row-highlight-background);
	}
	100% {
		background-color: var(--color-table-row-background);
	}
}

.executionListItem {
	color: var(--color-text-base);

	td {
		transition: background 0.3s ease;
		animation: execution-item-animation $executions-list-item-animation-duration ease-out;
		animation-delay: $executions-list-item-animation-delay;
		background: var(--color-table-row-background);
	}

	&:nth-child(even) td {
		--color-table-row-background: var(--color-table-row-even-background);
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
	&.failed td:first-child::before {
		background: var(--execution-card-border-error);
	}

	&.success td:first-child::before {
		background: var(--execution-card-border-success);
	}

	&.new td:first-child::before,
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
	.failed & {
		color: var(--color-danger);
	}

	.waiting & {
		color: var(--color-secondary);
	}

	.success & {
		font-weight: var(--font-weight-normal);
	}

	.new &,
	.running & {
		color: var(--color-warning);
	}

	.unknown & {
		color: var(--color-background-dark);
	}
}
</style>
