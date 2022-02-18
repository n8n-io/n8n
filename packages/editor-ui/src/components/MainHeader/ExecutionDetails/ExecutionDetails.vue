<template>
	<div class="container">
		<span class="title">
			{{ $locale.baseText('executionDetails.executionId') + ':' }}
			<span>
				<strong>{{ executionId }}</strong
				>&nbsp;
				<font-awesome-icon
					icon="check"
					class="execution-icon success"
					v-if="executionFinished"
					:title="$locale.baseText('executionDetails.executionWasSuccessful')"
				/>
				<font-awesome-icon
					icon="clock"
					class="execution-icon warning"
					v-else-if="executionWaiting"
					:title="$locale.baseText('executionDetails.executionWaiting')"
				/>
				<font-awesome-icon
					icon="times"
					class="execution-icon error"
					v-else
					:title="$locale.baseText('executionDetails.executionFailed')"
				/>
			</span>
			{{ $locale.baseText('executionDetails.of') }}
			<span class="primary-color clickable" :title="$locale.baseText('executionDetails.openWorkflow')">
				<WorkflowNameShort :name="workflowName">
					<template v-slot="{ shortenedName }">
						<span @click="openWorkflow(workflowExecution.workflowId)">
							"{{ shortenedName }}"
						</span>
					</template>
				</WorkflowNameShort>
			</span>
			{{ $locale.baseText('executionDetails.workflow') }}
		</span>
		<span
			class="retry-exec-button"
			v-if="!executionFinished && !executionWaiting && !successfulRetry">
			<n8n-button
				:label="isRetrying ? 'Retrying' : 'Retry'"
				:loading="isRetrying"
				@click="retryExecution(executionId)"
			/>
		</span>
		<ReadOnly class="read-only" />
	</div>
</template>

<script lang="ts">
import mixins from "vue-typed-mixins";

import { IExecutionResponse } from "../../../Interface";

import { restApi } from '@/components/mixins/restApi';
import { showMessage } from '@/components/mixins/showMessage';

import { titleChange } from "@/components/mixins/titleChange";

import WorkflowNameShort from "@/components/WorkflowNameShort.vue";
import ReadOnly from "@/components/MainHeader/ExecutionDetails/ReadOnly.vue";

export default mixins(
	titleChange,
	restApi,
	showMessage,
).extend({
	name: "ExecutionDetails",
	components: {
		WorkflowNameShort,
		ReadOnly,
	},
	data () {
		return {
			isRetrying: false,
		};
	},
	computed: {
		executionId(): string | undefined {
			return this.$route.params.id;
		},
		successfulRetry(): boolean {
			const fullExecution = this.$store.getters.getWorkflowExecution;
			return !!fullExecution && !!fullExecution.retrySuccessId;
		},
		executionFinished(): boolean {
			const fullExecution = this.$store.getters.getWorkflowExecution;

			return !!fullExecution && fullExecution.finished;
		},
		executionWaiting(): boolean {
			const fullExecution = this.$store.getters.getWorkflowExecution;

			return !!fullExecution && !!fullExecution.waitTill;
		},
		workflowExecution(): IExecutionResponse | null {
			return this.$store.getters.getWorkflowExecution;
		},
		workflowName(): string {
			return this.$store.getters.workflowName;
		},
	},
	methods: {
		async openWorkflow(workflowId: string) {
			this.$titleSet(this.workflowName, "IDLE");
			// Change to other workflow
			this.$router.push({
				name: "NodeViewExisting",
				params: { name: workflowId },
			});
		},
		async retryExecution (executionId: string) {
			this.isRetrying = true;
			try {
				const retrySuccessful = await this.restApi().retryExecution(executionId, true);
				if (retrySuccessful === true) {
					this.$showMessage({
						title: 'Retry successful',
						message: 'The retry was successful!',
						type: 'success',
					});
				} else {
					this.$showMessage({
						title: 'Retry unsuccessful',
						message: 'The retry was not successful!',
						type: 'error',
					});
				}
				this.isRetrying = false;
			} catch (error) {
				this.$showError(error, 'Problem with retry', 'There was a problem with the retry:');
				this.isRetrying = false;
			}
		},
	},
});
</script>

<style scoped lang="scss">
* {
	box-sizing: border-box;
}

.execution-icon {
 &.success {
	color: var(--color-success);
 }
 &.warning {
	 color: var(--color-warning);
 }
}

.container {
	width: 100%;
	display: flex;
}

.retry-exec-button {
	margin-right: 30px;
}

.title {
	flex: 1;
	text-align: center;
}

.read-only {
	align-self: flex-end;
}

.el-tooltip.read-only div {
	max-width: 400px;
}
</style>
