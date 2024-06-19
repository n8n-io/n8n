import * as nodeTypesApi from '@/api/nodeTypes';
import { HTTP_REQUEST_NODE_TYPE, STORES, CREDENTIAL_ONLY_HTTP_NODE_VERSION } from '@/constants';
import type { DynamicNodeParameters, NodeTypesByTypeNameAndVersion } from '@/Interface';
import { addHeaders, addNodeTranslation } from '@/plugins/i18n';
import { omit } from '@/utils/typesUtils';
import type {
	ConnectionTypes,
	INode,
	INodeOutputConfiguration,
	INodeTypeDescription,
	INodeTypeNameVersion,
	Workflow,
} from 'n8n-workflow';
import { NodeConnectionType, NodeHelpers } from 'n8n-workflow';
import { defineStore } from 'pinia';
import { useCredentialsStore } from './credentials.store';
import { useRootStore } from './root.store';
import * as utils from '@/utils/credentialOnlyNodes';
import { groupNodeTypesByNameAndType } from '@/utils/nodeTypes/nodeTypeTransforms';
import { computed, ref } from 'vue';

export type NodeTypesStore = ReturnType<typeof useNodeTypesStore>;

export const useNodeTypesStore = defineStore(STORES.NODE_TYPES, () => {
	const nodeTypes = ref<NodeTypesByTypeNameAndVersion>({});

	const rootStore = useRootStore();

	// ---------------------------------------------------------------------------
	// #region Computed
	// ---------------------------------------------------------------------------

	const allNodeTypes = computed(() => {
		return Object.values(nodeTypes.value).reduce<INodeTypeDescription[]>(
			(allNodeTypes, nodeType) => {
				const versionNumbers = Object.keys(nodeType).map(Number);
				const allNodeVersions = versionNumbers.map((version) => nodeType[version]);

				return [...allNodeTypes, ...allNodeVersions];
			},
			[],
		);
	});

	const allLatestNodeTypes = computed(() => {
		return Object.values(nodeTypes.value).reduce<INodeTypeDescription[]>(
			(allLatestNodeTypes, nodeVersions) => {
				const versionNumbers = Object.keys(nodeVersions).map(Number);
				const latestNodeVersion = nodeVersions[Math.max(...versionNumbers)];

				if (!latestNodeVersion) return allLatestNodeTypes;

				return [...allLatestNodeTypes, latestNodeVersion];
			},
			[],
		);
	});

	const getNodeType = computed(() => {
		return (nodeTypeName: string, version?: number): INodeTypeDescription | null => {
			if (utils.isCredentialOnlyNodeType(nodeTypeName)) {
				return getCredentialOnlyNodeType.value(nodeTypeName, version);
			}

			const nodeVersions = nodeTypes.value[nodeTypeName];

			if (!nodeVersions) return null;

			const versionNumbers = Object.keys(nodeVersions).map(Number);
			const nodeType = nodeVersions[version ?? Math.max(...versionNumbers)];
			return nodeType ?? null;
		};
	});

	const getNodeVersions = computed(() => {
		return (nodeTypeName: string): number[] => {
			return Object.keys(nodeTypes.value[nodeTypeName] ?? {}).map(Number);
		};
	});

	const getCredentialOnlyNodeType = computed(() => {
		return (nodeTypeName: string, version?: number): INodeTypeDescription | null => {
			const credentialName = utils.getCredentialTypeName(nodeTypeName);
			const httpNode = getNodeType.value(
				HTTP_REQUEST_NODE_TYPE,
				version ?? CREDENTIAL_ONLY_HTTP_NODE_VERSION,
			);
			const credential = useCredentialsStore().getCredentialTypeByName(credentialName);
			return utils.getCredentialOnlyNodeType(httpNode, credential) ?? null;
		};
	});

	const isConfigNode = computed(() => {
		return (workflow: Workflow, node: INode, nodeTypeName: string): boolean => {
			if (!workflow.nodes[node.name]) {
				return false;
			}
			const nodeType = getNodeType.value(nodeTypeName);
			if (!nodeType) {
				return false;
			}
			const outputs = NodeHelpers.getNodeOutputs(workflow, node, nodeType);
			const outputTypes = NodeHelpers.getConnectionTypes(outputs);

			return outputTypes
				? outputTypes.filter((output) => output !== NodeConnectionType.Main).length > 0
				: false;
		};
	});

	const isTriggerNode = computed(() => {
		return (nodeTypeName: string) => {
			const nodeType = getNodeType.value(nodeTypeName);
			return !!(nodeType && nodeType.group.includes('trigger'));
		};
	});

	const isCoreNodeType = computed(() => {
		return (nodeType: INodeTypeDescription) => {
			return nodeType.codex?.categories?.includes('Core Nodes');
		};
	});

	const visibleNodeTypes = computed(() => {
		return allLatestNodeTypes.value.filter((nodeType: INodeTypeDescription) => !nodeType.hidden);
	});

	const nativelyNumberSuffixedDefaults = computed(() => {
		return allNodeTypes.value.reduce<string[]>((acc, cur) => {
			if (/\d$/.test(cur.defaults.name as string)) acc.push(cur.defaults.name as string);
			return acc;
		}, []);
	});

	const visibleNodeTypesByOutputConnectionTypeNames = computed(() => {
		const nodesByOutputType = visibleNodeTypes.value.reduce(
			(acc, node) => {
				const outputTypes = node.outputs;
				if (Array.isArray(outputTypes)) {
					outputTypes.forEach((value: ConnectionTypes | INodeOutputConfiguration) => {
						const outputType = typeof value === 'string' ? value : value.type;
						if (!acc[outputType]) {
							acc[outputType] = [];
						}
						acc[outputType].push(node.name);
					});
				} else {
					// If outputs is not an array, it must be a string expression
					// in which case we'll try to match all possible non-main output types that are supported
					const connectorTypes: ConnectionTypes[] = [
						NodeConnectionType.AiVectorStore,
						NodeConnectionType.AiChain,
						NodeConnectionType.AiDocument,
						NodeConnectionType.AiEmbedding,
						NodeConnectionType.AiLanguageModel,
						NodeConnectionType.AiMemory,
						NodeConnectionType.AiOutputParser,
						NodeConnectionType.AiTextSplitter,
						NodeConnectionType.AiTool,
					];
					connectorTypes.forEach((outputType: ConnectionTypes) => {
						if (outputTypes.includes(outputType)) {
							acc[outputType] = acc[outputType] || [];
							acc[outputType].push(node.name);
						}
					});
				}

				return acc;
			},
			{} as { [key: string]: string[] },
		);

		return nodesByOutputType;
	});

	const visibleNodeTypesByInputConnectionTypeNames = computed(() => {
		const nodesByOutputType = visibleNodeTypes.value.reduce(
			(acc, node) => {
				const inputTypes = node.inputs;
				if (Array.isArray(inputTypes)) {
					inputTypes.forEach((value: ConnectionTypes | INodeOutputConfiguration) => {
						const outputType = typeof value === 'string' ? value : value.type;
						if (!acc[outputType]) {
							acc[outputType] = [];
						}
						acc[outputType].push(node.name);
					});
				}

				return acc;
			},
			{} as { [key: string]: string[] },
		);

		return nodesByOutputType;
	});

	const isConfigurableNode = computed(() => {
		return (workflow: Workflow, node: INode, nodeTypeName: string): boolean => {
			const nodeType = getNodeType.value(nodeTypeName);
			if (nodeType === null) {
				return false;
			}
			const inputs = NodeHelpers.getNodeInputs(workflow, node, nodeType);
			const inputTypes = NodeHelpers.getConnectionTypes(inputs);

			return inputTypes
				? inputTypes.filter((input) => input !== NodeConnectionType.Main).length > 0
				: false;
		};
	});

	// #endregion

	// ---------------------------------------------------------------------------
	// #region Methods
	// ---------------------------------------------------------------------------

	const setNodeTypes = (newNodeTypes: INodeTypeDescription[] = []) => {
		const groupedNodeTypes = groupNodeTypesByNameAndType(newNodeTypes);
		nodeTypes.value = {
			...nodeTypes.value,
			...groupedNodeTypes,
		};
	};

	const removeNodeTypes = (nodeTypesToRemove: INodeTypeDescription[]) => {
		nodeTypes.value = nodeTypesToRemove.reduce(
			(oldNodes, newNodeType) => omit(newNodeType.name, oldNodes),
			nodeTypes.value,
		);
	};

	const getNodesInformation = async (
		nodeInfos: INodeTypeNameVersion[],
		replace = true,
	): Promise<INodeTypeDescription[]> => {
		const nodesInformation = await nodeTypesApi.getNodesInformation(
			rootStore.restApiContext,
			nodeInfos,
		);

		nodesInformation.forEach((nodeInformation) => {
			if (nodeInformation.translation) {
				const nodeType = nodeInformation.name.replace('n8n-nodes-base.', '');

				addNodeTranslation({ [nodeType]: nodeInformation.translation }, rootStore.defaultLocale);
			}
		});
		if (replace) setNodeTypes(nodesInformation);

		return nodesInformation;
	};

	const getFullNodesProperties = async (nodesToBeFetched: INodeTypeNameVersion[]) => {
		const credentialsStore = useCredentialsStore();
		await credentialsStore.fetchCredentialTypes(true);
		await getNodesInformation(nodesToBeFetched);
	};

	const getNodeTypes = async () => {
		const nodeTypes = await nodeTypesApi.getNodeTypes(rootStore.baseUrl);
		if (nodeTypes.length) {
			setNodeTypes(nodeTypes);
		}
	};

	const loadNodeTypesIfNotLoaded = async () => {
		if (Object.keys(nodeTypes.value).length === 0) {
			await getNodeTypes();
		}
	};

	const getNodeTranslationHeaders = async () => {
		const headers = await nodeTypesApi.getNodeTranslationHeaders(rootStore.restApiContext);

		if (headers) {
			addHeaders(headers, rootStore.defaultLocale);
		}
	};

	const getNodeParameterOptions = async (sendData: DynamicNodeParameters.OptionsRequest) => {
		return await nodeTypesApi.getNodeParameterOptions(rootStore.restApiContext, sendData);
	};

	const getResourceLocatorResults = async (
		sendData: DynamicNodeParameters.ResourceLocatorResultsRequest,
	) => {
		return await nodeTypesApi.getResourceLocatorResults(rootStore.restApiContext, sendData);
	};

	const getResourceMapperFields = async (
		sendData: DynamicNodeParameters.ResourceMapperFieldsRequest,
	) => {
		try {
			return await nodeTypesApi.getResourceMapperFields(rootStore.restApiContext, sendData);
		} catch (error) {
			return null;
		}
	};

	// #endregion

	return {
		nodeTypes,
		allNodeTypes,
		allLatestNodeTypes,
		getNodeType,
		getNodeVersions,
		getCredentialOnlyNodeType,
		isConfigNode,
		isTriggerNode,
		isCoreNodeType,
		visibleNodeTypes,
		nativelyNumberSuffixedDefaults,
		visibleNodeTypesByOutputConnectionTypeNames,
		visibleNodeTypesByInputConnectionTypeNames,
		isConfigurableNode,
		getResourceMapperFields,
		getResourceLocatorResults,
		getNodeParameterOptions,
		getNodesInformation,
		getFullNodesProperties,
		getNodeTypes,
		loadNodeTypesIfNotLoaded,
		getNodeTranslationHeaders,
		setNodeTypes,
		removeNodeTypes,
	};
});
