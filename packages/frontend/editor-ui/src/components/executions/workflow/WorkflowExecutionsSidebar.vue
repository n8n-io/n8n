<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { ComponentPublicInstance } from 'vue';
import type { RouteLocationNormalizedLoaded } from 'vue-router';
import { useRoute, useRouter } from 'vue-router';
import WorkflowExecutionsCard from '@/components/executions/workflow/WorkflowExecutionsCard.vue';
import WorkflowExecutionsInfoAccordion from '@/components/executions/workflow/WorkflowExecutionsInfoAccordion.vue';
import ExecutionsFilter from '@/components/executions/ExecutionsFilter.vue';
import { VIEWS } from '@/constants';
import type { ExecutionSummary } from 'n8n-workflow';
import { useExecutionsStore } from '@/stores/executions.store';
import type { ExecutionFilterType, IWorkflowDb } from '@/Interface';
import { isComponentPublicInstance } from '@/utils/typeGuards';
import { getResourcePermissions } from '@n8n/permissions';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@/stores/settings.store';
import ConcurrentExecutionsHeader from '@/components/executions/ConcurrentExecutionsHeader.vue';
import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';

type AutoScrollDeps = { activeExecutionSet: boolean; cardsMounted: boolean; scroll: boolean };

const props = defineProps<{
	workflow?: IWorkflowDb;
	executions: ExecutionSummary[];
	loading: boolean;
	loadingMore: boolean;
	temporaryExecution?: ExecutionSummary;
}>();

const emit = defineEmits<{
	retryExecution: [payload: { execution: ExecutionSummary; command: string }];
	loadMore: [amount: number];
	filterUpdated: [filter: ExecutionFilterType];
	'update:autoRefresh': [boolean];
}>();

const route = useRoute();
const router = useRouter();
const i18n = useI18n();

const executionsStore = useExecutionsStore();
const settingsStore = useSettingsStore();
const pageRedirectionHelper = usePageRedirectionHelper();

const mountedItems = ref<string[]>([]);
const autoScrollDeps = ref<AutoScrollDeps>({
	activeExecutionSet: false,
	cardsMounted: false,
	scroll: true,
});
const currentWorkflowExecutionsCardRefs = ref<Record<string, ComponentPublicInstance>>({});
const sidebarContainerRef = ref<HTMLElement | null>(null);
const executionListRef = ref<HTMLElement | null>(null);

const workflowPermissions = computed(() => getResourcePermissions(props.workflow?.scopes).workflow);

/**
 * Calculate the number of executions counted towards the production executions concurrency limit.
 * Evaluation executions are not counted towards this limit and the evaluation limit isn't shown in the UI.
 */
const runningExecutionsCount = computed(() => {
	return props.executions.filter(
		(execution) =>
			execution.status === 'running' && ['webhook', 'trigger'].includes(execution.mode),
	).length;
});

watch(
	() => route,
	(to: RouteLocationNormalizedLoaded, from: RouteLocationNormalizedLoaded) => {
		if (from.name === VIEWS.EXECUTION_PREVIEW && to.name === VIEWS.EXECUTION_HOME) {
			// Skip parent route when navigating through executions with back button
			router.go(-1);
		}
	},
);

watch(
	() => executionsStore.activeExecution,
	(newValue: ExecutionSummary | null, oldValue: ExecutionSummary | null) => {
		if (newValue && newValue.id !== oldValue?.id) {
			autoScrollDeps.value.activeExecutionSet = true;
		}
	},
);

watch(
	autoScrollDeps,
	(updatedDeps: AutoScrollDeps) => {
		if (Object.values(updatedDeps).every(Boolean)) {
			scrollToActiveCard();
		}
	},
	{ deep: true },
);

function addCurrentWorkflowExecutionsCardRef(
	comp: Element | ComponentPublicInstance | null,
	id?: string,
) {
	if (comp && isComponentPublicInstance(comp) && id) {
		currentWorkflowExecutionsCardRefs.value[id] = comp;
	}
}

function onItemMounted(id: string): void {
	mountedItems.value.push(id);
	if (mountedItems.value.length === props.executions.length) {
		autoScrollDeps.value.cardsMounted = true;
		checkListSize();
	}

	if (executionsStore.activeExecution?.id === id) {
		autoScrollDeps.value.activeExecutionSet = true;
	}
}

function loadMore(limit = 20): void {
	if (!props.loading) {
		if (executionListRef.value) {
			const diff =
				executionListRef.value.offsetHeight -
				(executionListRef.value.scrollHeight - executionListRef.value.scrollTop);
			if (diff > -10 && diff < 10) {
				emit('loadMore', limit);
			}
		}
	}
}

function onRetryExecution(payload: { execution: ExecutionSummary; command: string }) {
	emit('retryExecution', payload);
}

function onFilterChanged(filter: ExecutionFilterType) {
	autoScrollDeps.value.activeExecutionSet = false;
	autoScrollDeps.value.scroll = true;
	mountedItems.value = [];
	emit('filterUpdated', filter);
}

function onAutoRefreshChange(enabled: boolean) {
	emit('update:autoRefresh', enabled);
}

function checkListSize(): void {
	// Find out how many execution card can fit into list
	// and load more if needed
	const cards = Object.values(currentWorkflowExecutionsCardRefs.value);
	if (sidebarContainerRef.value && cards.length) {
		const cardElement = cards[0].$el as HTMLElement;
		const listCapacity = Math.ceil(
			sidebarContainerRef.value.clientHeight / cardElement.clientHeight,
		);

		if (listCapacity > props.executions.length) {
			emit('loadMore', listCapacity - props.executions.length);
		}
	}
}

function scrollToActiveCard(): void {
	if (
		executionListRef.value &&
		executionsStore.activeExecution &&
		currentWorkflowExecutionsCardRefs.value[executionsStore.activeExecution.id]
	) {
		const cardElement =
			currentWorkflowExecutionsCardRefs.value[executionsStore.activeExecution.id].$el;
		const cardRect = cardElement.getBoundingClientRect();
		const LIST_HEADER_OFFSET = 200;
		if (cardRect.top > executionListRef.value.offsetHeight) {
			autoScrollDeps.value.scroll = false;
			executionListRef.value.scrollTo({
				top: cardRect.top - LIST_HEADER_OFFSET,
				behavior: 'smooth',
			});
		}
	}
}

const goToUpgrade = () => {
	void pageRedirectionHelper.goToUpgrade('concurrency', 'upgrade-concurrency');
};
</script>

<template>
	<div
		ref="sidebarContainerRef"
		:class="['executions-sidebar', $style.container]"
		data-test-id="executions-sidebar"
	>
		<div :class="$style.heading">
			<n8n-heading tag="h2" size="medium" color="text-dark">
				{{ i18n.baseText('generic.executions') }}
			</n8n-heading>

			<ConcurrentExecutionsHeader
				v-if="settingsStore.isConcurrencyEnabled"
				:running-executions-count="runningExecutionsCount"
				:concurrency-cap="settingsStore.concurrency"
				:is-cloud-deployment="settingsStore.isCloudDeployment"
				@go-to-upgrade="goToUpgrade"
			/>
		</div>
		<div :class="$style.controls">
			<el-checkbox
				v-model="executionsStore.autoRefresh"
				data-test-id="auto-refresh-checkbox"
				@update:model-value="onAutoRefreshChange"
			>
				{{ i18n.baseText('executionsList.autoRefresh') }}
			</el-checkbox>
			<ExecutionsFilter popover-placement="right-start" @filter-changed="onFilterChanged" />
		</div>
		<div
			ref="executionListRef"
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
					{{ i18n.baseText('executionsLandingPage.noResults') }}
				</n8n-text>
			</div>
			<WorkflowExecutionsCard
				v-else-if="temporaryExecution"
				:ref="(el) => addCurrentWorkflowExecutionsCardRef(el, temporaryExecution?.id)"
				:execution="temporaryExecution"
				:data-test-id="`execution-details-${temporaryExecution.id}`"
				:show-gap="true"
				:workflow-permissions="workflowPermissions"
				@retry-execution="onRetryExecution"
			/>
			<TransitionGroup name="executions-list">
				<WorkflowExecutionsCard
					v-for="execution in executions"
					:key="execution.id"
					:ref="(el) => addCurrentWorkflowExecutionsCardRef(el, execution.id)"
					:execution="execution"
					:workflow-permissions="workflowPermissions"
					:data-test-id="`execution-details-${execution.id}`"
					@retry-execution="onRetryExecution"
					@mounted="onItemMounted"
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
	position: relative;
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
	width: 100%;

	& > div {
		width: 100%;
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

:deep(.el-checkbox) {
	display: flex;
	align-items: center;
}
</style>
