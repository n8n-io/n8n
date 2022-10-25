<template>
	<div>
		<div :class="{'main-header': true, expanded: !sidebarMenuCollapsed}">
			<div v-show="!hideMenuBar" class="top-menu">
				<ExecutionDetails v-if="isExecutionPage" />
				<WorkflowDetails v-else />
				<tab-bar v-if="onWorkflowPage && !isExecutionPage" :items="tabBarItems" :activeTab="activeHeaderTab" @select="onTabSelected"/>
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
import { MAIN_HEADER_TABS, PLACEHOLDER_EMPTY_WORKFLOW_ID, STICKY_NODE_TYPE, VIEWS } from '@/constants';
import { IExecutionsSummary, INodeUi, ITabBarItem } from '@/Interface';
import { workflowHelpers } from '../mixins/workflowHelpers';
import { Route } from 'vue-router';

export default mixins(
	pushConnection,
	workflowHelpers,
).extend({
		name: 'MainHeader',
		components: {
			WorkflowDetails,
			ExecutionDetails,
			TabBar,
		},
		data() {
			return {
				activeHeaderTab: MAIN_HEADER_TABS.WORKFLOW,
				workflowToReturnTo: '',
				dirtyState: this.$store.getters.getStateIsDirty,
			};
		},
		computed: {
			...mapGetters('ui', [
				'sidebarMenuCollapsed',
			]),
			tabBarItems(): ITabBarItem[] {
				return [
					{ value: MAIN_HEADER_TABS.WORKFLOW, label: this.$locale.baseText('generic.workflow') },
					{ value: MAIN_HEADER_TABS.EXECUTIONS, label: this.$locale.baseText('generic.executions') },
				];
			},
			isExecutionPage (): boolean {
				return this.$route.name === VIEWS.EXECUTION;
			},
			activeNode (): INodeUi | null {
				return this.$store.getters['ndv/activeNode'];
			},
			hideMenuBar(): boolean {
				return Boolean(this.activeNode && this.activeNode.type !== STICKY_NODE_TYPE);
			},
			workflowName (): string {
				return this.$store.getters.workflowName;
			},
			currentWorkflow (): string {
				return this.$route.params.name || this.$store.getters.workflowId;
			},
			onWorkflowPage(): boolean {
				return this.$route.meta && (this.$route.meta.nodeView || this.$route.meta.keepWorkflowAlive === true);
			},
			activeExecution(): IExecutionsSummary {
				return this.$store.getters['workflows/getActiveWorkflowExecution'];
			},
		},
		mounted() {
			this.syncTabsWithRoute(this.$route);
			// Initialize the push connection
			this.pushConnect();
		},
		beforeDestroy() {
			this.pushDisconnect();
		},
		watch: {
			$route (to, from){
				this.syncTabsWithRoute(to);
			},
		},
		methods: {
			syncTabsWithRoute(route: Route): void {
				if (route.name === VIEWS.EXECUTION_HOME || route.name === VIEWS.EXECUTIONS || route.name === VIEWS.EXECUTION_PREVIEW) {
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
								this.$router.push({
								name: VIEWS.WORKFLOW,
								params: { name: this.workflowToReturnTo },
							});
							}
						} else {
							if (this.$route.name !== VIEWS.NEW_WORKFLOW) {
								this.$router.push({ name: VIEWS.NEW_WORKFLOW });
								this.$store.commit('setStateDirty', this.dirtyState);
							}
						}
						this.activeHeaderTab = MAIN_HEADER_TABS.WORKFLOW;
						break;
					case MAIN_HEADER_TABS.EXECUTIONS:
						this.dirtyState = this.$store.getters.getStateIsDirty;
						this.workflowToReturnTo = this.currentWorkflow;
						const routeWorkflowId = this.currentWorkflow === PLACEHOLDER_EMPTY_WORKFLOW_ID ? 'new' : this.currentWorkflow;
						if (this.activeExecution) {
							this.$router.push({
								name: VIEWS.EXECUTION_PREVIEW,
								params: { name: routeWorkflowId, executionId: this.activeExecution.id },
							}).catch(()=>{});;
						} else {
							this.$router.push({ name: VIEWS.EXECUTION_HOME, params: { name: routeWorkflowId } });
						}
						// this.modalBus.$emit('closeAll');
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
