import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { Router } from 'vue-router';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useTemplatesStore } from '@/features/templates/templates.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { INodeTypeDescription } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import { VIEWS } from '@/constants';
import { createWorkflowFromTemplate } from './utils/templateActions';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useTelemetry } from '@/composables/useTelemetry';
import { useCredentialSetupState } from './composables/useCredentialSetupState';
import { tryToParseNumber } from '@/utils/typesUtils';

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

/**
 * Store for managing the state of the SetupWorkflowFromTemplateView
 */
export const useSetupTemplateStore = defineStore('setupTemplate', () => {
	//#region State

	const templateId = ref<string>('');
	const isLoading = ref(true);
	const isSaving = ref(false);

	//#endregion State

	const templatesStore = useTemplatesStore();
	const nodeTypesStore = useNodeTypesStore();
	const credentialsStore = useCredentialsStore();
	const rootStore = useRootStore();
	const workflowsStore = useWorkflowsStore();

	//#region Getters

	const template = computed(() => {
		return templateId.value ? templatesStore.getFullTemplateById(templateId.value) : null;
	});

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

		await templatesStore.fetchTemplateById(templateId.value);

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
	 * Skips the setup and goes directly to the workflow view.
	 */
	const skipSetup = async ({ router }: { router: Router }) => {
		const externalHooks = useExternalHooks();
		const telemetry = useTelemetry();

		await externalHooks.run('templatesWorkflowView.openWorkflow', {
			source: 'workflow',
			template_id: templateId.value,
			wf_template_repo_session_id: templatesStore.currentSessionId,
		});

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

			telemetry.track('User inserted workflow template', {
				source: 'workflow',
				template_id: tryToParseNumber(templateId.value),
				wf_template_repo_session_id: templatesStore.currentSessionId,
			});

			telemetry.track('User saved new workflow from template', {
				template_id: tryToParseNumber(templateId.value),
				workflow_id: createdWorkflow.id,
				wf_template_repo_session_id: templatesStore.currentSessionId,
			});

			// Replace the URL so back button doesn't come back to this setup view
			await router.replace({
				name: VIEWS.WORKFLOW,
				params: { name: createdWorkflow.id },
			});
		} finally {
			isSaving.value = false;
		}
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
		setSelectedCredentialId,
		unsetSelectedCredential,
	};
});
