import {
	getNodeParameterOptions,
	getNodesInformation,
	getNodeTranslationHeaders,
	getNodeTypes,
	getResourceLocatorResults,
	getResourceMapperFields,
} from '@/api/nodeTypes';
import { HTTP_REQUEST_NODE_TYPE, STORES, CREDENTIAL_ONLY_HTTP_NODE_VERSION } from '@/constants';
import type { INodeTypesState, DynamicNodeParameters } from '@/Interface';
import { addHeaders, addNodeTranslation } from '@/plugins/i18n';
import { omit } from '@/utils/typesUtils';
import type {
	ConnectionTypes,
	INode,
	INodeListSearchResult,
	INodeOutputConfiguration,
	INodePropertyOptions,
	INodeTypeDescription,
	INodeTypeNameVersion,
	ResourceMapperFields,
	Workflow,
} from 'n8n-workflow';
import { NodeConnectionType, NodeHelpers } from 'n8n-workflow';
import { defineStore } from 'pinia';
import { useCredentialsStore } from './credentials.store';
import { useRootStore } from './n8nRoot.store';
import {
	getCredentialOnlyNodeType,
	getCredentialTypeName,
	isCredentialOnlyNodeType,
} from '@/utils/credentialOnlyNodes';
import { groupNodeTypesByNameAndType } from '@/utils/nodeTypes/nodeTypeTransforms';

export type NodeTypesStore = ReturnType<typeof useNodeTypesStore>;

export const useNodeTypesStore = defineStore(STORES.NODE_TYPES, {
	state: (): INodeTypesState => ({
		nodeTypes: {},
	}),
	getters: {
		allNodeTypes(): INodeTypeDescription[] {
			return Object.values(this.nodeTypes).reduce<INodeTypeDescription[]>(
				(allNodeTypes, nodeType) => {
					const versionNumbers = Object.keys(nodeType).map(Number);
					const allNodeVersions = versionNumbers.map((version) => nodeType[version]);

					return [...allNodeTypes, ...allNodeVersions];
				},
				[],
			);
		},
		allLatestNodeTypes(): INodeTypeDescription[] {
			return Object.values(this.nodeTypes).reduce<INodeTypeDescription[]>(
				(allLatestNodeTypes, nodeVersions) => {
					const versionNumbers = Object.keys(nodeVersions).map(Number);
					const latestNodeVersion = nodeVersions[Math.max(...versionNumbers)];

					if (!latestNodeVersion) return allLatestNodeTypes;

					return [...allLatestNodeTypes, latestNodeVersion];
				},
				[],
			);
		},
		getNodeType() {
			return (nodeTypeName: string, version?: number): INodeTypeDescription | null => {
				if (isCredentialOnlyNodeType(nodeTypeName)) {
					return this.getCredentialOnlyNodeType(nodeTypeName, version);
				}

				const nodeVersions = this.nodeTypes[nodeTypeName];

				if (!nodeVersions) return null;

				const versionNumbers = Object.keys(nodeVersions).map(Number);
				const nodeType = nodeVersions[version ?? Math.max(...versionNumbers)];
				return nodeType ?? null;
			};
		},
		getNodeVersions() {
			return (nodeTypeName: string): number[] => {
				return Object.keys(this.nodeTypes[nodeTypeName] ?? {}).map(Number);
			};
		},
		getCredentialOnlyNodeType() {
			return (nodeTypeName: string, version?: number): INodeTypeDescription | null => {
				const credentialName = getCredentialTypeName(nodeTypeName);
				const httpNode = this.getNodeType(
					HTTP_REQUEST_NODE_TYPE,
					version ?? CREDENTIAL_ONLY_HTTP_NODE_VERSION,
				);
				const credential = useCredentialsStore().getCredentialTypeByName(credentialName);
				return getCredentialOnlyNodeType(httpNode, credential) ?? null;
			};
		},
		isConfigNode() {
			return (workflow: Workflow, node: INode, nodeTypeName: string): boolean => {
				if (!workflow.nodes[node.name]) {
					return false;
				}
				const nodeType = this.getNodeType(nodeTypeName);
				if (!nodeType) {
					return false;
				}
				const outputs = NodeHelpers.getNodeOutputs(workflow, node, nodeType);
				const outputTypes = NodeHelpers.getConnectionTypes(outputs);

				return outputTypes
					? outputTypes.filter((output) => output !== NodeConnectionType.Main).length > 0
					: false;
			};
		},
		isConfigurableNode() {
			return (workflow: Workflow, node: INode, nodeTypeName: string): boolean => {
				const nodeType = this.getNodeType(nodeTypeName);
				if (nodeType === null) {
					return false;
				}
				const inputs = NodeHelpers.getNodeInputs(workflow, node, nodeType);
				const inputTypes = NodeHelpers.getConnectionTypes(inputs);

				return inputTypes
					? inputTypes.filter((input) => input !== NodeConnectionType.Main).length > 0
					: false;
			};
		},
		isTriggerNode() {
			return (nodeTypeName: string) => {
				const nodeType = this.getNodeType(nodeTypeName);
				return !!(nodeType && nodeType.group.includes('trigger'));
			};
		},
		isCoreNodeType() {
			return (nodeType: INodeTypeDescription) => {
				return nodeType.codex?.categories?.includes('Core Nodes');
			};
		},
		visibleNodeTypes(): INodeTypeDescription[] {
			return this.allLatestNodeTypes.filter((nodeType: INodeTypeDescription) => !nodeType.hidden);
		},
		/**
		 * Getter for node default names ending with a number: `'S3'`, `'Magento 2'`, etc.
		 */
		nativelyNumberSuffixedDefaults(): string[] {
			return this.allNodeTypes.reduce<string[]>((acc, cur) => {
				if (/\d$/.test(cur.defaults.name as string)) acc.push(cur.defaults.name as string);
				return acc;
			}, []);
		},
		visibleNodeTypesByOutputConnectionTypeNames(): { [key: string]: string[] } {
			const nodesByOutputType = this.visibleNodeTypes.reduce(
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
		},
		visibleNodeTypesByInputConnectionTypeNames(): { [key: string]: string[] } {
			const nodesByOutputType = this.visibleNodeTypes.reduce(
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
		},
	},
	actions: {
		setNodeTypes(newNodeTypes: INodeTypeDescription[] = []): void {
			const nodeTypes = groupNodeTypesByNameAndType(newNodeTypes);
			this.nodeTypes = {
				...this.nodeTypes,
				...nodeTypes,
			};
		},
		removeNodeTypes(nodeTypesToRemove: INodeTypeDescription[]): void {
			this.nodeTypes = nodeTypesToRemove.reduce(
				(oldNodes, newNodeType) => omit(newNodeType.name, oldNodes),
				this.nodeTypes,
			);
		},
		async getNodesInformation(
			nodeInfos: INodeTypeNameVersion[],
			replace = true,
		): Promise<INodeTypeDescription[]> {
			const rootStore = useRootStore();
			const nodesInformation = await getNodesInformation(rootStore.getRestApiContext, nodeInfos);

			nodesInformation.forEach((nodeInformation) => {
				if (nodeInformation.translation) {
					const nodeType = nodeInformation.name.replace('n8n-nodes-base.', '');

					addNodeTranslation({ [nodeType]: nodeInformation.translation }, rootStore.defaultLocale);
				}
			});
			if (replace) this.setNodeTypes(nodesInformation);

			return nodesInformation;
		},
		async getFullNodesProperties(nodesToBeFetched: INodeTypeNameVersion[]): Promise<void> {
			const credentialsStore = useCredentialsStore();
			await credentialsStore.fetchCredentialTypes(true);
			await this.getNodesInformation(nodesToBeFetched);
		},
		async getNodeTypes(): Promise<void> {
			const rootStore = useRootStore();
			const nodeTypes = await getNodeTypes(rootStore.getBaseUrl);
			if (nodeTypes.length) {
				this.setNodeTypes(nodeTypes);
			}
		},
		/**
		 * Loads node types if they haven't been loaded yet
		 */
		async loadNodeTypesIfNotLoaded(): Promise<void> {
			if (Object.keys(this.nodeTypes).length === 0) {
				await this.getNodeTypes();
			}
		},
		async getNodeTranslationHeaders(): Promise<void> {
			const rootStore = useRootStore();
			const headers = await getNodeTranslationHeaders(rootStore.getRestApiContext);

			if (headers) {
				addHeaders(headers, rootStore.defaultLocale);
			}
		},
		async getNodeParameterOptions(
			sendData: DynamicNodeParameters.OptionsRequest,
		): Promise<INodePropertyOptions[]> {
			const rootStore = useRootStore();
			return await getNodeParameterOptions(rootStore.getRestApiContext, sendData);
		},
		async getResourceLocatorResults(
			sendData: DynamicNodeParameters.ResourceLocatorResultsRequest,
		): Promise<INodeListSearchResult> {
			const rootStore = useRootStore();
			return await getResourceLocatorResults(rootStore.getRestApiContext, sendData);
		},
		async getResourceMapperFields(
			sendData: DynamicNodeParameters.ResourceMapperFieldsRequest,
		): Promise<ResourceMapperFields | null> {
			const rootStore = useRootStore();
			try {
				return await getResourceMapperFields(rootStore.getRestApiContext, sendData);
			} catch (error) {
				return null;
			}
		},
	},
});
