import { defineComponent } from 'vue';
import { mapStores } from 'pinia';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { i18n as locale } from '@/plugins/i18n';
import type { ExecutionSummary } from 'n8n-workflow';
import { convertToDisplayDate } from '@/utils/formatters/dateFormatter';

export interface IExecutionUIData {
	name: string;
	label: string;
	startTime: string;
	runningTime: string;
}

export const executionHelpers = defineComponent({
	computed: {
		...mapStores(useWorkflowsStore),
		executionId(): string {
			return this.$route.params.executionId;
		},
		workflowName(): string {
			return this.workflowsStore.workflowName;
		},
		currentWorkflow(): string {
			return this.$route.params.name || this.workflowsStore.workflowId;
		},
		executions(): ExecutionSummary[] {
			return this.workflowsStore.currentWorkflowExecutions;
		},
		activeExecution(): ExecutionSummary | null {
			return this.workflowsStore.activeWorkflowExecution;
		},
	},
	methods: {
		getExecutionUIDetails(execution: ExecutionSummary): IExecutionUIData {
			const status = {
				name: 'unknown',
				startTime: this.formatDate(execution.startedAt),
				label: 'Status unknown',
				runningTime: '',
			};

			if (execution.status === 'waiting') {
				status.name = 'waiting';
				status.label = this.$locale.baseText('executionsList.waiting');
			} else if (execution.status === 'canceled') {
				status.label = this.$locale.baseText('executionsList.canceled');
			} else if (execution.status === 'running' || execution.status === 'new') {
				status.name = 'running';
				status.label = this.$locale.baseText('executionsList.running');
			} else if (execution.status === 'success') {
				status.name = 'success';
				status.label = this.$locale.baseText('executionsList.succeeded');
			} else if (execution.status === 'error' || execution.status === 'crashed') {
				status.name = 'error';
				status.label = this.$locale.baseText('executionsList.error');
			}

			if (!execution.status) execution.status = 'unknown';

			if (execution.startedAt && execution.stoppedAt) {
				const stoppedAt = execution.stoppedAt
					? new Date(execution.stoppedAt).getTime()
					: Date.now();
				status.runningTime = this.$locale.displayTimer(
					stoppedAt - new Date(execution.startedAt).getTime(),
					true,
				);
			}

			return status;
		},
		formatDate(fullDate: Date | string | number) {
			const { date, time } = convertToDisplayDate(fullDate);
			return locale.baseText('executionsList.started', { interpolate: { time, date } });
		},
		isExecutionRetriable(execution: ExecutionSummary): boolean {
			return (
				['crashed', 'error'].includes(execution.status ?? '') &&
				!execution.retryOf &&
				!execution.retrySuccessId
			);
		},
	},
});
