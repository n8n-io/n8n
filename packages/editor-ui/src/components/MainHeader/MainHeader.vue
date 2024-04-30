<script lang="ts" setup>
import { computed, onBeforeMount, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { RouteLocation, RouteLocationRaw } from 'vue-router';
import { useRoute, useRouter } from 'vue-router';
import WorkflowDetails from '@/components/MainHeader/WorkflowDetails.vue';
import TabBar from '@/components/MainHeader/TabBar.vue';
import {
	MAIN_HEADER_TABS,
	PLACEHOLDER_EMPTY_WORKFLOW_ID,
	STICKY_NODE_TYPE,
	VIEWS,
} from '@/constants';
import type { ITabBarItem, IWorkflowDb } from '@/Interface';
import { useNDVStore } from '@/stores/ndv.store';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useExecutionsStore } from '@/stores/executions.store';
import { usePushConnection } from '@/composables/usePushConnection';
import { useI18n } from '@/composables/useI18n';

const ndvStore = useNDVStore();
const uiStore = useUIStore();
const sourceControlStore = useSourceControlStore();
const workflowsStore = useWorkflowsStore();
const executionsStore = useExecutionsStore();

const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const pushConnection = usePushConnection({ router });

const activeHeaderTab = ref(MAIN_HEADER_TABS.WORKFLOW);
const workflowToReturnTo = ref('');
const executionToReturnTo = ref('');
const dirtyState = ref(false);

const tabBarItems = computed<ITabBarItem[]>(() => {
	return [
		{ value: MAIN_HEADER_TABS.WORKFLOW, label: i18n.baseText('generic.editor') },
		{ value: MAIN_HEADER_TABS.EXECUTIONS, label: i18n.baseText('generic.executions') },
	];
});

const hideMenuBar = computed<boolean>(() => {
	return Boolean(ndvStore.activeNode && ndvStore.activeNode.type !== STICKY_NODE_TYPE);
});

const workflow = computed<IWorkflowDb>(() => {
	return workflowsStore.workflow;
});

const currentWorkflowId = computed(() => {
	return route.params.name || workflowsStore.workflowId;
});

const onWorkflowPage = computed(() => {
	return route.meta && (route.meta.nodeView || route.meta.keepWorkflowAlive === true);
});

const readOnly = computed(() => {
	return sourceControlStore.preferences.branchReadOnly;
});

watch(
	() => route,
	(to, from) => {
		syncTabsWithRoute(to, from);
	},
);

onBeforeMount(() => {
	pushConnection.initialize();
});

onMounted(() => {
	dirtyState.value = uiStore.stateIsDirty;
	syncTabsWithRoute(route);
});

onBeforeUnmount(() => {
	pushConnection.terminate();
});

function syncTabsWithRoute(to: RouteLocation, from?: RouteLocation): void {
	if (
		to.name === VIEWS.EXECUTION_HOME ||
		to.name === VIEWS.WORKFLOW_EXECUTIONS ||
		to.name === VIEWS.EXECUTION_PREVIEW
	) {
		activeHeaderTab.value = MAIN_HEADER_TABS.EXECUTIONS;
	} else if (
		to.name === VIEWS.WORKFLOW ||
		to.name === VIEWS.NEW_WORKFLOW ||
		to.name === VIEWS.EXECUTION_DEBUG
	) {
		activeHeaderTab.value = MAIN_HEADER_TABS.WORKFLOW;
	}

	if (to.params.name !== 'new') {
		workflowToReturnTo.value = to.params.name as string;
	}

	if (from?.name === VIEWS.EXECUTION_PREVIEW && to.params.name === from.params.name) {
		executionToReturnTo.value = from.params.executionId as string;
	}
}

function onTabSelected(tab: MAIN_HEADER_TABS, event: MouseEvent) {
	const openInNewTab = event.ctrlKey || event.metaKey;

	switch (tab) {
		case MAIN_HEADER_TABS.WORKFLOW:
			void navigateToWorkflowView(openInNewTab);
			break;

		case MAIN_HEADER_TABS.EXECUTIONS:
			void navigateToExecutionsView(openInNewTab);
			break;

		default:
			break;
	}
}

async function navigateToWorkflowView(openInNewTab: boolean) {
	let routeToNavigateTo: RouteLocationRaw;
	if (!['', 'new', PLACEHOLDER_EMPTY_WORKFLOW_ID].includes(workflowToReturnTo.value)) {
		routeToNavigateTo = {
			name: VIEWS.WORKFLOW,
			params: { name: workflowToReturnTo.value },
		};
	} else {
		routeToNavigateTo = { name: VIEWS.NEW_WORKFLOW };
	}

	if (openInNewTab) {
		const { href } = router.resolve(routeToNavigateTo);
		window.open(href, '_blank');
	} else if (route.name !== routeToNavigateTo.name) {
		if (route.name === VIEWS.NEW_WORKFLOW) {
			uiStore.stateIsDirty = dirtyState.value;
		}
		activeHeaderTab.value = MAIN_HEADER_TABS.WORKFLOW;
		await router.push(routeToNavigateTo);
	}
}

async function navigateToExecutionsView(openInNewTab: boolean) {
	const routeWorkflowId =
		currentWorkflowId.value === PLACEHOLDER_EMPTY_WORKFLOW_ID ? 'new' : currentWorkflowId.value;
	const routeExecutionId = executionsStore.activeExecution?.id ?? executionToReturnTo.value;
	const routeToNavigateTo: RouteLocationRaw = routeExecutionId
		? {
				name: VIEWS.EXECUTION_PREVIEW,
				params: { name: routeWorkflowId, executionId: routeExecutionId },
			}
		: {
				name: VIEWS.EXECUTION_HOME,
				params: { name: routeWorkflowId },
			};

	if (openInNewTab) {
		const { href } = router.resolve(routeToNavigateTo);
		window.open(href, '_blank');
	} else if (route.name !== routeToNavigateTo.name) {
		dirtyState.value = uiStore.stateIsDirty;
		workflowToReturnTo.value = currentWorkflowId.value as string;
		activeHeaderTab.value = MAIN_HEADER_TABS.EXECUTIONS;
		await router.push(routeToNavigateTo);
	}
}
</script>

<template>
	<div>
		<div :class="{ 'main-header': true, expanded: !uiStore.sidebarMenuCollapsed }">
			<div v-show="!hideMenuBar" class="top-menu">
				<WorkflowDetails v-if="workflow?.name" :workflow="workflow" :read-only="readOnly" />
				<TabBar
					v-if="onWorkflowPage"
					:items="tabBarItems"
					:active-tab="activeHeaderTab"
					@select="onTabSelected"
				/>
			</div>
		</div>
	</div>
</template>

<style lang="scss">
.main-header {
	background-color: var(--color-background-xlight);
	height: $header-height;
	width: 100%;
	box-sizing: border-box;
	border-bottom: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);
}

.top-menu {
	position: relative;
	display: flex;
	align-items: center;
	font-size: 0.9em;
	height: $header-height;
	font-weight: 400;
	padding: 0 var(--spacing-m) 0 var(--spacing-xs);
}
</style>
