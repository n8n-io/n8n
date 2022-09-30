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
import { MAIN_HEADER_TABS, PLACEHOLDER_EMPTY_WORKFLOW_ID, STICKY_NODE_TYPE, VIEWS, WORKFLOW_SETTINGS_MODAL_KEY } from '@/constants';
import { INodeUi, ITabBarItem } from '@/Interface';
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
					{ id: MAIN_HEADER_TABS.EXECUTIONS, label: 'Executions', disabled: this.$route.name === VIEWS.NEW_WORKFLOW },
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
				return this.$route.params.name || this.$store.getters.workflowId;
			},
			onWorkflowPage(): boolean {
				return this.$route.meta && (this.$route.meta.nodeView || this.$route.meta.keepWorkflowAlive === true);
			},
		},
		async mounted() {
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
				if (route.name === VIEWS.EXECUTIONS || route.name === VIEWS.EXECUTION_PREVIEW) {
					this.activeHeaderTab = MAIN_HEADER_TABS.EXECUTIONS;
				} else if (route.name === VIEWS.WORKFLOW) {
					this.activeHeaderTab = MAIN_HEADER_TABS.WORKFLOW;
				}
				const workflowName = route.params.name;
				if (workflowName) {
					this.workflowToReturnTo = workflowName;
				}
			},
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
						this.$router.push({ name: VIEWS.EXECUTIONS });
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
