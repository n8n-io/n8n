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
							@change="setExecutions"
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
			<execution-card v-else v-for="execution in executions" :key="execution.id" :execution="execution" @refresh="setExecutions"/>
		</div>
		<div :class="$style.infoAccordion">
			<executions-info-accordion />
		</div>
	</div>
</template>

<script lang="ts">
import { PLACEHOLDER_EMPTY_WORKFLOW_ID } from '@/constants';
import mixins from 'vue-typed-mixins';
import { executionHelpers } from '../mixins/executionsHelpers';
import ExecutionCard from '@/components/ExecutionsView/ExecutionCard.vue';
import ExecutionsInfoAccordion from '@/components/ExecutionsView/ExecutionsInfoAccordion.vue';
import { VIEWS } from '../../constants';
import { IExecutionsSummary } from '@/Interface';
import { range as _range } from 'lodash';

export default mixins(executionHelpers).extend({
	name: 'executions-sidebar',
	components: {
		ExecutionCard,
		ExecutionsInfoAccordion,
	},
	data() {
		return {
			VIEWS,
			loading: false,
			filter: {
				status: '',
			},
			autoRefresh: true,
			autoRefreshInterval: undefined as undefined | NodeJS.Timer,
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
			await this.setExecutions();
			if (this.executions.length > 0) {
				this.$router.push({
					name: VIEWS.EXECUTION_PREVIEW,
					params: { name: this.currentWorkflow, executionId: this.executions[0].id },
				}).catch(()=>{});;
			}
			// Set auto-refresh automatically for now
			this.autoRefreshInterval = setInterval(() => this.loadAutoRefresh(), 4000);
		}
	},
	beforeDestroy() {
		if (this.autoRefreshInterval) {
			clearInterval(this.autoRefreshInterval);
			this.autoRefreshInterval = undefined;
		}
	},
	methods: {
		resetFilters(): void {
			this.filter.status = '';
			this.setExecutions();
		},
		prepareFilter(): object {
			return {
				finished: this.filter.status !== 'running',
				status: this.filter.status,
			};
		},
		async setExecutions(): Promise<void> {
			this.loading = true;
			const workflowExecutions = await this.loadExecutions();
			this.loading = false;
			this.$store.commit('workflows/setCurrentWorkflowExecutions', workflowExecutions);
		},
		async loadAutoRefresh(): Promise<void> {
			console.log('Refreshing...');

			const fetchedExecutions: IExecutionsSummary[] = await this.loadExecutions();
			let existingExecutions: IExecutionsSummary[] = [ ...this.executions ];
			const alreadyPresentExecutionIds = existingExecutions.map(exec => parseInt(exec.id, 10));
			let lastId = 0;
			const gaps = [] as number[];

			for(let i = fetchedExecutions.length - 1; i >= 0; i--) {
				const currentItem = fetchedExecutions[i];
				const currentId = parseInt(currentItem.id, 10);
				if (lastId !== 0 && isNaN(currentId) === false) {
					// We are doing this iteration to detect possible gaps.
					// The gaps are used to remove executions that finished
					// and were deleted from database but were displaying
					// in this list while running.
					if (currentId - lastId > 1) {
						// We have some gaps.
						const range = _range(lastId + 1, currentId);
						gaps.push(...range);
					}
				}
				lastId = parseInt(currentItem.id, 10) || 0;

				// Check new results from end to start
				// Add new items accordingly.
				const executionIndex = alreadyPresentExecutionIds.indexOf(currentId);
				if (executionIndex !== -1) {
					// Execution that we received is already present.
					const existingExecution = existingExecutions.find(ex => ex.id === currentItem.id);
					const existingStillRunning = existingExecution && existingExecution.finished === false || existingExecution?.stoppedAt === undefined;

					if (existingStillRunning && currentItem.finished === true) {
							console.log('FOUND: ' + currentId);
						// Concurrency stuff. This might happen if the execution finishes
						// prior to saving all information to database. Somewhat rare but
						// With auto refresh and several executions, it happens sometimes.
						// So we replace the execution data so it displays correctly.
						existingExecutions[executionIndex] = currentItem;
					}

					continue;
				}

				// Find the correct position to place this newcomer
				let j;
				for (j = existingExecutions.length - 1; j >= 0; j--) {
					if (currentId < parseInt(existingExecutions[j].id, 10)) {
						existingExecutions.splice(j + 1, 0, currentItem);
						break;
					}
				}
				if (j === -1) {
					existingExecutions.unshift(currentItem);
				}
			}

			existingExecutions = existingExecutions.filter(execution => !gaps.includes(parseInt(execution.id, 10)) && lastId >= parseInt(execution.id, 10));
			this.$store.commit('workflows/setCurrentWorkflowExecutions', existingExecutions);
			this.setActiveExecution();
		},
		async loadExecutions(): Promise<IExecutionsSummary[]> {
			if (!this.currentWorkflow) {
				this.loading = false;
				return [];
			}
			try {
				const executions: IExecutionsSummary[] =
					await this.$store.dispatch('workflows/loadCurrentWorkflowExecutions', this.prepareFilter());
					this.setActiveExecution();
				return executions;
			} catch (error) {
				this.$showError(
					error,
					this.$locale.baseText('executionsList.showError.refreshData.title'),
				);
				return [];
			} finally {
				this.loading = false;
			}
		},
		setActiveExecution(): void {
			const activeExecutionId = this.$route.params.executionId;
			if (activeExecutionId) {
				const execution = this.$store.getters['workflows/getExecutionDataById'](activeExecutionId);
				if (execution) {
					this.$store.commit('workflows/setActiveWorkflowExecution', execution);
				}
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

.heading {
	display: flex;
	justify-content: space-between;
	align-items: baseline;
	padding-right: var(--spacing-l);
}

.executionList {
	height: 93%;
	overflow: auto;
	margin: var(--spacing-m) 0;
}

.infoAccordion {
	position: absolute;
	bottom: 0;
	margin-left: -24px;
	border-top: var(--border-base);

	& > div {
		width: 309px;
		background-color: var(--color-background-light);
		margin-top:  0 !important;
	}
}
</style>
