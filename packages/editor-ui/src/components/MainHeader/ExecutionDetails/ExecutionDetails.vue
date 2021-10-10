<template>
	<div class="container">
		<span class="title">
			Execution Id:
			<span>
				<strong>{{ executionId }}</strong
				>&nbsp;
				<font-awesome-icon
					icon="check"
					class="execution-icon success"
					v-if="executionFinished"
					title="Execution was successful"
				/>
				<font-awesome-icon
					icon="clock"
					class="execution-icon warning"
					v-else-if="executionWaiting"
					title="Execution waiting"
				/>
				<font-awesome-icon
					icon="times"
					class="execution-icon error"
					v-else
					title="Execution failed"
				/>
			</span>
			of
			<span class="primary-color clickable" title="Open Workflow">
				<WorkflowNameShort :name="workflowName">
					<template v-slot="{ shortenedName }">
						<span @click="openWorkflow(workflowExecution.workflowId)">
							"{{ shortenedName }}"
						</span>
					</template>
				</WorkflowNameShort>
			</span>
			workflow
		</span>
		<ReadOnly class="read-only" />
	</div>
</template>

<script lang="ts">
import mixins from "vue-typed-mixins";

import { IExecutionResponse } from "../../../Interface";

import { titleChange } from "@/components/mixins/titleChange";

import WorkflowNameShort from "@/components/WorkflowNameShort.vue";
import ReadOnly from "@/components/MainHeader/ExecutionDetails/ReadOnly.vue";

export default mixins(titleChange).extend({
	name: "ExecutionDetails",
	components: {
		WorkflowNameShort,
		ReadOnly,
	},
	computed: {
		executionId(): string | undefined {
			return this.$route.params.id;
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

.title {
	flex: 1;
	text-align: center;
}

.read-only {
	align-self: flex-end;
}
</style>
