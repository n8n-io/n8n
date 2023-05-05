import { STORES } from '@/constants';
import type { IFakeDoor, INodeUi, IRootState, NestedRecord } from '@/Interface';
import type { IMenuItem } from 'n8n-design-system';
import type { IWorkflowSettings } from 'n8n-workflow';
import { defineStore } from 'pinia';
import { useRootStore } from './n8nRootStore';
import { useNDVStore } from './ndv';
import { useSettingsStore } from './settings';
import { useUIStore } from './ui';
import { useUsersStore } from './users';
import { useWorkflowsStore } from './workflows';

export const useWebhooksStore = defineStore(STORES.WEBHOOKS, {
	getters: {
		globalRoleName(): string {
			return useUsersStore().globalRoleName;
		},
		getContextBasedTranslationKeys() {
			return useUIStore().contextBasedTranslationKeys;
		},
		getFakeDoorFeatures() {
			return useUIStore().fakeDoorFeatures;
		},
		isUserManagementEnabled() {
			return useSettingsStore().isUserManagementEnabled;
		},
		getFakeDoorItems(): IFakeDoor[] {
			return useUIStore().fakeDoorFeatures;
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
		nodeByName:
			(state: IRootState) =>
			(nodeName: string): INodeUi | null => {
				return useWorkflowsStore().getNodeByName(nodeName);
			},
		allNodes(): INodeUi[] {
			return useWorkflowsStore().allNodes;
		},
	},
	actions: {
		addSidebarMenuItems(menuItems: IMenuItem[]) {
			const uiStore = useUIStore();
			const updated = uiStore.sidebarMenuItems.concat(menuItems);
			uiStore.sidebarMenuItems = updated;
		},
		setFakeDoorFeatures(fakeDoors: IFakeDoor[]): void {
			useUIStore().fakeDoorFeatures = fakeDoors;
		},
		setContextBasedTranslationKeys(translations: NestedRecord<string>): void {
			useUIStore().contextBasedTranslationKeys = translations;
		},
	},
});
