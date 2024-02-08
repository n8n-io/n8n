import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { Router } from 'vue-router';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useRootStore } from '@/stores/n8nRoot.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useSettingsStore } from '@/stores/settings.store';
import type { INodeTypeDescription } from 'n8n-workflow';
import type { INodeUi, ITemplatesWorkflowFull, IWorkflowTemplate } from '@/Interface';
import { VIEWS } from '@/constants';
import { createWorkflowFromTemplate } from '@/utils/templates/templateActions';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useTelemetry } from '@/composables/useTelemetry';
import { useCredentialSetupState } from '@/views/SetupWorkflowFromTemplateView/useCredentialSetupState';
import { tryToParseNumber } from '@/utils/typesUtils';
import { getTemplateById, getWorkflowTemplate } from '@/api/templates';
import { getFixedNodesList } from '@/utils/nodeViewUtils';

export type NodeAndType = {
	node: INodeUi;
	nodeType: INodeTypeDescription;
};

export type RequiredCredentials = {
	node: INodeUi;
	credentialName: string;
	credentialType: string;
};

export type AppCredentialCount = {
	appName: string;
	count: number;
};

export type SetupTemplatesStore = ReturnType<typeof useSetupTemplateStore>;

/**
 * Store for managing the state of the SetupWorkflowFromTemplateView
 */
export const useSetupTemplateStore = defineStore('setupTemplate', () => {
	//#region State

	const templateId = ref<string>('');
	const template = ref<ITemplatesWorkflowFull | null>(null);
	const isLoading = ref(true);
	const isSaving = ref(false);
	const currentSessionId = ref('');
	const previousSessionId = ref('');

	//#endregion State

	const nodeTypesStore = useNodeTypesStore();
	const credentialsStore = useCredentialsStore();
	const rootStore = useRootStore();
	const workflowsStore = useWorkflowsStore();
	const settingsStore = useSettingsStore();

	//#region Getters

	const templateNodes = computed(() => {
		return template.value?.workflow.nodes ?? [];
	});

	const {
		appCredentials,
		credentialOverrides,
		credentialUsages,
		credentialsByKey,
		nodesRequiringCredentialsSorted,
		numFilledCredentials,
		selectedCredentialIdByKey,
		setSelectedCredentialId,
		unsetSelectedCredential,
	} = useCredentialSetupState(templateNodes);

	//#endregion Getters

	//#region Actions

	const setTemplateId = (id: string) => {
		templateId.value = id;
	};

	const ignoredAutoFillCredentialTypes = new Set([
		'httpBasicAuth',
		'httpCustomAuth',
		'httpDigestAuth',
		'httpHeaderAuth',
		'oAuth1Api',
		'oAuth2Api',
		'httpQueryAuth',
	]);

	/**
	 * Selects initial credentials for the template. Credentials
	 * need to be loaded before this.
	 */
	const setInitialCredentialSelection = () => {
		for (const credUsage of credentialUsages.value) {
			if (ignoredAutoFillCredentialTypes.has(credUsage.credentialType)) {
				continue;
			}

			const availableCreds = credentialsStore.getCredentialsByType(credUsage.credentialType);

			if (availableCreds.length === 1) {
				selectedCredentialIdByKey.value[credUsage.key] = availableCreds[0].id;
			}
		}
	};

	/**
	 * Loads the template if it hasn't been loaded yet.
	 */
	const loadTemplateIfNeeded = async () => {
		if (!!template.value || !templateId.value) {
			return;
		}

		template.value = await fetchTemplateById(templateId.value);

		setInitialCredentialSelection();
	};

	/**
	 * Initializes the store for a specific template.
	 */
	const init = async () => {
		isLoading.value = true;
		try {
			selectedCredentialIdByKey.value = {};

			await Promise.all([
				credentialsStore.fetchAllCredentials(),
				credentialsStore.fetchCredentialTypes(false),
				nodeTypesStore.loadNodeTypesIfNotLoaded(),
				loadTemplateIfNeeded(),
			]);

			setInitialCredentialSelection();
		} finally {
			isLoading.value = false;
		}
	};

	/**
	 * Fetches the template from the server.
	 */
	const fetchTemplateById = async (id: string): Promise<ITemplatesWorkflowFull> => {
		const apiEndpoint: string = settingsStore.templatesHost;
		const versionCli: string = settingsStore.versionCli;
		const response = await getTemplateById(apiEndpoint, id, {
			'n8n-version': versionCli,
		});

		const fetchedTemplate: ITemplatesWorkflowFull = {
			...response.workflow,
			full: true,
		};

		return fetchedTemplate;
	};

	/**
	 * Skips the setup and goes directly to the workflow view.
	 */
	const skipSetup = async ({ router }: { router: Router }) => {
		const externalHooks = useExternalHooks();
		const telemetry = useTelemetry();

		telemetry.track('User closed cred setup', {
			completed: false,
			creds_filled: 0,
			creds_needed: credentialUsages.value.length,
			workflow_id: null,
		});

		// Replace the URL so back button doesn't come back to this setup view
		await router.replace({
			name: VIEWS.TEMPLATE_IMPORT,
			params: { id: templateId.value },
		});
	};

	/**
	 * Creates a workflow from the template and navigates to the workflow view.
	 */
	const createWorkflow = async (opts: { router: Router }) => {
		const { router } = opts;
		const telemetry = useTelemetry();

		if (!template.value) {
			return;
		}

		try {
			isSaving.value = true;

			const createdWorkflow = await createWorkflowFromTemplate({
				template: template.value,
				credentialOverrides: credentialOverrides.value,
				rootStore,
				workflowsStore,
				nodeTypeProvider: nodeTypesStore,
			});

			telemetry.track('User closed cred setup', {
				completed: true,
				creds_filled: numFilledCredentials.value,
				creds_needed: credentialUsages.value.length,
				workflow_id: createdWorkflow.id,
			});

			telemetry.track(
				'User inserted workflow template',
				{
					source: 'workflow',
					template_id: tryToParseNumber(templateId.value),
					wf_template_repo_session_id: currentSessionId.value,
				},
				{ withPostHog: true },
			);

			telemetry.track('User saved new workflow from template', {
				template_id: tryToParseNumber(templateId.value),
				workflow_id: createdWorkflow.id,
				wf_template_repo_session_id: currentSessionId.value,
			});

			// Replace the URL so back button doesn't come back to this setup view
			await router.replace({
				name: VIEWS.WORKFLOW,
				params: { name: createdWorkflow.id },
			});
		} finally {
			isSaving.value = false;
			template.value = null;
		}
	};

	/**
	 * Fetches the workflow template from the server.
	 */
	const fetchWorkflowTemplate = async (id: string): Promise<IWorkflowTemplate> => {
		const apiEndpoint: string = settingsStore.templatesHost;
		const versionCli: string = settingsStore.versionCli;
		return await getWorkflowTemplate(apiEndpoint, id, { 'n8n-version': versionCli });
	};

	/**
	 * Fetches the workflow template from the server and fixes the nodes list by removing credentials.
	 */
	const getFixedWorkflowTemplate = async (id: string): Promise<IWorkflowTemplate | undefined> => {
		const fetchedTemplate = await fetchWorkflowTemplate(id);
		if (fetchedTemplate?.workflow?.nodes) {
			fetchedTemplate.workflow.nodes = getFixedNodesList(fetchedTemplate.workflow.nodes);
			fetchedTemplate.workflow.nodes?.forEach((node) => {
				if (node.credentials) {
					delete node.credentials;
				}
			});
		}

		return fetchedTemplate;
	};

	/**
	 * Resets the session id.
	 */
	const resetSessionId = () => {
		previousSessionId.value = currentSessionId.value;
		currentSessionId.value = '';
	};

	/**
	 * Sets the session id if it hasn't been set yet.
	 */
	const setSessionId = () => {
		if (!currentSessionId.value) {
			currentSessionId.value = `templates-${Date.now()}`;
		}
	};

	const setTemplate = (newTemplate: ITemplatesWorkflowFull) => {
		templateId.value = newTemplate.id.toString();
		template.value = newTemplate;
	};
	//#endregion Actions

	return {
		credentialsByKey,
		isLoading,
		isSaving,
		appCredentials,
		nodesRequiringCredentialsSorted,
		template,
		credentialUsages,
		selectedCredentialIdByKey,
		credentialOverrides,
		numFilledCredentials,
		createWorkflow,
		skipSetup,
		init,
		loadTemplateIfNeeded,
		setInitialCredentialSelection,
		setTemplateId,
		setTemplate,
		setSelectedCredentialId,
		unsetSelectedCredential,
		getFixedWorkflowTemplate,
		resetSessionId,
		setSessionId,
		currentSessionId,
		previousSessionId,
	};
});
