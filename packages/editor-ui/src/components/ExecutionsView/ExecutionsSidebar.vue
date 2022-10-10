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
			<execution-card v-else v-for="execution in executions" :key="execution.id" :execution="execution" @refresh="loadExecutions"/>
		</div>
	</div>
</template>

<script lang="ts">
import { PLACEHOLDER_EMPTY_WORKFLOW_ID } from '@/constants';
import mixins from 'vue-typed-mixins';
import { executionHelpers } from '../mixins/executionsHelpers';
import ExecutionCard from '@/components/ExecutionsView/ExecutionCard.vue';
import { VIEWS } from '../../constants';

export default mixins(executionHelpers).extend({
	name: 'executions-sidebar',
	components: {
		ExecutionCard,
	},
	data() {
		return {
			VIEWS,
			loading: false,
		};
	},
	watch: {
		executions(newValue) {
			const loadedExecutionId = this.$route.params.executionId;
			if (!this.activeExecution && loadedExecutionId) {
				const execution = this.$store.getters['workflows/getExecutionDataById'](loadedExecutionId);
				if (execution) {
					this.$store.commit('workflows/setActiveWorkflowExecution', execution);
				}
			}
		},
	},
	async mounted() {
		if (!this.currentWorkflow || this.currentWorkflow === PLACEHOLDER_EMPTY_WORKFLOW_ID) {
			this.$store.commit('workflows/setCurrentWorkflowExecutions', []);
		} else {
			await this.loadExecutions();
			if (this.executions.length > 0) {
				this.$router.push({
					name: VIEWS.EXECUTION_PREVIEW,
					params: { name: this.currentWorkflow, executionId: this.executions[0].id },
				}).catch(()=>{});;
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
	},
});
</script>

<style module lang="scss">
.container {
	flex: 310px 0 0;
	height: 100%;
	background-color: var(--color-background-xlight);
	border-right: var(--border-base);
	padding: var(--spacing-l) 0 var(--spacing-2xs) var(--spacing-l);
	z-index: 1;
	overflow: hidden;
}

.executionList {
	height: 93%;
	overflow: auto;
	margin: var(--spacing-m) 0;
}
</style>
