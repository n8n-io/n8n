import { useWorkflowsStore } from '@/stores/workflows';
import { i18n as locale } from '@/plugins/i18n';
import { mapStores } from 'pinia';
import mixins from 'vue-typed-mixins';
import { genericHelpers } from './genericHelpers';
import { IExecutionsSummary } from 'n8n-workflow';

export interface IExecutionUIData {
	name: string;
	label: string;
	startTime: string;
	runningTime: string;
}

export const executionHelpers = mixins(genericHelpers).extend({
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
				if (execution.startedAt) {
					status.runningTime = this.displayTimer(
						new Date().getTime() - new Date(execution.startedAt).getTime(),
						true,
					);
				}
			} else if (execution.status === 'success' || execution.finished) {
				status.name = 'success';
				status.label = this.$locale.baseText('executionsList.succeeded');
				if (execution.stoppedAt) {
					status.runningTime = this.displayTimer(
						new Date(execution.stoppedAt).getTime() - new Date(execution.startedAt).getTime(),
						true,
					);
				}
			} else if (
				execution.status === 'failed' ||
				execution.status === 'crashed' ||
				execution.stoppedAt !== null
			) {
				status.name = 'error';
				status.label = this.$locale.baseText('executionsList.error');
				if (execution.stoppedAt) {
					status.runningTime = this.displayTimer(
						new Date(execution.stoppedAt).getTime() - new Date(execution.startedAt).getTime(),
						true,
					);
				}
			}

			return status;
		},
		formatDate(fullDate: Date | string | number) {
			const { date, time } = this.convertToDisplayDate(fullDate);
			return locale.baseText('executionsList.started', { interpolate: { time, date } });
		},
	},
});
