import { defineComponent } from 'vue';
import { mapStores } from 'pinia';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { i18n as locale } from '@/plugins/i18n';
import { genericHelpers } from './genericHelpers';
import type { IExecutionsSummary } from 'n8n-workflow';

export interface IExecutionUIData {
	name: string;
	label: string;
	startTime: string;
	runningTime: string;
}

export const executionHelpers = defineComponent({
	mixins: [genericHelpers],
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
		executions(): IExecutionsSummary[] {
			return this.workflowsStore.currentWorkflowExecutions;
		},
		activeExecution(): IExecutionsSummary | null {
			return this.workflowsStore.activeWorkflowExecution;
		},
	},
	methods: {
		getExecutionUIDetails(execution: IExecutionsSummary): IExecutionUIData {
			const status = {
				name: 'unknown',
				startTime: this.formatDate(execution.startedAt),
				label: 'Status unknown',
				runningTime: '',
			};

			if (execution.status === 'waiting' || execution.waitTill) {
				status.name = 'waiting';
				status.label = this.$locale.baseText('executionsList.waiting');
			} else if (
				execution.status === 'running' ||
				execution.status === 'new' ||
				execution.stoppedAt === undefined
			) {
				status.name = 'running';
				status.label = this.$locale.baseText('executionsList.running');
			} else if (execution.status === 'success' || execution.finished) {
				status.name = 'success';
				status.label = this.$locale.baseText('executionsList.succeeded');
			} else if (execution.status === 'failed' || execution.status === 'crashed') {
				status.name = 'error';
				status.label = this.$locale.baseText('executionsList.error');
			} else if (execution.status === 'canceled') {
				status.label = this.$locale.baseText('executionsList.canceled');
			}

			if (!execution.status) execution.status = 'unknown';

			if (execution.startedAt && execution.stoppedAt) {
				const stoppedAt = execution.stoppedAt
					? new Date(execution.stoppedAt).getTime()
					: Date.now();
				status.runningTime = this.displayTimer(
					stoppedAt - new Date(execution.startedAt).getTime(),
					true,
				);
			}

			return status;
		},
		formatDate(fullDate: Date | string | number) {
			const { date, time } = this.convertToDisplayDate(fullDate);
			return locale.baseText('executionsList.started', { interpolate: { time, date } });
		},
	},
});
