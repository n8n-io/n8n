import { createEventHook } from '@vueuse/core';
import type { IConnections, IWorkflowGroup } from 'n8n-workflow';
import { ref } from 'vue';

import { CHANGE_ACTION } from './types';

export type NodeGroupPayload = {
	group: IWorkflowGroup;
};

export type NodeGroupAddedPayload = NodeGroupPayload & {
	startCollapsed?: boolean;
};

export type NodeGroupRemovedPayload = {
	id: string;
};

export type NodeGroupsSetPayload = {
	groups: IWorkflowGroup[];
};

export type NodeGroupChangeEvent =
	| { action: typeof CHANGE_ACTION.SET; payload: NodeGroupsSetPayload }
	| { action: typeof CHANGE_ACTION.ADD; payload: NodeGroupAddedPayload }
	| { action: typeof CHANGE_ACTION.UPDATE; payload: NodeGroupPayload }
	| { action: typeof CHANGE_ACTION.DELETE; payload: NodeGroupRemovedPayload };

type WorkflowDocumentStructureState = {
	connections: IConnections;
	groups: Map<string, IWorkflowGroup>;
};

export function useWorkflowDocumentStructure() {
	const state = ref<WorkflowDocumentStructureState>({
		connections: {},
		groups: new Map(),
	});
	const onNodeGroupsChange = createEventHook<NodeGroupChangeEvent>();

	function setConnections(connections: IConnections) {
		state.value = { ...state.value, connections };
	}

	function setNodeGroups(nodeGroups: IWorkflowGroup[]) {
		state.value = {
			...state.value,
			groups: new Map(nodeGroups.map((group) => [group.id, group])),
		};
		emitNodeGroupsSet();
	}

	function replaceNodeGroupConnectionState(value: {
		connections: IConnections;
		nodeGroups: IWorkflowGroup[];
	}) {
		state.value = {
			connections: value.connections,
			groups: new Map(value.nodeGroups.map((group) => [group.id, group])),
		};
	}

	function emitNodeGroupsSet() {
		void onNodeGroupsChange.trigger({
			action: CHANGE_ACTION.SET,
			payload: { groups: Array.from(state.value.groups.values()) },
		});
	}

	function emitNodeGroupsChange(event: NodeGroupChangeEvent) {
		void onNodeGroupsChange.trigger(event);
	}

	return {
		state,
		setConnections,
		setNodeGroups,
		replaceNodeGroupConnectionState,
		emitNodeGroupsSet,
		emitNodeGroupsChange,
		onNodeGroupsChange: onNodeGroupsChange.on,
	};
}

export type WorkflowDocumentStructure = ReturnType<typeof useWorkflowDocumentStructure>;
