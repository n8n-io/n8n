import { $d as init_runtime_core_esm_bundler, Nf as init_reactivity_esm_bundler, Rd as computed, Vf as ref, Xo as useRouter, Yo as useRoute } from "./vendor-Hx42-oQF.js";
import { Bp as hasNewWorkflowQuery, Bu as useBuilderStore, GS as EnterpriseEditionFeature, Gp as disposeNDVStore, Jg as useUIStore, Jp as useNDVStore, Kd as useDocumentTitle, Lp as useWorkflowId, Mf as getSampleWorkflowByTemplateId, Mp as useCredentialsStore, Od as useWorkflowsStore, Qc as useCanvasOperations, Qd as disposeWorkflowDocumentStore, Up as withoutNewWorkflowQuery, Vd as useWorkflowExecutionStateStore, Wp as useWorkflowsListStore, Xd as createWorkflowDocumentId, Xh as injectStrict, Zd as deriveHomeProject, ay as getNewWorkflowData, bC as useRootStore, cm as useEnvironmentsStore, dC as useToast, dO as safeParseWorkflowStructure, fC as VIEWS, hC as useTelemetry, hS as WorkflowDocumentStoreKey, jN as useI18n, nf as useWorkflowDocumentStore, oc as useFoldersStore, pd as useHistoryStore, uO as WorkflowStructureValidationError, uf as useNodeTypesStore, vd as useExternalHooks, vm as useProjectsStore, yC as useSettingsStore } from "./app-D5flEmb-.js";
import { t as useExecutionDebugging } from "./useExecutionDebugging-ZPJd0V5q.js";
import { t as useAITemplatesStarterCollectionStore } from "./aiTemplatesStarterCollection.store-Cvas5hcT.js";
import { t as useReadyToRunWorkflowsStore } from "./readyToRunWorkflows.store-SbOUqm-1.js";
//#region src/features/core/folders/composables/useParentFolder.ts
function useParentFolder() {
	const foldersStore = useFoldersStore();
	const projectsStore = useProjectsStore();
	const fetchParentFolder = async (folderId) => {
		if (!folderId) return null;
		let folder = foldersStore.getCachedFolder(folderId);
		if (!folder && projectsStore.currentProjectId) {
			await foldersStore.getFolderPath(projectsStore.currentProjectId, folderId);
			folder = foldersStore.getCachedFolder(folderId);
		}
		if (!folder) return null;
		return {
			id: folder.id,
			name: folder.name,
			parentFolderId: folder.parentFolder ?? null
		};
	};
	return { fetchParentFolder };
}
//#endregion
//#region src/app/composables/useWorkflowInitialization.ts
init_reactivity_esm_bundler(), init_runtime_core_esm_bundler();
function useWorkflowInitialization(options = {}) {
	const route = useRoute();
	const router = useRouter();
	const i18n = useI18n();
	const toast = useToast();
	const documentTitle = useDocumentTitle();
	const externalHooks = useExternalHooks();
	const rootStore = useRootStore();
	const workflowsStore = useWorkflowsStore();
	const workflowsListStore = useWorkflowsListStore();
	const uiStore = useUIStore();
	const nodeTypesStore = useNodeTypesStore();
	const credentialsStore = useCredentialsStore();
	const environmentsStore = useEnvironmentsStore();
	const settingsStore = useSettingsStore();
	const projectsStore = useProjectsStore();
	const historyStore = useHistoryStore();
	const builderStore = useBuilderStore();
	const aiTemplatesStarterCollectionStore = useAITemplatesStarterCollectionStore();
	const readyToRunWorkflowsStore = useReadyToRunWorkflowsStore();
	const telemetry = useTelemetry();
	const workflowId = useWorkflowId();
	const currentWorkflowDocumentStore = injectStrict(WorkflowDocumentStoreKey);
	const DEMO_ROUTES = [VIEWS.DEMO, VIEWS.DEMO_DIFF];
	const { resetWorkspace, initializeWorkspace, fitView, openWorkflowTemplate, openWorkflowTemplateFromJSON } = useCanvasOperations();
	const { applyExecutionData } = useExecutionDebugging();
	const isLoading = ref(true);
	const initializedWorkflowId = ref();
	const { fetchParentFolder } = useParentFolder();
	function disposeCurrentWorkflowDocumentStore() {
		const workflowDocumentStore = currentWorkflowDocumentStore.value;
		if (workflowDocumentStore) {
			disposeNDVStore(useNDVStore(workflowDocumentStore.documentId));
			disposeWorkflowDocumentStore(workflowDocumentStore);
		}
		currentWorkflowDocumentStore.value = null;
	}
	const isNewWorkflowRoute = computed(() => route.query.new === "true");
	const isDemoRoute = computed(() => DEMO_ROUTES.includes(route.name));
	const isTemplateRoute = computed(() => route.name === VIEWS.TEMPLATE_IMPORT);
	const isOnboardingRoute = computed(() => route.name === VIEWS.WORKFLOW_ONBOARDING);
	const isDebugRoute = computed(() => route.name === VIEWS.EXECUTION_DEBUG);
	async function loadCredentials() {
		let options;
		if (workflowId.value && !isNewWorkflowRoute.value) options = { workflowId: workflowId.value };
		else {
			const projectId = (typeof route.query?.projectId === "string" ? route.query?.projectId : void 0) ?? projectsStore.personalProject?.id;
			if (projectId === void 0) throw new Error("Could not find projectId in the query nor could I find the personal project in the project store");
			options = { projectId };
		}
		await credentialsStore.fetchUsableCredentials(options);
	}
	/**
	* Handle template import route (VIEWS.TEMPLATE_IMPORT)
	* Returns true if template was handled, false otherwise
	*/
	async function handleTemplateImportRoute() {
		if (!isTemplateRoute.value) return false;
		const templateId = route.params.id;
		if (!templateId) return false;
		disposeCurrentWorkflowDocumentStore();
		try {
			await Promise.all([loadCredentials(), credentialsStore.fetchCredentialTypes(true)]);
		} catch (error) {
			toast.showError(error, i18n.baseText("nodeView.showError.mounted1.title"), { message: i18n.baseText("nodeView.showError.mounted1.message") + ":" });
		}
		if (route.query.fromJson === "true") {
			const workflow = getSampleWorkflowByTemplateId(templateId.toString());
			if (!workflow) {
				toast.showError(new Error(i18n.baseText("nodeView.couldntLoadWorkflow.invalidWorkflowObject")), i18n.baseText("nodeView.couldntImportWorkflow"));
				await router.replace({ name: VIEWS.NEW_WORKFLOW });
				return true;
			}
			const templateValidation = safeParseWorkflowStructure({
				nodes: workflow.nodes,
				connections: workflow.connections
			});
			if (!templateValidation.success) {
				toast.showError(new WorkflowStructureValidationError(templateValidation.issues), i18n.baseText("nodeView.showError.openWorkflow.title"), { message: i18n.baseText("openWorkflow.workflowDataInvalidError") });
				return true;
			}
			await openWorkflowTemplateFromJSON(workflow);
		} else await openWorkflowTemplate(templateId.toString());
		const currentWorkflowId = workflowId.value;
		if (currentWorkflowId) {
			const workflowDocumentId = createWorkflowDocumentId(currentWorkflowId);
			const workflowDocumentStore = useWorkflowDocumentStore(workflowDocumentId);
			currentWorkflowDocumentStore.value = workflowDocumentStore;
			documentTitle.setDocumentTitle(workflowDocumentStore.name, "IDLE");
			try {
				await projectsStore.refreshCurrentProject();
			} catch (error) {
				console.error("Failed to refresh current project during template import", { error });
			}
			if (currentWorkflowDocumentStore.value === workflowDocumentStore) {
				const { currentProject, personalProject } = projectsStore;
				workflowDocumentStore.setHomeProject(currentProject ?? personalProject ?? null);
				workflowDocumentStore.setScopes(currentProject?.scopes ?? personalProject?.scopes ?? []);
			}
		}
		return true;
	}
	/**
	* Handle debug mode route (VIEWS.EXECUTION_DEBUG)
	* Loads execution data for debugging
	*/
	async function handleDebugModeRoute() {
		if (!isDebugRoute.value) return;
		documentTitle.setDocumentTitle(currentWorkflowDocumentStore.value?.name ?? "", "DEBUG");
		const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId(workflowId.value));
		if (!executionStateStore.isInDebugMode) {
			const executionId = route.params.executionId;
			if (typeof executionId === "string") {
				await applyExecutionData(executionId);
				executionStateStore.setIsInDebugMode(true);
			}
		}
	}
	async function initializeData() {
		const isPreviewPage = settingsStore.isPreviewMode && isDemoRoute.value;
		const loadPromises = (() => {
			if (isPreviewPage) return [];
			const promises = [
				workflowsListStore.fetchActiveWorkflows(),
				credentialsStore.fetchCredentialTypes(true),
				loadCredentials()
			];
			if (settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Variables]) promises.push(environmentsStore.fetchAllVariables());
			return promises;
		})();
		if (nodeTypesStore.allNodeTypes.length === 0) loadPromises.push(nodeTypesStore.getNodeTypes());
		try {
			if (isPreviewPage) loadPromises.push(nodeTypesStore.fetchCommunityNodePreviews());
			else nodeTypesStore.fetchCommunityNodePreviews();
			await Promise.all(loadPromises);
		} catch (error) {
			toast.showError(error, i18n.baseText("nodeView.showError.mounted1.title"), { message: i18n.baseText("nodeView.showError.mounted1.message") + ":" });
		}
	}
	async function openWorkflow(data) {
		const validationResult = safeParseWorkflowStructure({
			nodes: data.nodes,
			connections: data.connections
		});
		if (!validationResult.success) toast.showError(new WorkflowStructureValidationError(validationResult.issues), i18n.baseText("nodeView.showError.openWorkflow.title"), { message: i18n.baseText("openWorkflow.workflowDataInvalidError") });
		const outgoingWorkflowId = currentWorkflowDocumentStore.value?.workflowId;
		disposeCurrentWorkflowDocumentStore();
		resetWorkspace(outgoingWorkflowId);
		if (builderStore.streaming) documentTitle.setDocumentTitle(data.name, "AI_BUILDING");
		else documentTitle.setDocumentTitle(data.name, "IDLE");
		try {
			const { workflowDocumentStore } = await initializeWorkspace(data);
			currentWorkflowDocumentStore.value = workflowDocumentStore;
		} catch (error) {
			console.error("Failed to initialize workspace for workflow", {
				workflowId: data.id,
				error
			});
			toast.showError(error, i18n.baseText("nodeView.showError.openWorkflow.title"));
			workflowsStore.setWorkflowId(data.id);
			const workflowDocumentId = createWorkflowDocumentId(data.id);
			currentWorkflowDocumentStore.value = useWorkflowDocumentStore(workflowDocumentId);
			currentWorkflowDocumentStore.value.setName(data.name);
			currentWorkflowDocumentStore.value.setHomeProject(deriveHomeProject(data));
			currentWorkflowDocumentStore.value.setScopes(data.scopes ?? []);
			return;
		}
		externalHooks.run("workflow.open", {
			workflowId: data.id,
			workflowName: data.name
		});
		fitView();
	}
	async function initializeWorkspaceForNewWorkflow() {
		const outgoingWorkflowId = currentWorkflowDocumentStore.value?.workflowId;
		disposeCurrentWorkflowDocumentStore();
		resetWorkspace(outgoingWorkflowId);
		const parentFolderId = route.query.parentFolderId;
		workflowsStore.setWorkflowId(workflowId.value);
		const workflowDocumentId = createWorkflowDocumentId(workflowId.value);
		currentWorkflowDocumentStore.value = useWorkflowDocumentStore(workflowDocumentId);
		currentWorkflowDocumentStore.value.onNameChange(({ payload }) => {
			workflowsListStore.updateWorkflowInCache(workflowId.value, { name: payload.name });
		});
		const workflowData = await getNewWorkflowData(rootStore.restApiContext, void 0, projectsStore.currentProjectId, parentFolderId);
		currentWorkflowDocumentStore.value.setName(workflowData.name);
		documentTitle.setDocumentTitle(workflowData.name, "IDLE");
		await projectsStore.refreshCurrentProject();
		const { currentProject, personalProject } = projectsStore;
		currentWorkflowDocumentStore.value.setHomeProject(currentProject ?? personalProject ?? null);
		currentWorkflowDocumentStore.value.setScopes(currentProject?.scopes ?? personalProject?.scopes ?? []);
		const parentFolder = await fetchParentFolder(parentFolderId);
		currentWorkflowDocumentStore.value?.setParentFolder(parentFolder);
		currentWorkflowDocumentStore.value.setHydrated(true);
		uiStore.nodeViewInitialized = true;
		initializedWorkflowId.value = workflowId.value;
		fitView();
	}
	async function initializeWorkspaceForExistingWorkflow(id) {
		try {
			if (hasNewWorkflowQuery(route.query)) await router.replace({
				name: route.name,
				params: route.params,
				query: withoutNewWorkflowQuery(route.query)
			});
			const workflowData = await workflowsListStore.fetchWorkflow(id);
			await openWorkflow(workflowData);
			if (workflowData.meta?.onboardingId) telemetry.track(`User opened workflow from onboarding template with ID ${workflowData.meta.onboardingId}`, { workflow_id: id });
			if (workflowData.meta?.templateId?.startsWith("035_template_onboarding")) aiTemplatesStarterCollectionStore.trackUserOpenedWorkflow(workflowData.meta.templateId.split("-").pop() ?? "");
			if (workflowData.meta?.templateId?.startsWith("37_onboarding_experiments_batch_aug11")) readyToRunWorkflowsStore.trackOpenWorkflow(workflowData.meta.templateId.split("-").pop() ?? "");
			await projectsStore.setProjectNavActiveIdByWorkflowHomeProject(workflowData.homeProject, workflowData.sharedWithProjects);
			workflowsStore.fetchLastSuccessfulExecution();
		} catch (error) {
			if (options.onLoadError) {
				options.onLoadError(error, id);
				return;
			}
			if (error.httpStatusCode === 404) return await router.replace({
				name: VIEWS.ENTITY_NOT_FOUND,
				params: { entityType: "workflow" }
			});
			if (error.httpStatusCode === 403) return await router.replace({
				name: VIEWS.ENTITY_UNAUTHORIZED,
				params: { entityType: "workflow" }
			});
			toast.showError(error, i18n.baseText("openWorkflow.workflowNotFoundError"));
			router.push({ name: VIEWS.NEW_WORKFLOW });
		} finally {
			uiStore.nodeViewInitialized = true;
			initializedWorkflowId.value = workflowId.value;
		}
	}
	async function initializeWorkflow(force = false) {
		if (uiStore.isBlankRedirect) {
			uiStore.isBlankRedirect = false;
			isLoading.value = false;
			return;
		}
		if (await handleTemplateImportRoute()) {
			isLoading.value = false;
			return;
		}
		if (!workflowId.value) {
			isLoading.value = false;
			return;
		}
		if (!force && initializedWorkflowId.value && initializedWorkflowId.value === workflowId.value) {
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
				if (!await workflowsListStore.checkWorkflowExists(workflowId.value) && route.meta?.nodeView === true) {
					await initializeWorkspaceForNewWorkflow();
					return;
				}
			}
			await initializeWorkspaceForExistingWorkflow(workflowId.value);
			await handleDebugModeRoute();
		} finally {
			isLoading.value = false;
		}
	}
	function cleanup() {
		const outgoingWorkflowId = currentWorkflowDocumentStore.value?.workflowId;
		disposeCurrentWorkflowDocumentStore();
		resetWorkspace(outgoingWorkflowId);
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
		cleanup
	};
}
//#endregion
export { useWorkflowInitialization as t };
