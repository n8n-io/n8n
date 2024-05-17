<template>
	<div
		ref="container"
		:class="['executions-sidebar', $style.container]"
		data-test-id="executions-sidebar"
	>
		<div :class="$style.heading">
			<n8n-heading tag="h2" size="medium" color="text-dark">
				{{ $locale.baseText('generic.executions') }}
			</n8n-heading>
		</div>
		<div :class="$style.controls">
			<el-checkbox
				v-model="executionsStore.autoRefresh"
				data-test-id="auto-refresh-checkbox"
				@update:model-value="$emit('update:autoRefresh', $event)"
			>
				{{ $locale.baseText('executionsList.autoRefresh') }}
			</el-checkbox>
			<ExecutionsFilter popover-placement="left-start" @filter-changed="onFilterChanged" />
		</div>
		<div
			ref="executionList"
			:class="$style.executionList"
			data-test-id="current-executions-list"
			@scroll="loadMore(20)"
		>
			<div v-if="loading" class="mr-l">
				<n8n-loading variant="rect" />
			</div>
			<div
				v-if="!loading && executions.length === 0"
				:class="$style.noResultsContainer"
				data-test-id="execution-list-empty"
			>
				<n8n-text color="text-base" size="medium" align="center">
					{{ $locale.baseText('executionsLandingPage.noResults') }}
				</n8n-text>
			</div>
			<WorkflowExecutionsCard
				v-else-if="temporaryExecution"
				:ref="`execution-${temporaryExecution.id}`"
				:execution="temporaryExecution"
				:data-test-id="`execution-details-${temporaryExecution.id}`"
				:show-gap="true"
				@retry-execution="onRetryExecution"
			/>
			<TransitionGroup name="executions-list">
				<WorkflowExecutionsCard
					v-for="execution in executions"
					:key="execution.id"
					:ref="`execution-${execution.id}`"
					:execution="execution"
					:data-test-id="`execution-details-${execution.id}`"
					@retry-execution="onRetryExecution"
				/>
			</TransitionGroup>
			<div v-if="loadingMore" class="mr-m">
				<n8n-loading variant="p" :rows="1" />
			</div>
		</div>
		<div :class="$style.infoAccordion">
			<WorkflowExecutionsInfoAccordion :initially-expanded="false" />
		</div>
	</div>
</template>

<script lang="ts">
import WorkflowExecutionsCard from '@/components/executions/workflow/WorkflowExecutionsCard.vue';
import WorkflowExecutionsInfoAccordion from '@/components/executions/workflow/WorkflowExecutionsInfoAccordion.vue';
import ExecutionsFilter from '@/components/executions/ExecutionsFilter.vue';
import { VIEWS } from '@/constants';
import type { ExecutionSummary } from 'n8n-workflow';
import type { Route } from 'vue-router';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import { mapStores } from 'pinia';
import { useExecutionsStore } from '@/stores/executions.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { ExecutionFilterType } from '@/Interface';

type WorkflowExecutionsCardRef = InstanceType<typeof WorkflowExecutionsCard>;

export default defineComponent({
	name: 'WorkflowExecutionsSidebar',
	components: {
		WorkflowExecutionsCard,
		WorkflowExecutionsInfoAccordion,
		ExecutionsFilter,
	},
	props: {
		executions: {
			type: Array as PropType<ExecutionSummary[]>,
			required: true,
		},
		loading: {
			type: Boolean,
			default: true,
		},
		loadingMore: {
			type: Boolean,
			default: false,
		},
		temporaryExecution: {
			type: Object as PropType<ExecutionSummary>,
			default: null,
		},
	},
	emits: {
		retryExecution: null,
		loadMore: null,
		refresh: null,
		filterUpdated: null,
		reloadExecutions: null,
		'update:autoRefresh': null,
	},
	data() {
		return {
			filter: {} as ExecutionFilterType,
		};
	},
	computed: {
		...mapStores(useExecutionsStore, useWorkflowsStore),
	},
	watch: {
		$route(to: Route, from: Route) {
			if (from.name === VIEWS.EXECUTION_PREVIEW && to.name === VIEWS.EXECUTION_HOME) {
				// Skip parent route when navigating through executions with back button
				this.$router.go(-1);
			}
		},
	},
	mounted() {
		// On larger screens, we need to load more then first page of executions
		// for the scroll bar to appear and infinite scrolling is enabled
		this.checkListSize();
		setTimeout(() => {
			this.scrollToActiveCard();
		}, 1000);
	},
	methods: {
		loadMore(limit = 20): void {
			if (!this.loading) {
				const executionsListRef = this.$refs.executionList as HTMLElement | undefined;
				if (executionsListRef) {
					const diff =
						executionsListRef.offsetHeight -
						(executionsListRef.scrollHeight - executionsListRef.scrollTop);
					if (diff > -10 && diff < 10) {
						this.$emit('loadMore', limit);
					}
				}
			}
		},
		onRetryExecution(payload: object) {
			this.$emit('retryExecution', payload);
		},
		onRefresh(): void {
			this.$emit('refresh');
		},
		onFilterChanged(filter: ExecutionFilterType) {
			this.$emit('filterUpdated', filter);
		},
		reloadExecutions(): void {
			this.$emit('reloadExecutions');
		},
		checkListSize(): void {
			const sidebarContainerRef = this.$refs.container as HTMLElement | undefined;
			const currentWorkflowExecutionsCardRefs = this.$refs[
				`execution-${this.executionsStore.activeExecution?.id}`
			] as WorkflowExecutionsCardRef[] | undefined;

			// Find out how many execution card can fit into list
			// and load more if needed
			if (sidebarContainerRef && currentWorkflowExecutionsCardRefs?.length) {
				const cardElement = currentWorkflowExecutionsCardRefs[0].$el as HTMLElement;
				const listCapacity = Math.ceil(sidebarContainerRef.clientHeight / cardElement.clientHeight);

				if (listCapacity > this.executions.length) {
					this.$emit('loadMore', listCapacity - this.executions.length);
				}
			}
		},
		scrollToActiveCard(): void {
			const executionsListRef = this.$refs.executionList as HTMLElement | undefined;
			const currentWorkflowExecutionsCardRefs = this.$refs[
				`execution-${this.executionsStore.activeExecution?.id}`
			] as WorkflowExecutionsCardRef[] | undefined;

			if (
				executionsListRef &&
				currentWorkflowExecutionsCardRefs?.length &&
				this.executionsStore.activeExecution
			) {
				const cardElement = currentWorkflowExecutionsCardRefs[0].$el as HTMLElement;
				const cardRect = cardElement.getBoundingClientRect();
				const LIST_HEADER_OFFSET = 200;
				if (cardRect.top > executionsListRef.offsetHeight) {
					executionsListRef.scrollTo({ top: cardRect.top - LIST_HEADER_OFFSET });
				}
			}
		},
	},
});
</script>

<style module lang="scss">
.container {
	flex: 310px 0 0;
	background-color: var(--color-background-xlight);
	border-right: var(--border-base);
	padding: var(--spacing-l) 0 var(--spacing-l) var(--spacing-l);
	z-index: 1;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.heading {
	display: flex;
	justify-content: space-between;
	align-items: baseline;
	padding-right: var(--spacing-l);
}

.controls {
	padding: var(--spacing-s) 0 var(--spacing-xs);
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding-right: var(--spacing-m);

	button {
		display: flex;
		align-items: center;
	}
}

.executionList {
	flex: 1;
	overflow: auto;
	margin-bottom: var(--spacing-m);
	background-color: var(--color-background-xlight) !important;

	// Scrolling fader
	&::before {
		position: absolute;
		display: block;
		width: 270px;
		height: 6px;
		background: linear-gradient(to bottom, rgba(251, 251, 251, 1) 0%, rgba(251, 251, 251, 0) 100%);
		z-index: 999;
	}

	// Lower first execution card so fader is not visible when not scrolled
	& > div:first-child {
		margin-top: 3px;
	}
}

.infoAccordion {
	position: absolute;
	bottom: 0;
	margin-left: calc(-1 * var(--spacing-l));
	border-top: var(--border-base);

	& > div {
		width: 309px;
		background-color: var(--color-background-light);
		margin-top: 0 !important;
	}
}

.noResultsContainer {
	width: 100%;
	margin-top: var(--spacing-2xl);
	text-align: center;
}
</style>

<style lang="scss" scoped>
.executions-sidebar {
	:deep(.el-skeleton__item) {
		height: 60px;
		border-radius: 0;
	}
}
</style>
