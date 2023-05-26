<template>
	<div
		:class="['executions-sidebar', $style.container]"
		ref="container"
		data-test-id="executions-sidebar"
	>
		<div :class="$style.heading">
			<n8n-heading tag="h2" size="medium" color="text-dark">
				{{ $locale.baseText('generic.executions') }}
			</n8n-heading>
		</div>
		<div :class="$style.controls">
			<el-checkbox
				v-model="autoRefresh"
				@change="onAutoRefreshToggle"
				data-test-id="auto-refresh-checkbox"
			>
				{{ $locale.baseText('executionsList.autoRefresh') }}
			</el-checkbox>
			<execution-filter popover-placement="left-start" @filterChanged="onFilterChanged" />
		</div>
		<div
			:class="$style.executionList"
			ref="executionList"
			data-test-id="current-executions-list"
			@scroll="loadMore(20)"
		>
			<div v-if="loading" class="mr-l">
				<n8n-loading variant="rect" />
			</div>
			<div v-if="!loading && executions.length === 0" :class="$style.noResultsContainer">
				<n8n-text color="text-base" size="medium" align="center">
					{{ $locale.baseText('executionsLandingPage.noResults') }}
				</n8n-text>
			</div>
			<execution-card
				v-else-if="temporaryExecution"
				:execution="temporaryExecution"
				:ref="`execution-${temporaryExecution.id}`"
				:data-test-id="`execution-details-${temporaryExecution.id}`"
				:showGap="true"
				@refresh="onRefresh"
				@retryExecution="onRetryExecution"
			/>
			<execution-card
				v-for="execution in executions"
				:key="execution.id"
				:execution="execution"
				:ref="`execution-${execution.id}`"
				:data-test-id="`execution-details-${execution.id}`"
				@refresh="onRefresh"
				@retryExecution="onRetryExecution"
			/>
			<div v-if="loadingMore" class="mr-m">
				<n8n-loading variant="p" :rows="1" />
			</div>
		</div>
		<div :class="$style.infoAccordion">
			<executions-info-accordion :initiallyExpanded="false" />
		</div>
	</div>
</template>

<script lang="ts">
import ExecutionCard from '@/components/ExecutionsView/ExecutionCard.vue';
import ExecutionsInfoAccordion from '@/components/ExecutionsView/ExecutionsInfoAccordion.vue';
import ExecutionFilter from '@/components/ExecutionFilter.vue';
import { VIEWS } from '@/constants';
import type { IExecutionsSummary } from 'n8n-workflow';
import type { Route } from 'vue-router';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { ExecutionFilterType } from '@/Interface';

type ExecutionCardRef = InstanceType<typeof ExecutionCard>;

export default defineComponent({
	name: 'executions-sidebar',
	components: {
		ExecutionCard,
		ExecutionsInfoAccordion,
		ExecutionFilter,
	},
	props: {
		executions: {
			type: Array as PropType<IExecutionsSummary[]>,
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
			type: Object as PropType<IExecutionsSummary>,
			default: null,
		},
	},
	data() {
		return {
			VIEWS,
			filter: {} as ExecutionFilterType,
			autoRefresh: false,
			autoRefreshInterval: undefined as undefined | NodeJS.Timer,
		};
	},
	computed: {
		...mapStores(useUIStore, useWorkflowsStore),
	},
	watch: {
		$route(to: Route, from: Route) {
			if (from.name === VIEWS.EXECUTION_PREVIEW && to.name === VIEWS.EXECUTION_HOME) {
				// Skip parent route when navigating through executions with back button
				this.$router.go(-1);
			}
		},
		'workflowsStore.activeWorkflowExecution'() {
			this.checkListSize();
			this.scrollToActiveCard();
		},
	},
	mounted() {
		this.autoRefresh = this.uiStore.executionSidebarAutoRefresh === true;
		this.startAutoRefreshInterval();

		// On larger screens, we need to load more then first page of executions
		// for the scroll bar to appear and infinite scrolling is enabled
		this.checkListSize();
		this.scrollToActiveCard();

		document.addEventListener('visibilitychange', this.onDocumentVisibilityChange);
	},
	beforeDestroy() {
		this.stopAutoRefreshInterval();
		document.removeEventListener('visibilitychange', this.onDocumentVisibilityChange);
	},
	methods: {
		startAutoRefreshInterval() {
			if (this.autoRefresh) {
				this.autoRefreshInterval = setInterval(() => this.onRefresh(), 4000);
			}
		},
		stopAutoRefreshInterval() {
			if (this.autoRefreshInterval) {
				clearInterval(this.autoRefreshInterval);
				this.autoRefreshInterval = undefined;
			}
		},
		onDocumentVisibilityChange() {
			if (document.visibilityState === 'hidden') {
				this.stopAutoRefreshInterval();
			} else {
				this.startAutoRefreshInterval();
			}
		},
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
		onRetryExecution(payload: Object) {
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
		onAutoRefreshToggle(): void {
			this.uiStore.executionSidebarAutoRefresh = this.autoRefresh;

			this.stopAutoRefreshInterval(); // Clear any previously existing intervals (if any - there shouldn't)
			this.startAutoRefreshInterval();
		},
		checkListSize(): void {
			const sidebarContainerRef = this.$refs.container as HTMLElement | undefined;
			const currentExecutionCardRefs = this.$refs[
				`execution-${this.workflowsStore.activeWorkflowExecution?.id}`
			] as ExecutionCardRef[] | undefined;

			// Find out how many execution card can fit into list
			// and load more if needed
			if (sidebarContainerRef && currentExecutionCardRefs?.length) {
				const cardElement = currentExecutionCardRefs[0].$el as HTMLElement;
				const listCapacity = Math.ceil(sidebarContainerRef.clientHeight / cardElement.clientHeight);

				if (listCapacity > this.executions.length) {
					this.$emit('loadMore', listCapacity - this.executions.length);
				}
			}
		},
		scrollToActiveCard(): void {
			const executionsListRef = this.$refs.executionList as HTMLElement | undefined;
			const currentExecutionCardRefs = this.$refs[
				`execution-${this.workflowsStore.activeWorkflowExecution?.id}`
			] as ExecutionCardRef[] | undefined;

			if (
				executionsListRef &&
				currentExecutionCardRefs?.length &&
				this.workflowsStore.activeWorkflowExecution
			) {
				const cardElement = currentExecutionCardRefs[0].$el as HTMLElement;
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
	height: calc(100% - 10.5em);
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
:deep(.el-skeleton__item) {
	height: 60px;
	border-radius: 0;
}
</style>
