import type { INodeUi } from '@/Interface';
import type { IConnections, IPinData, IWorkflowSettings } from 'n8n-workflow';
import { Workflow, deepCopy } from 'n8n-workflow';
import { ref, type Ref } from 'vue';
import { DEFAULT_SETTINGS } from './useWorkflowDocumentSettings';
import { useWorkflowsStore } from '../workflows.store';

export interface WorkflowDocumentWorkflowObjectDeps {
	workflowId: string;
}

export function useWorkflowDocumentWorkflowObject(deps: WorkflowDocumentWorkflowObjectDeps) {
	const workflowsStore = useWorkflowsStore();
	const workflowObject = ref<Workflow>(
		new Workflow({
			id: deps.workflowId,
			name: '',
			nodes: [],
			connections: {},
			active: false,
			nodeTypes: workflowsStore.getNodeTypes(),
			settings: { ...DEFAULT_SETTINGS },
		}),
	);

	function initWorkflowObject(opts: {
		id?: string;
		name: string;
		nodes: INodeUi[];
		connections: IConnections;
		settings: IWorkflowSettings;
		pinData: IPinData;
	}) {
		workflowObject.value = new Workflow({
			id: opts.id,
			name: opts.name,
			nodes: deepCopy(opts.nodes),
			connections: deepCopy(opts.connections),
			active: false,
			nodeTypes: workflowsStore.getNodeTypes(),
			settings: opts.settings,
			pinData: opts.pinData,
		});
	}

	function syncWorkflowObjectNodes(nodes: INodeUi[]) {
		workflowObject.value.setNodes(nodes);
	}

	function syncWorkflowObjectConnections(connections: IConnections) {
		workflowObject.value.setConnections(connections);
	}

	function syncWorkflowObjectName(name: string) {
		workflowObject.value.name = name;
	}

	function syncWorkflowObjectSettings(settings: IWorkflowSettings) {
		workflowObject.value.setSettings(settings);
	}

	function createWorkflowObject(
		nodes: INodeUi[],
		connections: IConnections,
		copyData?: boolean,
	): Workflow {
		const nodeTypes = workflowsStore.getNodeTypes();

		return new Workflow({
			id: deps.workflowId,
			name: workflowObject.value.name,
			nodes: copyData ? deepCopy(nodes) : nodes,
			connections: copyData ? deepCopy(connections) : connections,
			active: false,
			nodeTypes,
			settings: workflowObject.value.settings,
			pinData: workflowObject.value.pinData,
		});
	}

	function cloneWorkflowObject(): Workflow {
		return createWorkflowObject(
			// Returns a shallow copy of the nodes which means that all the data on the lower
			// levels still only gets referenced but the top level object is a different one.
			// This has the advantage that it is very fast and does not cause problems with vuex
			// when the workflow replaces the node-parameters.
			Object.values(workflowObject.value.nodes).map((node) => ({ ...node })),
			workflowObject.value.connectionsBySourceNode,
		);
	}

	return {
		initWorkflowObject,
		createWorkflowObject,
		cloneWorkflowObject,

		/**
		 * fields and methods below are meant to be private in workflow document store
		 */
		workflowObject: workflowObject as Ref<Workflow>,
		syncWorkflowObjectNodes,
		syncWorkflowObjectConnections,
		syncWorkflowObjectName,
		syncWorkflowObjectSettings,
	};
}
