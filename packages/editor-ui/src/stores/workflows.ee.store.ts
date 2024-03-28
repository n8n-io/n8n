import { setWorkflowSharedWith } from '@/api/workflows.ee';
import { EnterpriseEditionFeature, STORES } from '@/constants';
import { useRootStore } from '@/stores/n8nRoot.store';
import { useSettingsStore } from '@/stores/settings.store';
import { defineStore } from 'pinia';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { i18n } from '@/plugins/i18n';
import type { ProjectSharingData } from '@/features/projects/projects.types';

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
				return workflow?.ownedBy?.firstName
					? `${workflow.ownedBy.firstName} ${workflow.ownedBy.lastName} (${workflow.ownedBy.email})`
					: fallback;
			};
		},
	},
	actions: {
		setWorkflowSharedWith(payload: {
			workflowId: string;
			sharedWithProjects: ProjectSharingData[];
		}): void {
			const workflowsStore = useWorkflowsStore();

			workflowsStore.workflowsById[payload.workflowId] = {
				...workflowsStore.workflowsById[payload.workflowId],
				sharedWithProjects: payload.sharedWithProjects,
			};
			workflowsStore.workflow = {
				...workflowsStore.workflow,
				sharedWithProjects: payload.sharedWithProjects,
			};
		},
		async saveWorkflowSharedWith(payload: {
			sharedWithProjects: ProjectSharingData[];
			workflowId: string;
		}): Promise<void> {
			const rootStore = useRootStore();
			const settingsStore = useSettingsStore();

			if (settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.Sharing)) {
				await setWorkflowSharedWith(rootStore.getRestApiContext, payload.workflowId, {
					shareWithIds: payload.sharedWithProjects.map((p) => p.id),
				});

				this.setWorkflowSharedWith(payload);
			}
		},
	},
});

export default useWorkflowsEEStore;
