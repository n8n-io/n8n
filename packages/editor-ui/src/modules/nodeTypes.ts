import Vue from 'vue';
import { ActionContext, Module } from 'vuex';
import type { ILoadOptions, INodeCredentials, INodeParameters, INodeTypeDescription, INodeTypeNameVersion } from 'n8n-workflow';

import type { IRootState, INodeTypesState } from '../Interface';
import { DEFAULT_NODETYPE_VERSION } from '@/constants';
import { getNodeParameterOptions, getNodesInformation, getNodeTranslationHeaders, getNodeTypes } from '@/api/nodeTypes';
import { addHeaders, addNodeTranslation } from '@/plugins/i18n';

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

			if (!nodeType) return null;

			if (!hasValidVersion(nodeType, version)) return null;

			return nodeType;
		},
	},
	mutations: {
		setNodeTypes(state, nodeTypesArray: INodeTypeDescription[]) {
			Vue.set(state, 'nodeTypes', toNodeTypesState(nodeTypesArray));
		},

		updateNodeTypes(state, nodeTypes: INodeTypeDescription[]) {
			const oldNodesToKeep = Object.values(state.nodeTypes).filter(
				node => !nodeTypes.find(
					n => n.name === node.name && n.version.toString() === node.version.toString(),
				),
			);

			const newNodesState = [...oldNodesToKeep, ...nodeTypes];

			Vue.set(state, 'nodeTypes', newNodesState);

			state.nodeTypes = toNodeTypesState(newNodesState);
		},

		removeNodeTypes(state, nodeTypes: INodeTypeDescription[]) {
			console.log('Store will remove nodes: ', nodeTypes); // eslint-disable-line no-console

			const oldNodesToKeep = Object.values(state.nodeTypes).filter(
				node => !nodeTypes.find(
					n => n.name === node.name && n.version === node.version,
				),
			);

			Vue.set(state, 'nodeTypes', oldNodesToKeep);

			state.nodeTypes = toNodeTypesState(oldNodesToKeep);
		},
	},
	actions: {
		async getFullNodesProperties(
			context: ActionContext<INodeTypesState, IRootState>,
			nodesToBeFetched: INodeTypeNameVersion[],
		) {
			await context.dispatch('credentials/fetchCredentialTypes', true);

			const nodesInformation = await context.dispatch(
				'nodeTypes/getNodesInformation',
				nodesToBeFetched,
			);

			context.commit('nodeTypes/updateNodeTypes', nodesInformation);
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

function toNodeTypesState(nodeTypes: INodeTypeDescription[]): INodeTypesState['nodeTypes'] {
	return nodeTypes.reduce<{ [nodeType: string]: INodeTypeDescription }>((acc, cur) => {
		acc[cur.name] = cur;

		return acc;
	}, {});
}

export default module;

function hasValidVersion(nodeType: INodeTypeDescription, version?: number) {
	const nodeTypeVersion = Array.isArray(nodeType.version)
		? nodeType.version
		: [nodeType.version];

	return nodeTypeVersion.includes(version || nodeType.defaultVersion || DEFAULT_NODETYPE_VERSION);
}
