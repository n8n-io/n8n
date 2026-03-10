<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue';
import { computed, ref, watch } from 'vue';
import type { RouteLocationNormalizedLoaded } from 'vue-router';
import { useRoute, useRouter } from 'vue-router';
import WorkflowExecutionsCard from './WorkflowExecutionsCard.vue';
import WorkflowExecutionsInfoAccordion from './WorkflowExecutionsInfoAccordion.vue';
import ExecutionsFilter from '../ExecutionsFilter.vue';
import { VIEWS } from '@/app/constants';
import type { ExecutionSummary } from 'n8n-workflow';
import { useExecutionsStore } from '../../executions.store';
import type { IWorkflowDb } from '@/Interface';
import type { ExecutionFilterType } from '../../executions.types';
import { isComponentPublicInstance } from '@/app/utils/typeGuards';
import { getResourcePermissions } from '@n8n/permissions';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@/app/stores/settings.store';
import ConcurrentExecutionsHeader from '../ConcurrentExecutionsHeader.vue';
import ExecutionStopAllText from '../ExecutionStopAllText.vue';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { useIntersectionObserver } from '@/app/composables/useIntersectionObserver';

import { N8nCheckbox, N8nHeading, N8nLoading, N8nText } from '@n8n/design-system';
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
	'execution:stopMany': [];
}>();

const route = useRoute();
const router = useRouter();
const i18n = useI18n();

const executionsStore = useExecutionsStore();
const settingsStore = useSettingsStore();
const pageRedirectionHelper = usePageRedirectionHelper();

const autoScrollDeps = ref<AutoScrollDeps>({
	activeExecutionSet: false,
	cardsMounted: false,
	scroll: true,
});
const currentWorkflowExecutionsCardRefs = ref<Record<string, ComponentPublicInstance>>({});
const executionListRef = ref<HTMLElement | null>(null);

const { observe: observeForLoadMore } = useIntersectionObserver({
	root: executionListRef,
	threshold: 0.01,
	onIntersect: () => emit('loadMore', 20),
});

const workflowPermissions = computed(() => getResourcePermissions(props.workflow?.scopes).workflow);

// In 'queue' mode concurrency control is applied per worker and returning a global count
// of concurrent executions would not be meaningful/helpful.
const showConcurrencyHeader = computed(
	() => settingsStore.isConcurrencyEnabled && !settingsStore.isQueueModeEnabled,
);

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
	const index = props.executions.findIndex((execution) => execution.id === id);

	if (executionsStore.activeExecution?.id === id) {
		autoScrollDeps.value.activeExecutionSet = true;
		autoScrollDeps.value.cardsMounted = true;
	}

	// Observe the last item to trigger loading more executions
	if (index === props.executions.length - 1 && !props.loading && !props.loadingMore) {
		const cardElement = currentWorkflowExecutionsCardRefs.value[id]?.$el;
		observeForLoadMore(cardElement);
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
	autoScrollDeps.value.cardsMounted = false;
	autoScrollDeps.value.scroll = true;
	emit('filterUpdated', filter);
}

function onAutoRefreshChange(enabled: boolean) {
	emit('update:autoRefresh', enabled);
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
	<div :class="['executions-sidebar', $style.container]" data-test-id="executions-sidebar">
		<div :class="$style.heading">
			<N8nHeading tag="h2" size="medium" color="text-dark">
				{{ i18n.baseText('generic.executions') }}
			</N8nHeading>

			<ConcurrentExecutionsHeader
				v-if="showConcurrencyHeader"
				:running-executions-count="executionsStore.concurrentExecutionsCount"
				:concurrency-cap="settingsStore.concurrency"
				:is-cloud-deployment="settingsStore.isCloudDeployment"
				@go-to-upgrade="goToUpgrade"
			/>
			<ExecutionStopAllText :executions="props.executions" />
		</div>
		<div :class="$style.controls">
			<N8nCheckbox
				v-model="executionsStore.autoRefresh"
				data-test-id="auto-refresh-checkbox"
				:label="i18n.baseText('executionsList.autoRefresh')"
				@update:model-value="onAutoRefreshChange"
			/>
			<ExecutionsFilter
				popover-side="right"
				popover-align="start"
				@filter-changed="onFilterChanged"
			/>
		</div>
		<div
			ref="executionListRef"
			:class="$style.executionList"
			data-test-id="current-executions-list"
			@scroll="loadMore(20)"
		>
			<div v-if="loading" class="mr-l">
				<N8nLoading variant="rect" />
			</div>
			<div
				v-if="!loading && executions.length === 0"
				:class="$style.noResultsContainer"
				data-test-id="execution-list-empty"
			>
				<N8nText color="text-base" size="medium" align="center">
					{{ i18n.baseText('executionsLandingPage.noResults') }}
				</N8nText>
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
				<N8nLoading variant="p" :rows="1" />
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
	background-color: var(--color--background--light-3);
	border-right: var(--border);
	padding: var(--spacing--lg) 0 var(--spacing--lg) var(--spacing--lg);
	z-index: 1;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	position: relative;
}

.heading {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding-right: var(--spacing--md);
}

.controls {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding-top: var(--spacing--sm);
	padding-right: var(--spacing--md);
}

.executionList {
	flex: 1;
	overflow: auto;
	margin-bottom: var(--spacing--md);
	background-color: var(--color--background--light-3) !important;

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
	margin-left: calc(-1 * var(--spacing--lg));
	border-top: var(--border);
	width: 100%;

	& > div {
		width: 100%;
		background-color: var(--color--background--light-2);
		margin-top: 0 !important;
	}
}

.noResultsContainer {
	width: 100%;
	margin-top: var(--spacing--2xl);
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
