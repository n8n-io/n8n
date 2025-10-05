import type { Ref } from 'vue';
import { computed, ref } from 'vue';
import type { ICredentialsResponse } from '@/Interface';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { getAppNameFromNodeName } from '@/utils/nodeTypesUtils';
import type { TemplateCredentialKey } from '../utils/templateTransforms';
import {
	keyFromCredentialTypeAndName,
	normalizeTemplateNodeCredentials,
} from '../utils/templateTransforms';
import type { INodeCredentialsDetails } from 'n8n-workflow';
import type { NodeTypeProvider } from '@/utils/nodeTypes/nodeTypeTransforms';
import { getNodeTypeDisplayableCredentials } from '@/utils/nodes/nodeTransforms';
import sortBy from 'lodash/sortBy';
import type {
	AppCredentials,
	BaseNode,
	CredentialUsages,
	NodeWithRequiredCredential,
} from '../templates.types';

//#region Getters

/**
 * Returns the nodes in the template that require credentials
 * and the required credentials for each node.
 */
export const getNodesRequiringCredentials = <TNode extends BaseNode>(
	nodeTypeProvider: NodeTypeProvider,
	nodes: TNode[],
): Array<NodeWithRequiredCredential<TNode>> => {
	const nodesWithCredentials: Array<NodeWithRequiredCredential<TNode>> = nodes
		.map((node) => ({
			node,
			requiredCredentials: getNodeTypeDisplayableCredentials(nodeTypeProvider, node),
		}))
		.filter(({ requiredCredentials }) => requiredCredentials.length > 0);

	return nodesWithCredentials;
};

export const groupNodeCredentialsByKey = <TNode extends BaseNode>(
	nodeWithRequiredCredentials: Array<NodeWithRequiredCredential<TNode>>,
) => {
	const credentialsByTypeName = new Map<TemplateCredentialKey, CredentialUsages<TNode>>();

	for (const { node, requiredCredentials } of nodeWithRequiredCredentials) {
		const normalizedNodeCreds = node.credentials
			? normalizeTemplateNodeCredentials(node.credentials)
			: {};

		for (const credentialDescription of requiredCredentials) {
			const credentialType = credentialDescription.name;
			const nodeCredentialName = normalizedNodeCreds[credentialDescription.name] ?? '';
			const key = keyFromCredentialTypeAndName(credentialType, nodeCredentialName);

			let credentialUsages = credentialsByTypeName.get(key);
			if (!credentialUsages) {
				credentialUsages = {
					key,
					nodeTypeName: node.type,
					credentialName: nodeCredentialName,
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

export const getAppCredentials = <TNode extends BaseNode>(
	credentialUsages: Array<CredentialUsages<TNode>>,
	getAppNameByNodeType: (nodeTypeName: string, version?: number) => string,
) => {
	const credentialsByAppName = new Map<string, AppCredentials<TNode>>();

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

//#endregion Getters

export const useCredentialSetupState = <TNode extends BaseNode>(nodes: Ref<TNode[]>) => {
	/**
	 * Credentials user has selected from the UI. Map from credential
	 * name in the template to the credential ID.
	 */
	const selectedCredentialIdByKey = ref<
		Record<CredentialUsages<TNode>['key'], ICredentialsResponse['id']>
	>({});

	const nodeTypesStore = useNodeTypesStore();
	const credentialsStore = useCredentialsStore();

	const appNameByNodeType = (nodeTypeName: string, version?: number) => {
		const nodeType = nodeTypesStore.getNodeType(nodeTypeName, version);

		return nodeType ? getAppNameFromNodeName(nodeType.displayName) : nodeTypeName;
	};

	//#region Computed

	const nodesRequiringCredentialsSorted = computed(() => {
		const nodesWithCredentials = nodes.value
			? getNodesRequiringCredentials(nodeTypesStore, nodes.value)
			: [];

		// Order by the X coordinate of the node
		return sortBy(nodesWithCredentials, ({ node }) => node.position[0]);
	});

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

	const numFilledCredentials = computed(() => {
		return Object.keys(selectedCredentialIdByKey.value).length;
	});

	//#endregion Computed

	//#region Actions

	const setSelectedCredentialId = (credentialKey: TemplateCredentialKey, credentialId: string) => {
		selectedCredentialIdByKey.value[credentialKey] = credentialId;
	};

	const unsetSelectedCredential = (credentialKey: TemplateCredentialKey) => {
		delete selectedCredentialIdByKey.value[credentialKey];
	};

	//#endregion Actions

	return {
		appCredentials,
		credentialOverrides,
		credentialUsages,
		credentialsByKey,
		nodesRequiringCredentialsSorted,
		numFilledCredentials,
		selectedCredentialIdByKey,
		setSelectedCredentialId,
		unsetSelectedCredential,
	};
};
