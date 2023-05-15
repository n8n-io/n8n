<template>
	<div>
		<div :class="{ 'main-header': true, expanded: !this.uiStore.sidebarMenuCollapsed }">
			<div v-show="!hideMenuBar" class="top-menu">
				<WorkflowDetails />
				<tab-bar
					v-if="onWorkflowPage"
					:items="tabBarItems"
					:activeTab="activeHeaderTab"
					@select="onTabSelected"
				/>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';
import { pushConnection } from '@/mixins/pushConnection';
import WorkflowDetails from '@/components/MainHeader/WorkflowDetails.vue';
import TabBar from '@/components/MainHeader/TabBar.vue';
import {
	MAIN_HEADER_TABS,
	PLACEHOLDER_EMPTY_WORKFLOW_ID,
	STICKY_NODE_TYPE,
	VIEWS,
} from '@/constants';
import type { IExecutionsSummary, INodeUi, ITabBarItem } from '@/Interface';
import { workflowHelpers } from '@/mixins/workflowHelpers';
import type { Route } from 'vue-router';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui.store';
import { useNDVStore } from '@/stores/ndv.store';

export default mixins(pushConnection, workflowHelpers).extend({
	name: 'MainHeader',
	components: {
		WorkflowDetails,
		TabBar,
	},
	data() {
		return {
			activeHeaderTab: MAIN_HEADER_TABS.WORKFLOW,
			workflowToReturnTo: '',
			dirtyState: false,
		};
	},
	computed: {
		...mapStores(useNDVStore, useUIStore),
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
		activeExecution(): IExecutionsSummary {
			return this.workflowsStore.activeWorkflowExecution as IExecutionsSummary;
		},
	},
	mounted() {
		this.dirtyState = this.uiStore.stateIsDirty;
		this.syncTabsWithRoute(this.$route);
		// Initialize the push connection
		this.pushConnect();
	},
	beforeDestroy() {
		this.pushDisconnect();
	},
	watch: {
		$route(to, from) {
			this.syncTabsWithRoute(to);
		},
	},
	methods: {
		syncTabsWithRoute(route: Route): void {
			if (
				route.name === VIEWS.EXECUTION_HOME ||
				route.name === VIEWS.WORKFLOW_EXECUTIONS ||
				route.name === VIEWS.EXECUTION_PREVIEW
			) {
				this.activeHeaderTab = MAIN_HEADER_TABS.EXECUTIONS;
			} else if (route.name === VIEWS.WORKFLOW || route.name === VIEWS.NEW_WORKFLOW) {
				this.activeHeaderTab = MAIN_HEADER_TABS.WORKFLOW;
			}
			const workflowName = route.params.name;
			if (workflowName !== 'new') {
				this.workflowToReturnTo = workflowName;
			}
		},
		onTabSelected(tab: string, event: MouseEvent) {
			switch (tab) {
				case MAIN_HEADER_TABS.WORKFLOW:
					if (!['', 'new', PLACEHOLDER_EMPTY_WORKFLOW_ID].includes(this.workflowToReturnTo)) {
						if (this.$route.name !== VIEWS.WORKFLOW) {
							void this.$router.push({
								name: VIEWS.WORKFLOW,
								params: { name: this.workflowToReturnTo },
							});
						}
					} else {
						if (this.$route.name !== VIEWS.NEW_WORKFLOW) {
							void this.$router.push({ name: VIEWS.NEW_WORKFLOW });
							this.uiStore.stateIsDirty = this.dirtyState;
						}
					}
					this.activeHeaderTab = MAIN_HEADER_TABS.WORKFLOW;
					break;
				case MAIN_HEADER_TABS.EXECUTIONS:
					this.dirtyState = this.uiStore.stateIsDirty;
					this.workflowToReturnTo = this.currentWorkflow;
					const routeWorkflowId =
						this.currentWorkflow === PLACEHOLDER_EMPTY_WORKFLOW_ID ? 'new' : this.currentWorkflow;
					if (this.activeExecution) {
						this.$router
							.push({
								name: VIEWS.EXECUTION_PREVIEW,
								params: { name: routeWorkflowId, executionId: this.activeExecution.id },
							})
							.catch(() => {});
					} else {
						void this.$router.push({
							name: VIEWS.EXECUTION_HOME,
							params: { name: routeWorkflowId },
						});
					}
					// this.modalBus.emit('closeAll');
					this.activeHeaderTab = MAIN_HEADER_TABS.EXECUTIONS;
					break;
				default:
					break;
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
	display: flex;
	align-items: center;
	font-size: 0.9em;
	height: $header-height;
	font-weight: 400;
	padding: 0 var(--spacing-m) 0 var(--spacing-xs);
}
</style>
