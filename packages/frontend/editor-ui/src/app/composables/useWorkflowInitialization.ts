import { ref, computed, shallowRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/app/composables/useToast';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useExternalHooks } from '@/app/composables/useExternalHooks';
import { useCanvasOperations } from '@/app/composables/useCanvasOperations';
import { useParentFolder } from '@/features/core/folders/composables/useParentFolder';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useEnvironmentsStore } from '@/features/settings/environments.ee/environments.store';
import { useExternalSecretsStore } from '@/features/integrations/externalSecrets.ee/externalSecrets.ee.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useHistoryStore } from '@/app/stores/history.store';
import { useBuilderStore } from '@/features/ai/assistant/builder.store';
import { useAITemplatesStarterCollectionStore } from '@/experiments/aiTemplatesStarterCollection/stores/aiTemplatesStarterCollection.store';
import { useReadyToRunWorkflowsStore } from '@/experiments/readyToRunWorkflows/stores/readyToRunWorkflows.store';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useExecutionDebugging } from '@/features/execution/executions/composables/useExecutionDebugging';
import { getSampleWorkflowByTemplateId } from '@/features/workflows/templates/utils/workflowSamples';
import { EnterpriseEditionFeature, VIEWS } from '@/app/constants';
import type { WorkflowState } from '@/app/composables/useWorkflowState';
import type { IWorkflowDb } from '@/Interface';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
	disposeWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';

export function useWorkflowInitialization(workflowState: WorkflowState) {
	const route = useRoute();
	const router = useRouter();
	const i18n = useI18n();
	const toast = useToast();
	const documentTitle = useDocumentTitle();
	const externalHooks = useExternalHooks();

	const workflowsStore = useWorkflowsStore();
	const workflowsListStore = useWorkflowsListStore();
	const uiStore = useUIStore();
	const nodeTypesStore = useNodeTypesStore();
	const credentialsStore = useCredentialsStore();
	const environmentsStore = useEnvironmentsStore();
	const externalSecretsStore = useExternalSecretsStore();
	const settingsStore = useSettingsStore();
	const projectsStore = useProjectsStore();
	const historyStore = useHistoryStore();
	const builderStore = useBuilderStore();
	const aiTemplatesStarterCollectionStore = useAITemplatesStarterCollectionStore();
	const readyToRunWorkflowsStore = useReadyToRunWorkflowsStore();
	const telemetry = useTelemetry();

	const {
		resetWorkspace,
		initializeWorkspace,
		fitView,
		openWorkflowTemplate,
		openWorkflowTemplateFromJSON,
	} = useCanvasOperations();
	const { fetchAndSetParentFolder } = useParentFolder();
	// Pass workflowState to useExecutionDebugging since we're in the same component
	// that provides WorkflowStateKey (WorkflowLayout), so inject won't work
	const { applyExecutionData } = useExecutionDebugging(workflowState);

	const isLoading = ref(true);
	const initializedWorkflowId = ref<string | undefined>();

	// Track the current workflow document store for cleanup and provide to children
	const currentWorkflowDocumentStore = shallowRef<ReturnType<
		typeof useWorkflowDocumentStore
	> | null>(null);

	function disposeCurrentWorkflowDocumentStore() {
		if (currentWorkflowDocumentStore.value) {
			const storeId = createWorkflowDocumentId(
				currentWorkflowDocumentStore.value.workflowId,
				currentWorkflowDocumentStore.value.workflowVersion,
			);
			disposeWorkflowDocumentStore(storeId);
			currentWorkflowDocumentStore.value = null;
		}
	}

	const workflowId = computed(() => {
		const name = route.params.name;
		return (Array.isArray(name) ? name[0] : name) ?? '';
	});

	const isNewWorkflowRoute = computed(() => route.query.new === 'true');
	const isDemoRoute = computed(() => route.name === VIEWS.DEMO);
	const isTemplateRoute = computed(() => route.name === VIEWS.TEMPLATE_IMPORT);
	const isOnboardingRoute = computed(() => route.name === VIEWS.WORKFLOW_ONBOARDING);
	const isDebugRoute = computed(() => route.name === VIEWS.EXECUTION_DEBUG);

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

	/**
	 * Handle template import route (VIEWS.TEMPLATE_IMPORT)
	 * Returns true if template was handled, false otherwise
	 */
	async function handleTemplateImportRoute(): Promise<boolean> {
		if (!isTemplateRoute.value) return false;

		const templateId = route.params.id;
		if (!templateId) return false;

		disposeCurrentWorkflowDocumentStore();

		// Load credentials and credential types for template import
		try {
			await Promise.all([loadCredentials(), credentialsStore.fetchCredentialTypes(true)]);
		} catch (error) {
			toast.showError(
				error,
				i18n.baseText('nodeView.showError.mounted1.title'),
				i18n.baseText('nodeView.showError.mounted1.message') + ':',
			);
		}

		const loadWorkflowFromJSON = route.query.fromJson === 'true';

		if (loadWorkflowFromJSON) {
			const workflow = getSampleWorkflowByTemplateId(templateId.toString());
			if (!workflow) {
				toast.showError(
					new Error(i18n.baseText('nodeView.couldntLoadWorkflow.invalidWorkflowObject')),
					i18n.baseText('nodeView.couldntImportWorkflow'),
				);
				await router.replace({ name: VIEWS.NEW_WORKFLOW });
				return true;
			}

			await openWorkflowTemplateFromJSON(workflow);
		} else {
			await openWorkflowTemplate(templateId.toString());
		}

		// Create document store for template workflow (empty tags initially)
		// The workflow ID was set during the template import
		const currentWorkflowId = workflowsStore.workflowId;
		if (currentWorkflowId) {
			const workflowDocumentId = createWorkflowDocumentId(currentWorkflowId);
			currentWorkflowDocumentStore.value = useWorkflowDocumentStore(workflowDocumentId);
		}

		return true;
	}

	/**
	 * Handle debug mode route (VIEWS.EXECUTION_DEBUG)
	 * Loads execution data for debugging
	 */
	async function handleDebugModeRoute() {
		if (!isDebugRoute.value) return;

		documentTitle.setDocumentTitle(workflowsStore.workflowName, 'DEBUG');

		if (!workflowsStore.isInDebugMode) {
			const executionId = route.params.executionId;
			if (typeof executionId === 'string') {
				await applyExecutionData(executionId);
				workflowsStore.isInDebugMode = true;
			}
		}
	}

	async function initializeData() {
		const isPreviewPage = settingsStore.isPreviewMode && isDemoRoute.value;
		const loadPromises = (() => {
			if (isPreviewPage) return [];

			const promises: Array<Promise<unknown>> = [
				workflowsListStore.fetchActiveWorkflows(),
				credentialsStore.fetchCredentialTypes(true),
				loadCredentials(),
			];

			if (settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Variables]) {
				promises.push(environmentsStore.fetchAllVariables());
			}

			if (settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.ExternalSecrets]) {
				promises.push(externalSecretsStore.fetchGlobalSecrets());
				const shouldFetchProjectSecrets =
					projectsStore.currentProjectId !== projectsStore.personalProject?.id;
				if (shouldFetchProjectSecrets && typeof projectsStore.currentProjectId === 'string') {
					promises.push(externalSecretsStore.fetchProjectSecrets(projectsStore.currentProjectId));
				}
			}

			return promises;
		})();

		if (nodeTypesStore.allNodeTypes.length === 0) {
			loadPromises.push(nodeTypesStore.getNodeTypes());
		}

		try {
			// important to load community nodes to render them correctly
			if (isPreviewPage) {
				loadPromises.push(nodeTypesStore.fetchCommunityNodePreviews());
			} else {
				//We don't need to await this as community node previews are not critical and needed only in nodes search panel
				void nodeTypesStore.fetchCommunityNodePreviews();
			}
			await Promise.all(loadPromises);
		} catch (error) {
			toast.showError(
				error,
				i18n.baseText('nodeView.showError.mounted1.title'),
				i18n.baseText('nodeView.showError.mounted1.message') + ':',
			);
		}
	}

	async function openWorkflow(data: IWorkflowDb) {
		disposeCurrentWorkflowDocumentStore();
		resetWorkspace();

		if (builderStore.streaming) {
			documentTitle.setDocumentTitle(data.name, 'AI_BUILDING');
		} else {
			documentTitle.setDocumentTitle(data.name, 'IDLE');
		}

		const { workflowDocumentStore } = await initializeWorkspace(data);
		currentWorkflowDocumentStore.value = workflowDocumentStore;

		void externalHooks.run('workflow.open', {
			workflowId: data.id,
			workflowName: data.name,
		});

		fitView();
	}

	async function initializeWorkspaceForNewWorkflow() {
		disposeCurrentWorkflowDocumentStore();
		resetWorkspace();

		const parentFolderId = route.query.parentFolderId as string | undefined;

		await workflowState.getNewWorkflowDataAndMakeShareable(
			undefined,
			projectsStore.currentProjectId,
			parentFolderId,
		);

		workflowState.setWorkflowId(workflowId.value);

		// Create document store for new workflow (empty tags)
		const workflowDocumentId = createWorkflowDocumentId(workflowId.value);
		currentWorkflowDocumentStore.value = useWorkflowDocumentStore(workflowDocumentId);

		await projectsStore.refreshCurrentProject();
		await fetchAndSetParentFolder(parentFolderId);

		uiStore.nodeViewInitialized = true;
		initializedWorkflowId.value = workflowId.value;

		fitView();
	}

	async function initializeWorkspaceForExistingWorkflow(id: string) {
		try {
			const workflowData = await workflowsListStore.fetchWorkflow(id);

			await openWorkflow(workflowData);

			if (workflowData.parentFolder) {
				workflowsStore.setParentFolder(workflowData.parentFolder);
			}

			// Track telemetry for onboarding and experiment workflows
			if (workflowData.meta?.onboardingId) {
				telemetry.track(
					`User opened workflow from onboarding template with ID ${workflowData.meta.onboardingId}`,
					{ workflow_id: id },
				);
			}

			if (workflowData.meta?.templateId?.startsWith('035_template_onboarding')) {
				aiTemplatesStarterCollectionStore.trackUserOpenedWorkflow(
					workflowData.meta.templateId.split('-').pop() ?? '',
				);
			}

			if (workflowData.meta?.templateId?.startsWith('37_onboarding_experiments_batch_aug11')) {
				readyToRunWorkflowsStore.trackOpenWorkflow(
					workflowData.meta.templateId.split('-').pop() ?? '',
				);
			}

			await projectsStore.setProjectNavActiveIdByWorkflowHomeProject(
				workflowData.homeProject,
				workflowData.sharedWithProjects,
			);
			void workflowsStore.fetchLastSuccessfulExecution();
		} catch (error) {
			if ((error as { httpStatusCode?: number }).httpStatusCode === 404) {
				return await router.replace({
					name: VIEWS.ENTITY_NOT_FOUND,
					params: { entityType: 'workflow' },
				});
			}
			if ((error as { httpStatusCode?: number }).httpStatusCode === 403) {
				return await router.replace({
					name: VIEWS.ENTITY_UNAUTHORIZED,
					params: { entityType: 'workflow' },
				});
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
		// Handle blank redirect (used by template import to prevent double initialization)
		// The flag is set by openWorkflowTemplate before navigation. We clear it here
		// when detected, ensuring WorkflowLayout doesn't interfere with template import.
		if (uiStore.isBlankRedirect) {
			uiStore.isBlankRedirect = false;
			isLoading.value = false;
			return;
		}

		// Handle template import route first - this has its own navigation flow
		// Must be checked before workflowId since template routes use route.params.id, not name
		const handledTemplate = await handleTemplateImportRoute();
		if (handledTemplate) {
			isLoading.value = false;
			return;
		}

		// Skip if no workflowId (shouldn't happen for non-template routes in WorkflowLayout)
		if (!workflowId.value) {
			isLoading.value = false;
			return;
		}

		const isAlreadyInitialized =
			!force && initializedWorkflowId.value && initializedWorkflowId.value === workflowId.value;

		if (isAlreadyInitialized) {
			// Still need to handle debug mode when navigating to debug route
			// even if the workflow is already initialized (e.g., from executions tab)
			await handleDebugModeRoute();
			isLoading.value = false;
			return;
		}

		isLoading.value = true;

		try {
			historyStore.reset();

			if (isDemoRoute.value) {
				await initializeWorkspaceForNewWorkflow();
				return;
			}

			if (isNewWorkflowRoute.value) {
				const exists = await workflowsListStore.checkWorkflowExists(workflowId.value);
				if (!exists && route.meta?.nodeView === true) {
					await initializeWorkspaceForNewWorkflow();
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

			await initializeWorkspaceForExistingWorkflow(workflowId.value);

			// Handle debug mode after workflow is loaded
			await handleDebugModeRoute();
		} finally {
			isLoading.value = false;
		}
	}

	function cleanup() {
		disposeCurrentWorkflowDocumentStore();
		resetWorkspace();
		uiStore.nodeViewInitialized = false;
	}

	return {
		isLoading,
		initializedWorkflowId,
		workflowId,
		currentWorkflowDocumentStore,
		isNewWorkflowRoute,
		isDemoRoute,
		isTemplateRoute,
		isOnboardingRoute,
		isDebugRoute,
		loadCredentials,
		initializeData,
		openWorkflow,
		initializeWorkspaceForNewWorkflow,
		initializeWorkspaceForExistingWorkflow,
		handleTemplateImportRoute,
		handleDebugModeRoute,
		initializeWorkflow,
		cleanup,
	};
}
