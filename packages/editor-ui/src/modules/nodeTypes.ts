import Vue from 'vue';
import { ActionContext, Module } from 'vuex';
import type {
	ILoadOptions,
	INodeCredentials,
	INodeListSearchResult,
	INodeParameters,
	INodeTypeDescription,
	INodeTypeNameVersion,
} from 'n8n-workflow';

import { DEFAULT_NODETYPE_VERSION } from '@/constants';
import { addHeaders, addNodeTranslation } from '@/plugins/i18n';
import {
	getNodeParameterOptions,
	getNodesInformation,
	getNodeTranslationHeaders,
	getNodeTypes,
	getResourceLocatorResults,
} from '@/api/nodeTypes';
import { omit } from '@/utils';
import type { IRootState, INodeTypesState, ICategoriesWithNodes, INodeCreateElement, IResourceLocatorReqParams } from '../Interface';
import { getCategoriesWithNodes, getCategorizedList } from './nodeTypesHelpers';

const module: Module<INodeTypesState, IRootState> = {
	namespaced: true,
	state: {
		nodeTypes: {},
	},
	getters: {
		allNodeTypes: (state): INodeTypeDescription[] => {
			return Object.values(state.nodeTypes).reduce<INodeTypeDescription[]>((allNodeTypes, nodeType) => {
				const versionNumbers = Object.keys(nodeType).map(Number);
				const allNodeVersions = versionNumbers.map(version => nodeType[version]);

				return [...allNodeTypes, ...allNodeVersions];
			}, []);
		},
		allLatestNodeTypes: (state): INodeTypeDescription[] => {
			return Object.values(state.nodeTypes).reduce<INodeTypeDescription[]>((allLatestNodeTypes, nodeVersions) => {
				const versionNumbers = Object.keys(nodeVersions).map(Number);
				const latestNodeVersion = nodeVersions[Math.max(...versionNumbers)];

				if (!latestNodeVersion) return allLatestNodeTypes;

				return [...allLatestNodeTypes, latestNodeVersion];
			}, []);
		},
		getNodeType: (state) => (nodeTypeName: string, version?: number): INodeTypeDescription | null => {
			const nodeVersions = state.nodeTypes[nodeTypeName];

			if (!nodeVersions) return null;

			const versionNumbers = Object.keys(nodeVersions).map(Number);
			const nodeType = nodeVersions[version || Math.max(...versionNumbers)];

			return nodeType || null;
		},
		isTriggerNode: (state, getters) => (nodeTypeName: string) => {
			const nodeType = getters.getNodeType(nodeTypeName);
			return !!(nodeType && nodeType.group.includes('trigger'));
		},
		visibleNodeTypes: (state, getters): INodeTypeDescription[] => {
			return getters.allLatestNodeTypes.filter((nodeType: INodeTypeDescription) => !nodeType.hidden);
		},
		categoriesWithNodes: (state, getters, rootState, rootGetters): ICategoriesWithNodes => {
			return getCategoriesWithNodes(getters.visibleNodeTypes, rootGetters['users/personalizedNodeTypes']);
		},
		categorizedItems: (state, getters): INodeCreateElement[] => {
			return getCategorizedList(getters.categoriesWithNodes);
		},
	},
	mutations: {
		setNodeTypes(state, newNodeTypes: INodeTypeDescription[] = []) {
			const nodeTypes = newNodeTypes.reduce<Record<string, Record<string, INodeTypeDescription>>>((acc, newNodeType) => {
				const newNodeVersions = getNodeVersions(newNodeType);

				if (newNodeVersions.length === 0) {
					const singleVersion = { [DEFAULT_NODETYPE_VERSION]: newNodeType };

					acc[newNodeType.name] = singleVersion;
					return acc;
				}

				for (const version of newNodeVersions) {
					if (acc[newNodeType.name]) {
						acc[newNodeType.name][version] = newNodeType;
					} else {
						acc[newNodeType.name] = { [version]: newNodeType };
					}
				}

				return acc;
			}, { ...state.nodeTypes });

			Vue.set(state, 'nodeTypes', nodeTypes);
		},
		removeNodeTypes(state, nodeTypesToRemove: INodeTypeDescription[]) {
			state.nodeTypes = nodeTypesToRemove.reduce(
				(oldNodes, newNodeType) => omit(newNodeType.name, oldNodes),
				state.nodeTypes,
			);
		},
	},
	actions: {
		async getFullNodesProperties(
			context: ActionContext<INodeTypesState, IRootState>,
			nodesToBeFetched: INodeTypeNameVersion[],
		) {
			await context.dispatch('credentials/fetchCredentialTypes', true);

			const nodesInformation = await context.dispatch(
				'getNodesInformation',
				nodesToBeFetched,
			);

			context.commit('setNodeTypes', nodesInformation);
		},
		async getNodeTypes(context: ActionContext<INodeTypesState, IRootState>) {
			const nodeTypes = await getNodeTypes(context.rootGetters.getRestApiContext);
			if (nodeTypes.length) {
				context.commit('setNodeTypes', nodeTypes);
			}
		},
		async getNodeTranslationHeaders(context: ActionContext<INodeTypesState, IRootState>) {
			const headers = await getNodeTranslationHeaders(context.rootGetters.getRestApiContext);

			if (headers) {
				addHeaders(headers, context.rootGetters.defaultLocale);
			}
		},
		async getNodesInformation(
			context: ActionContext<INodeTypesState, IRootState>,
			nodeInfos: INodeTypeNameVersion[],
		) {
			const nodesInformation = await getNodesInformation(
				context.rootGetters.getRestApiContext,
				nodeInfos,
			);

			nodesInformation.forEach(nodeInformation => {
				if (nodeInformation.translation) {
					const nodeType = nodeInformation.name.replace('n8n-nodes-base.', '');

					addNodeTranslation(
						{ [nodeType]: nodeInformation.translation },
						context.getters.defaultLocale,
					);
				}
			});

			context.commit('setNodeTypes', nodesInformation);
		},
		async getNodeParameterOptions(
			context: ActionContext<INodeTypesState, IRootState>,
			sendData: {
				nodeTypeAndVersion: INodeTypeNameVersion,
				path: string,
				methodName?: string,
				loadOptions?: ILoadOptions,
				currentNodeParameters: INodeParameters,
				credentials?: INodeCredentials,
			},
		) {
			return getNodeParameterOptions(context.rootGetters.getRestApiContext, sendData);
		},
		async getResourceLocatorResults(
			context: ActionContext<INodeTypesState, IRootState>,
			sendData: IResourceLocatorReqParams,
		): Promise<INodeListSearchResult> {
			return getResourceLocatorResults(context.rootGetters.getRestApiContext, sendData);
		},
	},
};

function getNodeVersions(nodeType: INodeTypeDescription) {
	return Array.isArray(nodeType.version) ? nodeType.version : [nodeType.version];
}

export default module;
