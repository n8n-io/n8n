import type { IUser } from '../Interface';
import { setWorkflowSharedWith } from '@/api/workflows.ee';
import { EnterpriseEditionFeature, STORES } from '@/constants';
import { useRootStore } from '@/stores/n8nRoot.store';
import { useSettingsStore } from '@/stores/settings.store';
import { defineStore } from 'pinia';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { i18n } from '@/plugins/i18n';

export const useWorkflowsEEStore = defineStore(STORES.WORKFLOWS_EE, {
	state() {
		return {};
	},
	getters: {
		getWorkflowOwnerName() {
			return (
				workflowId: string,
				fallback = i18n.baseText('workflows.shareModal.info.sharee.fallback'),
			): string => {
				const workflow = useWorkflowsStore().getWorkflowById(workflowId);
				return workflow && workflow.ownedBy && workflow.ownedBy.firstName
					? `${workflow.ownedBy.firstName} ${workflow.ownedBy.lastName} (${workflow.ownedBy.email})`
					: fallback;
			};
		},
	},
	actions: {
		setWorkflowOwnedBy(payload: { workflowId: string; ownedBy: Partial<IUser> }): void {
			const workflowsStore = useWorkflowsStore();

			workflowsStore.workflowsById[payload.workflowId] = {
				...workflowsStore.workflowsById[payload.workflowId],
				ownedBy: payload.ownedBy,
			};
			workflowsStore.workflow = {
				...workflowsStore.workflow,
				ownedBy: payload.ownedBy,
			};
		},
		setWorkflowSharedWith(payload: {
			workflowId: string;
			sharedWith: Array<Partial<IUser>>;
		}): void {
			const workflowsStore = useWorkflowsStore();

			workflowsStore.workflowsById[payload.workflowId] = {
				...workflowsStore.workflowsById[payload.workflowId],
				sharedWith: payload.sharedWith,
			};
			workflowsStore.workflow = {
				...workflowsStore.workflow,
				sharedWith: payload.sharedWith,
			};
		},
		addWorkflowSharee(payload: { workflowId: string; sharee: Partial<IUser> }): void {
			const workflowsStore = useWorkflowsStore();

			workflowsStore.workflowsById[payload.workflowId] = {
				...workflowsStore.workflowsById[payload.workflowId],
				sharedWith: (workflowsStore.workflowsById[payload.workflowId].sharedWith || []).concat([
					payload.sharee,
				]),
			};
		},
		removeWorkflowSharee(payload: { workflowId: string; sharee: Partial<IUser> }): void {
			const workflowsStore = useWorkflowsStore();

			workflowsStore.workflowsById[payload.workflowId] = {
				...workflowsStore.workflowsById[payload.workflowId],
				sharedWith: (workflowsStore.workflowsById[payload.workflowId].sharedWith || []).filter(
					(sharee) => sharee.id !== payload.sharee.id,
				),
			};
		},
		async saveWorkflowSharedWith(payload: {
			sharedWith: Array<Partial<IUser>>;
			workflowId: string;
		}): Promise<void> {
			const rootStore = useRootStore();
			const settingsStore = useSettingsStore();

			if (settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.Sharing)) {
				await setWorkflowSharedWith(rootStore.getRestApiContext, payload.workflowId, {
					shareWithIds: payload.sharedWith.map((sharee) => sharee.id as string),
				});

				this.setWorkflowSharedWith(payload);
			}
		},
	},
});

export default useWorkflowsEEStore;
