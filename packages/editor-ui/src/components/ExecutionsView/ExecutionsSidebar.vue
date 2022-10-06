<template>
	<div v-if="executions.length > 0" :class="['executions-sidebar', $style.container]">
		<n8n-heading tag="h2" size="medium" color="text-dark">
			{{ $locale.baseText('generic.executions') }}
		</n8n-heading>
		<div :class="$style.executionList">
			<div v-if="loading" :class="$style.loadingContainer">
				<n8n-loading :class="$style.loader" variant="p" :rows="1" />
				<n8n-loading :class="$style.loader" variant="p" :rows="1" />
			</div>
			<div
				v-else
				v-for="execution in executions"
				:key="execution.id"
				:class="{
					[$style.executionCard]: true,
					[$style.active]: execution.id === activeExecution.id,
					[$style[executionUIDetails(execution)['name']]]: true,
				}"
			>
				<router-link :class="$style.executionLink" :to="{ name: VIEWS.EXECUTION_PREVIEW, params: { workflowId: currentWorkflow, executionId: execution.id }}">
					<div :class="$style.description">
						<n8n-text color="text-dark" :bold="true" size="medium">{{ executionUIDetails(execution)['startTime'] }}</n8n-text>
						<div>
							<n8n-text :class="$style.statusLabel" size="small">{{ executionUIDetails(execution)['statusLabel'] }}</n8n-text>
							<n8n-text color="text-base" size="small"> in {{ executionUIDetails(execution)['runningTime'] }}</n8n-text>
						</div>
					</div>
					<div :class="$style.icons">
					</div>
				</router-link>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { PLACEHOLDER_EMPTY_WORKFLOW_ID } from '@/constants';
import { IExecutionsSummary } from '@/Interface';
import mixins from 'vue-typed-mixins';
import { workflowHelpers } from '../mixins/workflowHelpers';
import { VIEWS } from '../../constants';
import dateFormat from 'dateformat';
import { genericHelpers } from '../mixins/genericHelpers';

export default mixins(workflowHelpers, genericHelpers).extend({
	name: 'executions-sidebar',
	data() {
		return {
			VIEWS,
			loading: false,
		};
	},
	computed: {
		workflowName (): string {
			return this.$store.getters.workflowName;
		},
		currentWorkflow (): string {
			return this.$route.params.name || this.$store.getters.workflowId;
		},
		executions(): IExecutionsSummary[] {
			return this.$store.getters['workflows/currentWorkflowExecutions'];
		},
		activeExecution(): IExecutionsSummary {
			return this.$store.getters['workflows/getActiveWorkflowExecution'];
		},
	},
	async mounted() {
		if (!this.currentWorkflow || this.currentWorkflow === PLACEHOLDER_EMPTY_WORKFLOW_ID) {
			this.$store.commit('workflows/setCurrentWorkflowExecutions', []);
		} else {
			await this.loadExecutions();
			if (this.executions.length > 0) {
				this.$router.push({ name: VIEWS.EXECUTION_PREVIEW, params: { name: this.currentWorkflow, executionId: this.executions[0].id } });
			}
		}
	},
	methods: {
		async loadExecutions (): Promise<void> {
			if (!this.currentWorkflow) {
				this.loading = false;
				return;
			}
			try {
				this.loading = true;
				await this.$store.dispatch('workflows/loadCurrentWorkflowExecutions');

				const activeExecutionId = this.$route.params.executionId;
				if (activeExecutionId) {
					const execution = this.$store.getters['workflows/getExecutionDataById'](activeExecutionId);
					if (execution) {
						this.$store.commit('workflows/setActiveWorkflowExecution', execution);
					}
				}
			} catch (error) {
				this.$showError(
					error,
					this.$locale.baseText('executionsList.showError.refreshData.title'),
				);
			} finally {
				this.loading = false;
			}
		},
		executionUIDetails(execution: IExecutionsSummary): { name: string, startTime: string, statusLabel: string, runningTime?: string } {
			const status = {
				name: 'unknown',
				startTime: this.formatDate(new Date(execution.startedAt)),
				statusLabel: 'Status unknown',
				runningTime: '',
				color: '#fff',
			};

			if (execution.waitTill) {
				status.name = 'waiting';
				status.statusLabel = 'Waiting';
			} else if (execution.stoppedAt === undefined) {
				status.name = 'running';
				status.statusLabel = 'Running';
			} else if (execution.finished) {
				status.name = 'success';
				status.statusLabel = 'Succeeded';
				if (execution.stoppedAt) {
					status.runningTime = this.displayTimer(new Date(execution.stoppedAt).getTime() - new Date(execution.startedAt).getTime(), true);
				}
			} else if (execution.stoppedAt !== null) {
				status.name = 'error';
				status.statusLabel = 'Failed';
				if (execution.stoppedAt) {
					status.runningTime = this.displayTimer(new Date(execution.stoppedAt).getTime() - new Date(execution.startedAt).getTime(), true);
				}
			}

			return status;
		},
		formatDate(date: Date) {
			return dateFormat(date.getTime(), 'HH:MM:ss "on" d mmmm');
		},

	},
});
</script>

<style module lang="scss">
.container {
	flex: 310px 0 0;
	height: 100%;
	background-color: var(--color-background-xlight);
	border-right: var(--border-base);
	padding: var(--spacing-l) var(--spacing-2xs) var(--spacing-2xs) var(--spacing-l);
	z-index: 1;
	overflow: hidden;
}

.executionList {
	height: 93%;
	overflow: auto;
	margin: var(--spacing-m) 0;
}

.executionCard {
	display: flex;
	padding: var(--spacing-2xs);
	cursor: pointer;

	&.active {
		background-color: #DBDFE7;
	}

	&:hover {
		background-color: #DBDFE7;
	}

	&.success {
		border-left: 4px solid #29A568;
	}
	&.waiting {
		border-left: 4px solid #5C4EC2;
		.statusLabel { color: #5C4EC2; }
	}
	&.error {
		border-left: 4px solid #FF6D5A;
		.statusLabel { color: #FF6D5A; }
	}
}

.icon {
	&.unknown, &.waiting, &.running { color: var(--color-warning); }
	&.success { color: var(--color-success); }
	&.error { color: var(--color-error); }
}

.executionLink {
	display: block;
	color: var(--color-text-base);
	font-size: var(--font-size-xs);
}

</style>
