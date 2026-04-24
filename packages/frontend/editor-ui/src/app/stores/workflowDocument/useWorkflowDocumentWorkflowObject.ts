import type { INodeUi } from '@/Interface';
import type { IConnections, INodeTypes, IPinData, IWorkflowSettings } from 'n8n-workflow';
import { Workflow, deepCopy } from 'n8n-workflow';
import { ref, type Ref } from 'vue';
import { DEFAULT_SETTINGS } from './useWorkflowDocumentSettings';

export interface WorkflowDocumentWorkflowObjectDeps {
	workflowId: string;
	getNodeTypes: () => INodeTypes;
}

export function useWorkflowDocumentWorkflowObject(deps: WorkflowDocumentWorkflowObjectDeps) {
	const workflowObject = ref<Workflow>(
		new Workflow({
			id: deps.workflowId,
			name: '',
			nodes: [],
			connections: {},
			active: false,
			nodeTypes: deps.getNodeTypes(),
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
			nodeTypes: deps.getNodeTypes(),
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

	function syncWorkflowObjectId(id: string) {
		workflowObject.value.id = id;
	}

	return {
		workflowObject: workflowObject as Ref<Workflow>,
		initWorkflowObject,
		syncWorkflowObjectNodes,
		syncWorkflowObjectConnections,
		syncWorkflowObjectName,
		syncWorkflowObjectSettings,
		syncWorkflowObjectId,
	};
}
