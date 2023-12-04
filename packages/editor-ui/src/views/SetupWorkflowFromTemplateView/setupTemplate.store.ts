import sortBy from 'lodash-es/sortBy';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { Router } from 'vue-router';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useRootStore } from '@/stores/n8nRoot.store';
import { useTemplatesStore } from '@/stores/templates.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { getAppNameFromNodeName } from '@/utils/nodeTypesUtils';
import type { INodeCredentialsDetails, INodeTypeDescription } from 'n8n-workflow';
import type {
	ICredentialsResponse,
	IExternalHooks,
	INodeUi,
	ITemplatesWorkflowFull,
	IWorkflowTemplateNode,
} from '@/Interface';
import type { Telemetry } from '@/plugins/telemetry';
import { VIEWS } from '@/constants';
import { createWorkflowFromTemplate } from '@/utils/templates/templateActions';
import type {
	TemplateCredentialKey,
	IWorkflowTemplateNodeWithCredentials,
} from '@/utils/templates/templateTransforms';
import {
	hasNodeCredentials,
	keyFromCredentialTypeAndName,
	normalizeTemplateNodeCredentials,
} from '@/utils/templates/templateTransforms';

export type NodeAndType = {
	node: INodeUi;
	nodeType: INodeTypeDescription;
};

export type RequiredCredentials = {
	node: INodeUi;
	credentialName: string;
	credentialType: string;
};

export type CredentialUsages = {
	/**
	 * Key is a combination of the credential name and the credential type name,
	 * e.g. "twitter-twitterOAuth1Api"
	 */
	key: TemplateCredentialKey;
	credentialName: string;
	credentialType: string;
	nodeTypeName: string;
	usedBy: IWorkflowTemplateNode[];
};

export type AppCredentials = {
	appName: string;
	credentials: CredentialUsages[];
};

export type AppCredentialCount = {
	appName: string;
	count: number;
};

//#region Getter functions

export const getNodesRequiringCredentials = (
	template: ITemplatesWorkflowFull,
): IWorkflowTemplateNodeWithCredentials[] => {
	if (!template) {
		return [];
	}

	return template.workflow.nodes.filter(hasNodeCredentials);
};

export const groupNodeCredentialsByKey = (nodes: IWorkflowTemplateNodeWithCredentials[]) => {
	const credentialsByTypeName = new Map<TemplateCredentialKey, CredentialUsages>();

	for (const node of nodes) {
		const normalizedCreds = normalizeTemplateNodeCredentials(node.credentials);
		for (const credentialType in normalizedCreds) {
			const credentialName = normalizedCreds[credentialType];
			const key = keyFromCredentialTypeAndName(credentialType, credentialName);

			let credentialUsages = credentialsByTypeName.get(key);
			if (!credentialUsages) {
				credentialUsages = {
					key,
					nodeTypeName: node.type,
					credentialName,
					credentialType,
					usedBy: [],
				};
				credentialsByTypeName.set(key, credentialUsages);
			}

			credentialUsages.usedBy.push(node);
		}
	}

	return credentialsByTypeName;
};

export const getAppCredentials = (
	credentialUsages: CredentialUsages[],
	getAppNameByNodeType: (nodeTypeName: string, version?: number) => string,
) => {
	const credentialsByAppName = new Map<string, AppCredentials>();

	for (const credentialUsage of credentialUsages) {
		const nodeTypeName = credentialUsage.nodeTypeName;

		const appName = getAppNameByNodeType(nodeTypeName) ?? nodeTypeName;
		const appCredentials = credentialsByAppName.get(appName);
		if (appCredentials) {
			appCredentials.credentials.push(credentialUsage);
		} else {
			credentialsByAppName.set(appName, {
				appName,
				credentials: [credentialUsage],
			});
		}
	}

	return Array.from(credentialsByAppName.values());
};

export const getAppsRequiringCredentials = (
	credentialUsagesByName: Map<string, CredentialUsages>,
	getAppNameByNodeType: (nodeTypeName: string, version?: number) => string,
) => {
	const credentialsByAppName = new Map<string, AppCredentialCount>();

	for (const credentialUsage of credentialUsagesByName.values()) {
		const node = credentialUsage.usedBy[0];

		const appName = getAppNameByNodeType(node.type, node.typeVersion) ?? node.type;
		const appCredentials = credentialsByAppName.get(appName);
		if (appCredentials) {
			appCredentials.count++;
		} else {
			credentialsByAppName.set(appName, {
				appName,
				count: 1,
			});
		}
	}

	return Array.from(credentialsByAppName.values());
};

//#endregion Getter functions

/**
 * Store for managing the state of the SetupWorkflowFromTemplateView
 */
export const useSetupTemplateStore = defineStore('setupTemplate', () => {
	//#region State
	const templateId = ref<string>('');
	const isLoading = ref(true);
	const isSaving = ref(false);

	/**
	 * Credentials user has selected from the UI. Map from credential
	 * name in the template to the credential ID.
	 */
	const selectedCredentialIdByKey = ref<
		Record<CredentialUsages['key'], ICredentialsResponse['id']>
	>({});

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

	const nodesRequiringCredentialsSorted = computed(() => {
		const credentials = template.value ? getNodesRequiringCredentials(template.value) : [];

		// Order by the X coordinate of the node
		return sortBy(credentials, ({ position }) => position[0]);
	});

	const appNameByNodeType = (nodeTypeName: string, version?: number) => {
		const nodeType = nodeTypesStore.getNodeType(nodeTypeName, version);

		return nodeType ? getAppNameFromNodeName(nodeType.displayName) : nodeTypeName;
	};

	const credentialsByKey = computed(() => {
		return groupNodeCredentialsByKey(nodesRequiringCredentialsSorted.value);
	});

	const credentialUsages = computed(() => {
		return Array.from(credentialsByKey.value.values());
	});

	const appCredentials = computed(() => {
		return getAppCredentials(credentialUsages.value, appNameByNodeType);
	});

	const credentialOverrides = computed(() => {
		const overrides: Record<TemplateCredentialKey, INodeCredentialsDetails> = {};

		for (const [key, credentialId] of Object.entries(selectedCredentialIdByKey.value)) {
			const credential = credentialsStore.getCredentialById(credentialId);
			if (!credential) {
				continue;
			}

			// Object.entries fails to give the more accurate key type
			overrides[key as TemplateCredentialKey] = {
				id: credentialId,
				name: credential.name,
			};
		}

		return overrides;
	});

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
	const skipSetup = async (opts: {
		$externalHooks: IExternalHooks;
		$telemetry: Telemetry;
		$router: Router;
	}) => {
		const { $externalHooks, $telemetry, $router } = opts;
		const telemetryPayload = {
			source: 'workflow',
			template_id: templateId.value,
			wf_template_repo_session_id: templatesStore.currentSessionId,
		};

		await $externalHooks.run('templatesWorkflowView.openWorkflow', telemetryPayload);
		$telemetry.track('User inserted workflow template', telemetryPayload, {
			withPostHog: true,
		});

		// Replace the URL so back button doesn't come back to this setup view
		await $router.replace({
			name: VIEWS.TEMPLATE_IMPORT,
			params: { id: templateId.value },
		});
	};

	/**
	 * Creates a workflow from the template and navigates to the workflow view.
	 */
	const createWorkflow = async ($router: Router) => {
		if (!template.value) {
			return;
		}

		try {
			isSaving.value = true;

			const createdWorkflow = await createWorkflowFromTemplate(
				template.value,
				credentialOverrides.value,
				rootStore,
				workflowsStore,
			);

			// Replace the URL so back button doesn't come back to this setup view
			await $router.replace({
				name: VIEWS.WORKFLOW,
				params: { name: createdWorkflow.id },
			});
		} finally {
			isSaving.value = false;
		}
	};

	const setSelectedCredentialId = (credentialKey: TemplateCredentialKey, credentialId: string) => {
		selectedCredentialIdByKey.value[credentialKey] = credentialId;
	};

	const unsetSelectedCredential = (credentialKey: TemplateCredentialKey) => {
		delete selectedCredentialIdByKey.value[credentialKey];
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
