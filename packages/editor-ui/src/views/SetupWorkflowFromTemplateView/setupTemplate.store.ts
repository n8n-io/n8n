import sortBy from 'lodash-es/sortBy';
import { defineStore } from 'pinia';
import { computed, reactive, ref } from 'vue';
import type { Router } from 'vue-router';
import {
	useCredentialsStore,
	useNodeTypesStore,
	useRootStore,
	useTemplatesStore,
	useWorkflowsStore,
} from '@/stores';
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
import type { IWorkflowTemplateNodeWithCredentials } from '@/utils/templates/templateTransforms';
import {
	hasNodeCredentials,
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

export const groupNodeCredentialsByName = (nodes: IWorkflowTemplateNodeWithCredentials[]) => {
	const credentialsByName = new Map<string, CredentialUsages>();

	for (const node of nodes) {
		const normalizedCreds = normalizeTemplateNodeCredentials(node.credentials);
		for (const credentialType in normalizedCreds) {
			const credentialName = normalizedCreds[credentialType];

			let credentialUsages = credentialsByName.get(credentialName);
			if (!credentialUsages) {
				credentialUsages = {
					nodeTypeName: node.type,
					credentialName,
					credentialType,
					usedBy: [],
				};
				credentialsByName.set(credentialName, credentialUsages);
			}

			credentialUsages.usedBy.push(node);
		}
	}

	return credentialsByName;
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
	const templateId = ref<string>('');
	const isLoading = ref(false);
	/**
	 * Credentials user has selected from the UI. Map from credential
	 * name in the template to the credential ID.
	 */
	const selectedCredentialIdByName = reactive<
		Record<CredentialUsages['credentialName'], ICredentialsResponse['id']>
	>({});

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

	const credentialsByName = computed(() => {
		return groupNodeCredentialsByName(nodesRequiringCredentialsSorted.value);
	});

	const credentialUsages = computed(() => {
		return Array.from(credentialsByName.value.values());
	});

	const appCredentials = computed(() => {
		return getAppCredentials(credentialUsages.value, appNameByNodeType);
	});

	const credentialOverrides = computed(() => {
		const overrides: Record<string, INodeCredentialsDetails> = {};

		for (const credentialNameInTemplate of Object.keys(selectedCredentialIdByName)) {
			const credentialId = selectedCredentialIdByName[credentialNameInTemplate];
			if (!credentialId) {
				continue;
			}

			const credential = credentialsStore.getCredentialById(credentialId);
			if (!credential) {
				continue;
			}

			overrides[credentialNameInTemplate] = {
				id: credentialId,
				name: credential.name,
			};
		}

		return overrides;
	});

	//#endregion Getters

	//#region Actions

	/**
	 * Loads the template if it hasn't been loaded yet.
	 */
	const loadTemplateIfNeeded = () => {
		if (!!template.value || !templateId.value) {
			return;
		}

		void templatesStore.fetchTemplateById(templateId.value);
	};

	/**
	 * Initializes the store for a specific template.
	 */
	const init = async (_templateId: string) => {
		templateId.value = _templateId;
		isLoading.value = true;
		try {
			await Promise.all([
				credentialsStore.fetchAllCredentials(),
				credentialsStore.fetchCredentialTypes(false),
				nodeTypesStore.loadNodeTypesIfNotLoaded(),
				loadTemplateIfNeeded(),
			]);
		} finally {
			isLoading.value = false;
		}
	};

	/**
	 * Skips the setup and goes directly to the workflow view.
	 */
	const skipSetup = async (opts: {
		$externalHooks: () => IExternalHooks;
		$telemetry: Telemetry;
	}) => {
		const { $externalHooks, $telemetry } = opts;
		const telemetryPayload = {
			source: 'workflow',
			template_id: templateId.value,
			wf_template_repo_session_id: templatesStore.currentSessionId,
		};

		await $externalHooks().run('templatesWorkflowView.openWorkflow', telemetryPayload);
		$telemetry.track('User inserted workflow template', telemetryPayload, {
			withPostHog: true,
		});
	};

	/**
	 * Creates a workflow from the template and navigates to the workflow view.
	 */
	const createWorkflow = async ($router: Router) => {
		if (!template.value) {
			return;
		}

		const createdWorkflow = await createWorkflowFromTemplate(
			template.value,
			credentialOverrides.value,
			rootStore,
			workflowsStore,
		);

		await $router.push({
			name: VIEWS.WORKFLOW,
			params: { name: createdWorkflow.id },
		});
	};

	const setSelectedCredentialId = (credentialName: string, credentialId: string) => {
		selectedCredentialIdByName[credentialName] = credentialId;
	};

	const unsetSelectedCredential = (credentialName: string) => {
		delete selectedCredentialIdByName[credentialName];
	};

	//#endregion Actions

	return {
		credentialsByName,
		isLoading,
		appCredentials,
		nodesRequiringCredentialsSorted,
		template,
		credentialUsages,
		selectedCredentialIdByName,
		createWorkflow,
		skipSetup,
		init,
		loadTemplateIfNeeded,
		setSelectedCredentialId,
		unsetSelectedCredential,
	};
});
