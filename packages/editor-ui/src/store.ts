import Vue from 'vue';
import Vuex from 'vuex';
import credentials from './modules/credentials';
import tags from './modules/tags';
import nodeCreator from './modules/nodeCreator';
import versions from './modules/versions';
import { IMenuItem } from 'n8n-design-system';
import { useUIStore } from './stores/ui';
import { IFakeDoor, INodeUi, IRootState } from './Interface';
import { useSettingsStore } from './stores/settings';
import { useUsersStore } from './stores/users';
import { useRootStore } from './stores/n8nRootStore';
import { useWorkflowsStore } from './stores/workflows';
import { useNDVStore } from './stores/ndv';
import { IWorkflowSettings } from 'n8n-workflow';

Vue.use(Vuex);


// Everything here is kept just to be used by front-end web hooks
// as long as we have instances that use vuex store
const modules = {
	credentials,
	tags,
	versions,
	nodeCreator,
	users: {
		namespaced: true,
		getters: { globalRoleName () { return useUsersStore().globalRoleName; } },
	},
	ui: {
		namespaced: true,
		getters: { getFakeDoorFeatures () { return useUIStore().fakeDoorFeatures; } },
	},
	settings: {
		namespaced: true,
		getters: { isUserManagementEnabled () { return useSettingsStore().isUserManagementEnabled; } },
	},
};

export const store = new Vuex.Store({
	strict: import.meta.env.NODE_ENV !== 'production',
	modules,
	mutations: {
		addSidebarMenuItems(state: IRootState, menuItems: IMenuItem[]) {
			const uiStore = useUIStore();
			const updated = uiStore.sidebarMenuItems.concat(menuItems);
			uiStore.sidebarMenuItems =  updated;
		},
		setFakeDoorFeatures(state: IRootState, fakeDoors: IFakeDoor[]): void {
			useUIStore().fakeDoorFeatures = fakeDoors;
		},
	},
	getters: {
		getFakeDoorItems(): IFakeDoor[] {
			return useUIStore().fakeDoorFeatures;
		},
		isUserManagementEnabled(): boolean {
			return useSettingsStore().isUserManagementEnabled;
		},
		n8nMetadata(): IRootState['n8nMetadata'] {
			return useRootStore().n8nMetadata;
		},
		instanceId(): string {
			return useRootStore().instanceId;
		},
		workflowId(): string {
			return useWorkflowsStore().workflowId;
		},
		workflowName(): string {
			return useWorkflowsStore().workflowName;
		},
		activeNode(): INodeUi | null {
			return useNDVStore().activeNode;
		},
		workflowSettings(): IWorkflowSettings {
			return useWorkflowsStore().workflowSettings;
		},
		activeExecutionId(): string {
			return useWorkflowsStore().activeExecutionId || '';
		},
		nodeByName: (state: IRootState) => (nodeName: string): INodeUi | null => {
			return useWorkflowsStore().getNodeByName(nodeName);
		},
		allNodes(): INodeUi[] {
			return useWorkflowsStore().allNodes;
		},
	},
});
