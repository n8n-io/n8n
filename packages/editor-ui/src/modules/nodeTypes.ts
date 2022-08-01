import Vue from 'vue';
import { ActionContext, Module } from 'vuex';
import type {
	ILoadOptions,
	INodeCredentials,
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
} from '@/api/nodeTypes';
import { omit } from '@/utils';
import type { IRootState, INodeTypesState } from '../Interface';

const module: Module<INodeTypesState, IRootState> = {
	namespaced: true,
	state: {
		nodeTypes: {},
	},
	getters: {
		allNodeTypes: (state): INodeTypeDescription[] => {
			return Object.values(state.nodeTypes);
		},
		getNodeType: (state) => (nodeTypeName: string, version?: number): INodeTypeDescription | null => {
			const nodeType = state.nodeTypes[nodeTypeName];

			if (!nodeType || !hasValidVersion(nodeType, version)) return null;

			return nodeType;
		},
	},
	mutations: {
		setNodeTypes(state, nodeTypesArray: INodeTypeDescription[]) {
			state.nodeTypes = toNodeTypesState(nodeTypesArray);
		},

		updateNodeTypes(state, newNodeTypes: INodeTypeDescription[]) {
			newNodeTypes.forEach((node) => Vue.set(state.nodeTypes, node.name, node));
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

			context.commit('updateNodeTypes', nodesInformation);
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
				addHeaders(headers, context.getters.defaultLocale);
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

			context.commit('updateNodeTypes', nodesInformation);
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
	},
};

function toNodeTypesState(nodeTypes: INodeTypeDescription[]) {
	return nodeTypes.reduce<INodeTypesState['nodeTypes']>((acc, cur) => {
		acc[cur.name] = cur;

		return acc;
	}, {});
}

function hasValidVersion(nodeType: INodeTypeDescription, version?: number) {
	const nodeTypeVersion = Array.isArray(nodeType.version)
		? nodeType.version
		: [nodeType.version];

	return nodeTypeVersion.includes(version || nodeType.defaultVersion || DEFAULT_NODETYPE_VERSION);
}

export default module;
