import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/app/composables/useToast';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useExternalHooks } from '@/app/composables/useExternalHooks';
import { useCanvasOperations } from '@/app/composables/useCanvasOperations';
import type { WorkflowState } from '@/app/composables/useWorkflowState';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useEnvironmentsStore } from '@/features/settings/environments.ee/environments.store';
import { useExternalSecretsStore } from '@/features/integrations/externalSecrets.ee/externalSecrets.ee.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useHistoryStore } from '@/app/stores/history.store';
import { useBuilderStore } from '@/features/ai/assistant/builder.store';
import { useParentFolder } from '@/features/core/folders/composables/useParentFolder';
import { EnterpriseEditionFeature, VIEWS } from '@/app/constants';

export function useWorkflowInitialization(workflowState: WorkflowState) {
	const route = useRoute();
	const router = useRouter();
	const i18n = useI18n();
	const toast = useToast();
	const documentTitle = useDocumentTitle();
	const externalHooks = useExternalHooks();

	const workflowsStore = useWorkflowsStore();
	const uiStore = useUIStore();
	const nodeTypesStore = useNodeTypesStore();
	const credentialsStore = useCredentialsStore();
	const environmentsStore = useEnvironmentsStore();
	const externalSecretsStore = useExternalSecretsStore();
	const settingsStore = useSettingsStore();
	const projectsStore = useProjectsStore();
	const historyStore = useHistoryStore();
	const builderStore = useBuilderStore();

	const { resetWorkspace, initializeWorkspace, fitView } = useCanvasOperations();
	const { fetchAndSetParentFolder } = useParentFolder();

	const isLoading = ref(true);
	const initializedWorkflowId = ref<string | undefined>();

	const workflowId = computed(() => {
		const name = route.params.name;
		const id = route.params.id;
		const param = name ?? id;
		return Array.isArray(param) ? param[0] : (param as string | undefined);
	});

	const isNewWorkflowRoute = computed(() => route.query.new === 'true');
	const isDemoRoute = computed(() => route.name === VIEWS.DEMO);
	const isTemplateRoute = computed(() => route.name === VIEWS.TEMPLATE_IMPORT);
	const isOnboardingRoute = computed(() => route.name === VIEWS.WORKFLOW_ONBOARDING);

	async function loadCredentials() {
		let options: { workflowId: string } | { projectId: string };

		if (workflowId.value && !isNewWorkflowRoute.value) {
			options = { workflowId: workflowId.value };
		} else {
			const queryParam =
				typeof route.query?.projectId === 'string' ? route.query?.projectId : undefined;
			const projectId = queryParam ?? projectsStore.personalProject?.id;
			if (projectId === undefined) {
				throw new Error(
					'Could not find projectId in the query nor could I find the personal project in the project store',
				);
			}

			options = { projectId };
		}

		await credentialsStore.fetchAllCredentialsForWorkflow(options);
	}

	async function initializeData() {
		const loadPromises = (() => {
			if (settingsStore.isPreviewMode && isDemoRoute.value) return [];

			const promises: Array<Promise<unknown>> = [
				workflowsStore.fetchActiveWorkflows(),
				credentialsStore.fetchCredentialTypes(true),
				loadCredentials(),
			];

			if (settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Variables]) {
				promises.push(environmentsStore.fetchAllVariables());
			}

			if (settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.ExternalSecrets]) {
				promises.push(externalSecretsStore.fetchAllSecrets());
			}

			return promises;
		})();

		if (nodeTypesStore.allNodeTypes.length === 0) {
			loadPromises.push(nodeTypesStore.getNodeTypes());
		}

		try {
			await Promise.all(loadPromises);
			// We don't need to await this as community node previews are not critical and needed only in nodes search panel
			void nodeTypesStore.fetchCommunityNodePreviews();
		} catch (error) {
			toast.showError(
				error,
				i18n.baseText('nodeView.showError.mounted1.title'),
				i18n.baseText('nodeView.showError.mounted1.message') + ':',
			);
		}
	}

	async function openWorkflow(data: Parameters<typeof initializeWorkspace>[0]) {
		resetWorkspace();

		// Show AI_BUILDING status if builder is actively streaming, otherwise IDLE
		if (builderStore.streaming) {
			documentTitle.setDocumentTitle(data.name, 'AI_BUILDING');
		} else {
			documentTitle.setDocumentTitle(data.name, 'IDLE');
		}

		await initializeWorkspace(data);

		void externalHooks.run('workflow.open', {
			workflowId: data.id,
			workflowName: data.name,
		});

		fitView();
	}

	async function initializeWorkspaceForNewWorkflow() {
		resetWorkspace();

		const parentFolderId = route.query.parentFolderId as string | undefined;

		await workflowState.getNewWorkflowDataAndMakeShareable(
			undefined,
			projectsStore.currentProjectId,
			parentFolderId,
		);

		// Set the workflow ID from the route params (auto-generated by router)
		workflowState.setWorkflowId(workflowId.value ?? '');

		await projectsStore.refreshCurrentProject();
		await fetchAndSetParentFolder(parentFolderId);

		uiStore.nodeViewInitialized = true;
		initializedWorkflowId.value = workflowId.value;

		fitView();
	}

	async function initializeWorkspaceForExistingWorkflow(id: string) {
		try {
			const workflowData = await workflowsStore.fetchWorkflow(id);

			await openWorkflow(workflowData);

			if (workflowData.parentFolder) {
				workflowsStore.setParentFolder(workflowData.parentFolder);
			}

			await projectsStore.setProjectNavActiveIdByWorkflowHomeProject(
				workflowData.homeProject,
				workflowData.sharedWithProjects,
			);

			void workflowsStore.fetchLastSuccessfulExecution();
		} catch (error) {
			if ((error as { httpStatusCode?: number }).httpStatusCode === 404) {
				await router.replace({
					name: VIEWS.ENTITY_NOT_FOUND,
					params: { entityType: 'workflow' },
				});
				return;
			}
			if ((error as { httpStatusCode?: number }).httpStatusCode === 403) {
				await router.replace({
					name: VIEWS.ENTITY_UNAUTHORIZED,
					params: { entityType: 'workflow' },
				});
				return;
			}

			toast.showError(error, i18n.baseText('openWorkflow.workflowNotFoundError'));
			void router.push({
				name: VIEWS.NEW_WORKFLOW,
			});
		} finally {
			uiStore.nodeViewInitialized = true;
			initializedWorkflowId.value = workflowId.value;
		}
	}

	async function initializeWorkflow(force = false) {
		const id = workflowId.value;
		const isAlreadyInitialized =
			!force && initializedWorkflowId.value && initializedWorkflowId.value === id;

		// Skip initialization for template and onboarding routes - they handle their own initialization
		if (isTemplateRoute.value || isOnboardingRoute.value) {
			isLoading.value = false;
			return;
		}

		if (isAlreadyInitialized) {
			isLoading.value = false;
			return;
		}

		historyStore.reset();

		if (isDemoRoute.value) {
			await initializeWorkspaceForNewWorkflow();
			isLoading.value = false;
			return;
		}

		// Check if we should initialize for a new workflow
		if (isNewWorkflowRoute.value && id) {
			const exists = await workflowsStore.checkWorkflowExists(id);
			if (!exists) {
				await initializeWorkspaceForNewWorkflow();
				isLoading.value = false;
				return;
			} else {
				await router.replace({
					...route,
					query: {
						...route.query,
						new: undefined,
					},
				});
			}
		}

		// Load existing workflow
		if (id) {
			await initializeWorkspaceForExistingWorkflow(id);
		}

		isLoading.value = false;
	}

	function cleanup() {
		resetWorkspace();
		uiStore.nodeViewInitialized = false;
	}

	return {
		isLoading,
		initializedWorkflowId,
		workflowId,
		isNewWorkflowRoute,
		isDemoRoute,
		isTemplateRoute,
		isOnboardingRoute,
		initializeData,
		initializeWorkflow,
		resetWorkspace,
		cleanup,
	};
}
