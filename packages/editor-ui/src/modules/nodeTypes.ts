import Vue from 'vue';
import { ActionContext, Module } from 'vuex';
import type { INodeTypeDescription } from 'n8n-workflow';

import type { IRootState, INodeTypesState } from '../Interface';
import { DEFAULT_NODETYPE_VERSION } from '@/constants';
import { getNodeTypes } from '@/api/nodeTypes';

const module: Module<INodeTypesState, IRootState> = {
	namespaced: true,
	state: {
		nodeTypes: {},
	},
	getters: {
		allNodeTypes: (state): INodeTypeDescription[] => {
			return Object.values(state.nodeTypes);
		},
		nodeType: (state) => (nodeType: string, version?: number): INodeTypeDescription | null => {
			const foundType = Object.values(state.nodeTypes).find(typeData => {
				const typeVersion = Array.isArray(typeData.version)
					? typeData.version
					: [typeData.version];

				return typeData.name === nodeType && typeVersion.includes(
					version || typeData.defaultVersion || DEFAULT_NODETYPE_VERSION,
				);
			});

			if (foundType === undefined) {
				return null;
			}

			return foundType;
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
		async getNodeTypes(context: ActionContext<INodeTypesState, IRootState>) {
			const nodeTypes = await getNodeTypes(context.rootGetters.getRestApiContext);
			if (nodeTypes) {
				context.commit('setNodeTypes', nodeTypes);
			}
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
