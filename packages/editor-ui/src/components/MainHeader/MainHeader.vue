<template>
	<div>
		<div :class="{'main-header': true, expanded: !sidebarMenuCollapsed}">
			<div v-show="!hideMenuBar" class="top-menu">
				<ExecutionDetails v-if="isExecutionPage" />
				<WorkflowDetails v-else />
				<tab-bar :items="tabBarItems" :activeTab="activeHeaderTab" @select="onTabSelected"/>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';
import { mapGetters } from 'vuex';
import { pushConnection } from '@/components/mixins/pushConnection';
import WorkflowDetails from '@/components/MainHeader/WorkflowDetails.vue';
import ExecutionDetails from '@/components/MainHeader/ExecutionDetails/ExecutionDetails.vue';
import TabBar from '@/components/MainHeader/TabBar.vue';
import { EXECUTIONS_MODAL_KEY, MAIN_HEADER_TABS, STICKY_NODE_TYPE, VIEWS, WORKFLOW_SETTINGS_MODAL_KEY } from '@/constants';
import { IExecutionsCurrentSummaryExtended, IExecutionsSummary, INodeUi, ITabBarItem } from '@/Interface';
import { workflowHelpers } from '../mixins/workflowHelpers';
import { IDataObject } from 'n8n-workflow';

export default mixins(
	pushConnection,
	workflowHelpers,
)
	.extend({
		name: 'MainHeader',
		components: {
			WorkflowDetails,
			ExecutionDetails,
			TabBar,
		},
		data() {
			return {
				activeHeaderTab: 'workflow',
				executions: new Array<IExecutionsSummary>(),
			};
		},
		computed: {
			...mapGetters('ui', [
				'sidebarMenuCollapsed',
			]),
			tabBarItems(): ITabBarItem[] {
				return [
					{ id: MAIN_HEADER_TABS.WORKFLOW, label: 'Workflow' },
					{ id: MAIN_HEADER_TABS.EXECUTIONS, label: 'Executions', notifications: this.executions.length },
					{ id: MAIN_HEADER_TABS.SETTINGS, label: 'Settings', disabled:  !this.onWorkflowPage || !this.currentWorkflow },
				];
			},
			isExecutionPage (): boolean {
				return this.$route.name === VIEWS.EXECUTION;
			},
			activeNode (): INodeUi | null {
				return this.$store.getters.activeNode;
			},
			hideMenuBar(): boolean {
				return Boolean(this.activeNode && this.activeNode.type !== STICKY_NODE_TYPE);
			},
			workflowName (): string {
				return this.$store.getters.workflowName;
			},
			currentWorkflow (): string {
				return this.$route.params.name;
			},
			onWorkflowPage(): boolean {
				return this.$route.meta && this.$route.meta.nodeView;
			},
		},
		async mounted() {
			this.loadExecutions(this.currentWorkflow);
			// Initialize the push connection
			this.pushConnect();
		},
		beforeDestroy() {
			this.pushDisconnect();
		},
		watch: {
			"$route.params.name"(value) {
				if (value) {
					this.loadExecutions(value);
				} else {
					this.executions = [];
				}
			},
		},
		methods: {
			onTabSelected(tab: string, event: MouseEvent) {
				this.activeHeaderTab = tab;

				switch (tab) {
					case 'settings':
						this.$store.dispatch('ui/openModal', WORKFLOW_SETTINGS_MODAL_KEY);
						this.activeHeaderTab = 'workflow';
						break;
					case 'executions':
						this.$store.dispatch('ui/openModal', EXECUTIONS_MODAL_KEY);
						this.activeHeaderTab = 'workflow';
						break;
					default:
						break;
				}
			},
 			async loadActiveExecutions (workflowId: string): Promise<IExecutionsCurrentSummaryExtended[]> {
				const activeExecutions = await this.restApi().getCurrentExecutions({ workflowId } as IDataObject);
				for (const activeExecution of activeExecutions) {
					if (activeExecution.workflowId !== undefined && activeExecution.workflowName === undefined) {
						activeExecution.workflowName = this.workflowName;
					}
				}
				return activeExecutions;
			},
			async loadFinishedExecutions (workflowId: string): Promise<IExecutionsSummary[]> {
				const data = await this.restApi().getPastExecutions({ workflowId } as IDataObject, 10);
				return data.results;
			},
			async loadExecutions (workflowId: string): Promise<void> {
				if (!this.currentWorkflow) {
					return;
				}

				try {
					const activeExecutionsPromise = this.loadActiveExecutions(workflowId);
					const finishedExecutionsPromise = this.loadFinishedExecutions(workflowId);
					await Promise.all([activeExecutionsPromise, finishedExecutionsPromise]).then((results) => {
						this.executions = [...results[0], ...results[1]];
					});
				} catch (error) {
					this.$showError(
						error,
						this.$locale.baseText('executionsList.showError.refreshData.title'),
					);
				}
			},
		},
	});
</script>

<style lang="scss">
.main-header {
	background-color: var(--color-background-xlight);
	height: 65px;
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
	padding: 0 20px;
}
</style>
