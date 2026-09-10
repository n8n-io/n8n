import { hasInjectionContext, inject } from 'vue';
import * as workflowsApi from '@/app/api/workflows';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useWorkflowId } from '@/app/composables/useWorkflowId';
import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
	type WorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useParentFolder } from '@/features/core/folders/composables/useParentFolder';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useRootStore } from '@n8n/stores/useRootStore';

/**
 * Populates a freshly created workflow document store with everything the
 * editor derives state from: name, home project, scopes, parent folder,
 * hydration, and the name → list cache sync.
 *
 * The new-workflow path and the template import path must both run this, so
 * a side effect added here reaches both. ADO-5844 came from the template
 * path hand-copying only part of this list.
 */
export function useNewWorkflowDocument() {
	const documentTitle = useDocumentTitle();
	const rootStore = useRootStore();
	const uiStore = useUIStore();
	const workflowsListStore = useWorkflowsListStore();
	const projectsStore = useProjectsStore();
	const workflowId = useWorkflowId();
	const { fetchParentFolder } = useParentFolder();
	// The app-level writable ref (provided by App.vue). Layouts gate rendering
	// on it, so it must point at the store this initialization creates.
	const currentWorkflowDocumentStore = hasInjectionContext()
		? inject(WorkflowDocumentStoreKey, null)
		: null;

	async function initializeNewWorkflowDocument({
		name,
		parentFolderId,
	}: { name?: string; parentFolderId?: string } = {}): Promise<WorkflowDocumentStore> {
		const workflowDocumentStore = useWorkflowDocumentStore(
			createWorkflowDocumentId(workflowId.value),
		);
		if (currentWorkflowDocumentStore) {
			currentWorkflowDocumentStore.value = workflowDocumentStore;
		}

		// Sync document store name → list cache (mirrors initializeWorkflowDocument)
		workflowDocumentStore.onNameChange(({ payload }) => {
			workflowsListStore.updateWorkflowInCache(workflowId.value, { name: payload.name });
		});

		const workflowData = await workflowsApi.getNewWorkflowData(
			rootStore.restApiContext,
			name,
			projectsStore.currentProjectId,
			parentFolderId,
		);
		workflowDocumentStore.setName(workflowData.name);
		documentTitle.setDocumentTitle(workflowData.name, 'IDLE');

		try {
			await projectsStore.refreshCurrentProject();
		} catch (error) {
			// A stale project is recoverable; a rejection here would strand the
			// caller's loading state.
			console.error('Failed to refresh current project for a new workflow document', { error });
		}

		// Navigation during the async work can dispose or replace the store.
		// Only populate the store this call created.
		if (
			currentWorkflowDocumentStore &&
			currentWorkflowDocumentStore.value !== workflowDocumentStore
		) {
			return workflowDocumentStore;
		}

		const { currentProject, personalProject } = projectsStore;
		// Must read the project after the refresh: a `?projectId=` deep link isn't fetched
		// into the store until then, so an earlier read stamps personal as the owner.
		workflowDocumentStore.setHomeProject(currentProject ?? personalProject ?? null);
		workflowDocumentStore.setScopes(currentProject?.scopes ?? personalProject?.scopes ?? []);

		const parentFolder = await fetchParentFolder(parentFolderId);
		workflowDocumentStore.setParentFolder(parentFolder);
		workflowDocumentStore.setHydrated(true);

		uiStore.nodeViewInitialized = true;

		return workflowDocumentStore;
	}

	return { initializeNewWorkflowDocument };
}
