import * as workflowsApi from '@/app/api/workflows.ee';
import { EnterpriseEditionFeature } from '@/app/constants';
import { STORES } from '@n8n/stores';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@/app/stores/settings.store';
import { defineStore } from 'pinia';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { i18n } from '@n8n/i18n';
import type { ProjectSharingData } from '@/features/collaboration/projects/projects.types';
import { splitName } from '@/features/collaboration/projects/projects.utils';
import { computed } from 'vue';

export const useWorkflowsEEStore = defineStore(STORES.WORKFLOWS_EE, () => {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();
	const workflowStore = useWorkflowsStore();

	const getWorkflowOwnerName = computed(() => {
		return (
			workflowId: string,
			fallback = i18n.baseText('workflows.shareModal.info.sharee.fallback'),
		): string => {
			const workflow = workflowStore.getWorkflowById(workflowId);
			const { name, email } = splitName(workflow?.homeProject?.name ?? '');
			const trimmedName = name?.replace(/\s+/g, ' ')?.trim();
			return trimmedName
				? email
					? `${trimmedName} (${email})`
					: trimmedName
				: (email ?? fallback);
		};
	});

	const setWorkflowSharedWith = (payload: {
		workflowId: string;
		sharedWithProjects: ProjectSharingData[];
	}) => {
		const workflowsStore = useWorkflowsStore();
		const existingDocument = workflowsStore.workflowDocumentById[payload.workflowId];
		if (existingDocument) {
			workflowsStore.workflowDocumentById[payload.workflowId] = {
				...existingDocument,
				sharedWithProjects: payload.sharedWithProjects,
			};
		}
	};

	const saveWorkflowSharedWith = async (payload: {
		sharedWithProjects: ProjectSharingData[];
		workflowId: string;
	}) => {
		if (settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Sharing]) {
			await workflowsApi.setWorkflowSharedWith(rootStore.restApiContext, payload.workflowId, {
				shareWithIds: payload.sharedWithProjects.map((p) => p.id),
			});
			setWorkflowSharedWith(payload);
		}
	};

	return {
		getWorkflowOwnerName,
		setWorkflowSharedWith,
		saveWorkflowSharedWith,
	};
});
