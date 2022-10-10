<template>
	<div v-if="statusFilterApplied || executions.length > 0" :class="['executions-sidebar', $style.container]">
		<div :class="$style.heading">
				<n8n-heading tag="h2" size="medium" color="text-dark">
				{{ $locale.baseText('generic.executions') }}
			</n8n-heading>
			<n8n-popover trigger="click" >
				<template slot="reference">
					<n8n-button icon="filter" type="tertiary" size="small" :active="statusFilterApplied" :class="[$style['filter-button']]">
						<n8n-badge v-if="statusFilterApplied" theme="primary" class="mr-4xs">1</n8n-badge>
						{{ $locale.baseText('executionsList.filters') }}
					</n8n-button>
				</template>
				<div :class="$style['filters-dropdown']">
					<div class="mb-s">
						<n8n-input-label
							:label="$locale.baseText('executions.ExecutionStatus')"
							:bold="false"
							size="small"
							color="text-base"
							class="mb-3xs"
						/>
						<n8n-select
							v-model="filter.status"
							size="small"
							ref="typeInput"
							:class="$style['type-input']"
							:placeholder="$locale.baseText('generic.any')"
							@change="loadExecutions"
						>
							<n8n-option
								v-for="item in executionStatuses"
								:key="item.id"
								:label="item.name"
								:value="item.id">
							</n8n-option>
						</n8n-select>
					</div>
					<div :class="[$style['filters-dropdown-footer'], 'mt-s']" v-if="statusFilterApplied">
						<n8n-link @click="resetFilters">
							{{ $locale.baseText('generic.reset') }}
						</n8n-link>
					</div>
				</div>
			</n8n-popover>
		</div>
		<div v-show="statusFilterApplied" class="mt-xs">
			<n8n-info-tip :bold="false">
				{{ $locale.baseText('generic.filtersApplied') }}
				<n8n-link @click="resetFilters" size="small">
					{{ $locale.baseText('generic.resetAllFilters') }}
				</n8n-link>
			</n8n-info-tip>
		</div>
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
			filter: {
				status: '',
			},
		};
	},
	computed: {
		statusFilterApplied(): boolean {
			return this.filter.status !== '';
		},
		executionStatuses(): Array<{ id: string, name: string }> {
			return [
				{ id: 'error', name: this.$locale.baseText('executionsList.error') },
				{ id: 'running', name: this.$locale.baseText('executionsList.running') },
				{ id: 'success', name: this.$locale.baseText('executionsList.success') },
				{ id: 'waiting', name: this.$locale.baseText('executionsList.waiting') },
			];
		},
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
		resetFilters(): void {
			this.filter.status = '';
			this.loadExecutions();
		},
		prepareFilter(): object {
			return {
				finished: this.filter.status !== 'running',
				status: this.filter.status,
			};
		},
		async loadExecutions (): Promise<void> {
			if (!this.currentWorkflow) {
				this.loading = false;
				return;
			}
			try {
				this.loading = true;
				await this.$store.dispatch('workflows/loadCurrentWorkflowExecutions', this.prepareFilter());

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

.heading {
	display: flex;
	justify-content: space-between;
	align-items: baseline;
	padding-right: var(--spacing-l);
}
</style>
