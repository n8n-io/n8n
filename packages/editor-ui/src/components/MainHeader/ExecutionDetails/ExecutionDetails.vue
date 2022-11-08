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
				<ShortenName :name="workflowName">
					<template v-slot="{ shortenedName }">
						<span @click="openWorkflow(workflowExecution.workflowId)">
							"{{ shortenedName }}"
						</span>
					</template>
				</ShortenName>
			</span>
			{{ $locale.baseText('executionDetails.workflow') }}
		</span>
		<ReadOnly class="read-only" />
	</div>
</template>

<script lang="ts">
import mixins from "vue-typed-mixins";

import { IExecutionResponse, IExecutionsSummary } from "../../../Interface";

import { titleChange } from "@/components/mixins/titleChange";

import ShortenName from "@/components/ShortenName.vue";
import ReadOnly from "@/components/MainHeader/ExecutionDetails/ReadOnly.vue";
import { mapStores } from "pinia";
import { useWorkflowsStore } from "@/stores/workflows";

export default mixins(titleChange).extend({
	name: "ExecutionDetails",
	components: {
		ShortenName,
		ReadOnly,
	},
	computed: {
		...mapStores(
			useWorkflowsStore,
		),
		executionId(): string | undefined {
			return this.$route.params.id;
		},
		executionFinished(): boolean {
			const fullExecution = this.workflowsStore.getWorkflowExecution;

			return !!fullExecution && fullExecution.finished;
		},
		executionWaiting(): boolean {
			const fullExecution = this.workflowsStore.getWorkflowExecution as IExecutionsSummary;

			return !!fullExecution && !!fullExecution.waitTill;
		},
		workflowExecution(): IExecutionResponse | null {
			return this.workflowsStore.getWorkflowExecution;
		},
		workflowName(): string {
			return this.workflowsStore.workflowName;
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

.el-tooltip.read-only div {
	max-width: 400px;
}
</style>
