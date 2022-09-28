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
import { MAIN_HEADER_TABS, PLACEHOLDER_EMPTY_WORKFLOW_ID, STICKY_NODE_TYPE, VIEWS, WORKFLOW_SETTINGS_MODAL_KEY } from '@/constants';
import { IExecutionsSummary, INodeUi, ITabBarItem } from '@/Interface';
import { workflowHelpers } from '../mixins/workflowHelpers';

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
				workflowToReturnTo: '',
			};
		},
		computed: {
			...mapGetters('ui', [
				'sidebarMenuCollapsed',
			]),
			tabBarItems(): ITabBarItem[] {
				return [
					{ id: MAIN_HEADER_TABS.WORKFLOW, label: 'Workflow' },
					{ id: MAIN_HEADER_TABS.EXECUTIONS, label: 'Executions', notifications: this.currentWorkflow ? this.executions.length : 0 },
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
			executions(): IExecutionsSummary[] {
				return this.$store.getters.currentWorkflowExecutions;
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
					if (value !== PLACEHOLDER_EMPTY_WORKFLOW_ID) {
						this.workflowToReturnTo = value;
					}
				}
			},
		},
		methods: {
			onTabSelected(tab: string, event: MouseEvent) {
				switch (tab) {
					case MAIN_HEADER_TABS.WORKFLOW:
						if (this.workflowToReturnTo !== '' && this.workflowToReturnTo !== PLACEHOLDER_EMPTY_WORKFLOW_ID) {
							this.$router.push({
								name: VIEWS.WORKFLOW,
								params: { name: this.workflowToReturnTo },
							});
						} else {
							this.$router.push({ name: VIEWS.NEW_WORKFLOW });
						}
						this.activeHeaderTab = MAIN_HEADER_TABS.WORKFLOW;
						break;
					case MAIN_HEADER_TABS.EXECUTIONS:
						this.workflowToReturnTo = this.currentWorkflow;
						this.$router.push({
							name: VIEWS.EXECUTIONS,
						});
						// this.modalBus.$emit('closeAll');
						this.activeHeaderTab = MAIN_HEADER_TABS.EXECUTIONS;
						break;
					case MAIN_HEADER_TABS.SETTINGS:
						this.$store.dispatch('ui/openModal', WORKFLOW_SETTINGS_MODAL_KEY);
						this.activeHeaderTab = MAIN_HEADER_TABS.WORKFLOW;
						break;
					default:
						break;
				}
			},
			async loadExecutions (workflowId: string): Promise<void> {
				if (!this.currentWorkflow) {
					return;
				}
				try {
					await this.$store.dispatch('loadCurrentWorkflowActions', workflowId);
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
