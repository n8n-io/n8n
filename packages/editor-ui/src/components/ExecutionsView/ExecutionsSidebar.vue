<template>
	<div :class="['executions-sidebar', $style.container]">
		<n8n-heading tag="h2" size="medium" color="text-dark">Executions</n8n-heading>
		<div :class="$style.executionList">
			<div :class="$style.executionCard" v-for="execution in executions" :key="execution.id">
				<router-link :to="{ name: VIEWS.EXECUTIONS, params: { executionId: execution.id }}">
					Execution {{ execution.id }}
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

export default mixins(workflowHelpers).extend({
	name: 'executions-sidebar',
	data() {
		return {
			VIEWS,
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
				return this.$store.getters.currentWorkflowExecutions;
			},
	},
	async mounted() {
		if (!this.currentWorkflow || this.currentWorkflow === PLACEHOLDER_EMPTY_WORKFLOW_ID) {
			this.$store.commit('setCurrentWorkflowExecutions', []);
		} else {
			await this.loadExecutions(this.currentWorkflow);
		}
	},
	methods: {
		async loadExecutions (workflowId: string): Promise<void> {
			if (!this.currentWorkflow) {
				return;
			}
			try {
				await this.$store.dispatch('loadCurrentWorkflowActions', workflowId);
			} catch (error) {
				this.$showError(
					error,
					this.$locale.baseText('executionsList.showError.refreshData.title'),
				);
			}
		},
	},
});
</script>

<style module lang="scss">
.container {
	height: 100%;
	flex: 310px 0 0;
	background-color: var(--color-background-xlight);
	border-right: var(--border-base);
	padding: var(--spacing-l) var(--spacing-2xs) var(--spacing-2xs) var(--spacing-l);
}

.executionList {
	margin: var(--spacing-xs) 0;
}

.executionCard {
	padding: var(--spacing-2xs);
	border-radius: var(--border-radius-base);
	cursor: pointer;

	&:hover {
		background-color: var(--color-foreground-base);
	}
}

</style>
