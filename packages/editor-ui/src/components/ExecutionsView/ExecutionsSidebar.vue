<template>
	<div v-if="executions.length > 0" :class="['executions-sidebar', $style.container]">
		<n8n-heading tag="h2" size="medium" color="text-dark">
			{{ $locale.baseText('mainSidebar.executions') }}
		</n8n-heading>
		<div :class="$style.executionList">
			<div v-if="loading" :class="$style.loadingContainer">
				<n8n-loading :class="$style.loader" variant="p" :rows="1" />
				<n8n-loading :class="$style.loader" variant="p" :rows="1" />
			</div>
			<div v-else :class="$style.executionCard" v-for="execution in executions" :key="execution.id">
				<n8n-icon v-if="getExecutionStatus(execution) === 'unknown'" :class="['mr-2xs', $style.icon, $style.unknown]" icon="exclamation-triangle" />
				<n8n-icon v-else :class="['mr-2xs', $style.icon, $style[getExecutionStatus(execution)]]" icon="dot-circle" />
				<router-link :class="$style.executionLink" :to="{ name: VIEWS.EXECUTION_PREVIEW, params: { executionId: execution.id }}">
					{{ $locale.baseText('executionSidebar.executionName', { interpolate: { id: execution.id } }) }}
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
				this.loading = false;
				return;
			}
			try {
				this.loading = true;
				await this.$store.dispatch('loadCurrentWorkflowActions', workflowId);
			} catch (error) {
				this.$showError(
					error,
					this.$locale.baseText('executionsList.showError.refreshData.title'),
				);
			} finally {
				this.loading = false;
			}
		},
		getExecutionStatus(execution: IExecutionsSummary): string {
			let status = 'unknown';

			if (execution.waitTill) {
				status = 'waiting';
			} else if (execution.stoppedAt === undefined) {
				status = 'running';
			} else if (execution.finished) {
				status = 'success';
			} else if (execution.stoppedAt !== null) {
				status === 'error';
			}

			return status;
		},
	},
});
</script>

<style module lang="scss">
.container {
	height: calc(100% - 65px);
	flex: 310px 0 0;
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
	border-radius: var(--border-radius-base);
	cursor: pointer;

	&:hover {
		background-color: var(--color-foreground-base);

		.executionLink {
			color: var(--color-text-dark)
		}
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
