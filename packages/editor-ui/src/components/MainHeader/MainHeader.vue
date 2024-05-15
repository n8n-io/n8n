<template>
	<div>
		<div :class="{ 'main-header': true, expanded: !uiStore.sidebarMenuCollapsed }">
			<div v-show="!hideMenuBar" class="top-menu">
				<WorkflowDetails v-if="workflow?.name" :workflow="workflow" :read-only="readOnly" />
				<TabBar
					v-if="onWorkflowPage"
					:items="tabBarItems"
					:model-value="activeHeaderTab"
					@update:model-value="onTabSelected"
				/>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { RouteLocation, RouteLocationRaw } from 'vue-router';
import { useRouter } from 'vue-router';
import { mapStores } from 'pinia';
import WorkflowDetails from '@/components/MainHeader/WorkflowDetails.vue';
import TabBar from '@/components/MainHeader/TabBar.vue';
import {
	MAIN_HEADER_TABS,
	PLACEHOLDER_EMPTY_WORKFLOW_ID,
	STICKY_NODE_TYPE,
	VIEWS,
} from '@/constants';
import type { INodeUi, ITabBarItem, IWorkflowDb } from '@/Interface';
import { useNDVStore } from '@/stores/ndv.store';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useExecutionsStore } from '@/stores/executions.store';
import { usePushConnection } from '@/composables/usePushConnection';

export default defineComponent({
	name: 'MainHeader',
	components: {
		WorkflowDetails,
		TabBar,
	},
	setup() {
		const router = useRouter();
		const pushConnection = usePushConnection({ router });

		return {
			pushConnection,
		};
	},
	data() {
		return {
			activeHeaderTab: MAIN_HEADER_TABS.WORKFLOW,
			workflowToReturnTo: '',
			executionToReturnTo: '',
			dirtyState: false,
		};
	},
	computed: {
		...mapStores(
			useNDVStore,
			useUIStore,
			useSourceControlStore,
			useWorkflowsStore,
			useExecutionsStore,
		),
		tabBarItems(): ITabBarItem[] {
			return [
				{ value: MAIN_HEADER_TABS.WORKFLOW, label: this.$locale.baseText('generic.editor') },
				{ value: MAIN_HEADER_TABS.EXECUTIONS, label: this.$locale.baseText('generic.executions') },
			];
		},
		activeNode(): INodeUi | null {
			return this.ndvStore.activeNode;
		},
		hideMenuBar(): boolean {
			return Boolean(this.activeNode && this.activeNode.type !== STICKY_NODE_TYPE);
		},
		workflow(): IWorkflowDb {
			return this.workflowsStore.workflow;
		},
		workflowName(): string {
			return this.workflowsStore.workflowName;
		},
		currentWorkflow(): string {
			return this.$route.params.name || this.workflowsStore.workflowId;
		},
		onWorkflowPage(): boolean {
			return (
				this.$route.meta &&
				(this.$route.meta.nodeView || this.$route.meta.keepWorkflowAlive === true)
			);
		},
		readOnly(): boolean {
			return this.sourceControlStore.preferences.branchReadOnly;
		},
	},
	watch: {
		$route(to, from) {
			this.syncTabsWithRoute(to, from);
		},
	},
	beforeMount() {
		this.pushConnection.initialize();
	},
	mounted() {
		this.dirtyState = this.uiStore.stateIsDirty;
		this.syncTabsWithRoute(this.$route);
	},
	beforeUnmount() {
		this.pushConnection.terminate();
	},
	methods: {
		syncTabsWithRoute(to: RouteLocation, from?: RouteLocation): void {
			if (
				to.name === VIEWS.EXECUTION_HOME ||
				to.name === VIEWS.WORKFLOW_EXECUTIONS ||
				to.name === VIEWS.EXECUTION_PREVIEW
			) {
				this.activeHeaderTab = MAIN_HEADER_TABS.EXECUTIONS;
			} else if (
				to.name === VIEWS.WORKFLOW ||
				to.name === VIEWS.NEW_WORKFLOW ||
				to.name === VIEWS.EXECUTION_DEBUG
			) {
				this.activeHeaderTab = MAIN_HEADER_TABS.WORKFLOW;
			}

			if (to.params.name !== 'new') {
				this.workflowToReturnTo = to.params.name;
			}

			if (from?.name === VIEWS.EXECUTION_PREVIEW && to.params.name === from.params.name) {
				this.executionToReturnTo = from.params.executionId;
			}
		},
		onTabSelected(tab: MAIN_HEADER_TABS, event: MouseEvent) {
			const openInNewTab = event.ctrlKey || event.metaKey;

			switch (tab) {
				case MAIN_HEADER_TABS.WORKFLOW:
					void this.navigateToWorkflowView(openInNewTab);
					break;

				case MAIN_HEADER_TABS.EXECUTIONS:
					void this.navigateToExecutionsView(openInNewTab);
					break;

				default:
					break;
			}
		},

		async navigateToWorkflowView(openInNewTab: boolean) {
			let routeToNavigateTo: RouteLocationRaw;
			if (!['', 'new', PLACEHOLDER_EMPTY_WORKFLOW_ID].includes(this.workflowToReturnTo)) {
				routeToNavigateTo = {
					name: VIEWS.WORKFLOW,
					params: { name: this.workflowToReturnTo },
				};
			} else {
				routeToNavigateTo = { name: VIEWS.NEW_WORKFLOW };
			}

			if (openInNewTab) {
				const { href } = this.$router.resolve(routeToNavigateTo);
				window.open(href, '_blank');
			} else if (this.$route.name !== routeToNavigateTo.name) {
				if (this.$route.name === VIEWS.NEW_WORKFLOW) {
					this.uiStore.stateIsDirty = this.dirtyState;
				}
				this.activeHeaderTab = MAIN_HEADER_TABS.WORKFLOW;
				await this.$router.push(routeToNavigateTo);
			}
		},

		async navigateToExecutionsView(openInNewTab: boolean) {
			const routeWorkflowId =
				this.currentWorkflow === PLACEHOLDER_EMPTY_WORKFLOW_ID ? 'new' : this.currentWorkflow;
			const executionToReturnTo =
				this.executionsStore.activeExecution?.id || this.executionToReturnTo;
			const routeToNavigateTo: RouteLocationRaw = executionToReturnTo
				? {
						name: VIEWS.EXECUTION_PREVIEW,
						params: { name: routeWorkflowId, executionId: executionToReturnTo },
					}
				: {
						name: VIEWS.EXECUTION_HOME,
						params: { name: routeWorkflowId },
					};

			if (openInNewTab) {
				const { href } = this.$router.resolve(routeToNavigateTo);
				window.open(href, '_blank');
			} else if (this.$route.name !== routeToNavigateTo.name) {
				this.dirtyState = this.uiStore.stateIsDirty;
				this.workflowToReturnTo = this.currentWorkflow;
				this.activeHeaderTab = MAIN_HEADER_TABS.EXECUTIONS;
				await this.$router.push(routeToNavigateTo);
			}
		},
	},
});
</script>

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
