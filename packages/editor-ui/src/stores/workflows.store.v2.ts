import { defineStore } from 'pinia';
import {
	ERROR_TRIGGER_NODE_TYPE,
	PLACEHOLDER_EMPTY_WORKFLOW_ID,
	START_NODE_TYPE,
	STORES,
} from '@/constants';
import { computed, ref } from 'vue';
import type {
	IPushDataExecutionFinished,
	IPushDataUnsavedExecutionFinished,
	IWorkflowDb,
} from '@/Interface';
import { useRootStore } from '@/stores/n8nRoot.store';
import * as workflowsApi from '@/api/workflows';
import type { INodeType, INodeTypes, ITaskData } from 'n8n-workflow';
import { deepCopy, Workflow } from 'n8n-workflow';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';

const defaultWorkflowSettings: Omit<IWorkflowDb, 'id'> & {
	settings: NonNullable<IWorkflowDb['settings']>;
} = {
	name: '',
	active: false,
	createdAt: -1,
	updatedAt: -1,
	connections: {},
	nodes: [],
	settings: {
		executionOrder: 'v1',
	},
	tags: [],
	pinData: {},
	versionId: '',
	usedCredentials: [],
};

export const useWorkflowsStoreV2 = defineStore(STORES.WORKFLOWS_V2, () => {
	const workflowsById = ref<Record<string, IWorkflowDb>>({});
	const workflows = computed(() => Object.values(workflowsById.value));

	const workflowInstancesCacheById = ref<
		Record<
			string,
			{
				key: string;
				workflow: Workflow;
			}
		>
	>({});

	function addWorkflow(workflow: IWorkflowDb) {
		workflowsById.value[workflow.id] = workflow;
	}

	function removeWorkflow(id: string) {
		delete workflowsById.value[id];
	}

	async function fetchWorkflow(id: string) {
		const rootStore = useRootStore();
		const workflow = await workflowsApi.getWorkflow(rootStore.getRestApiContext, id);

		addWorkflow(workflow);
	}

	function createNodeTypesForWorkflowObject(): INodeTypes {
		return {
			nodeTypes: {},
			init: async (): Promise<void> => {},
			getByNameAndVersion: (nodeType: string, version?: number): INodeType | undefined => {
				const description = useNodeTypesStore().getNodeType(nodeType, version);
				if (description === null) {
					return undefined;
				}

				// As we do not have the trigger/poll functions available in the frontend
				// we use the information available to figure out what are trigger nodes
				const trigger = ((![ERROR_TRIGGER_NODE_TYPE, START_NODE_TYPE].includes(nodeType) &&
					description.inputs.length === 0 &&
					!description.webhooks) ||
					undefined) as INodeType['trigger'];

				return {
					description,
					trigger,
				};
			},
		} as unknown as INodeTypes;
	}

	function createWorkflowInstance(
		id: IWorkflowDb['id'],
		name: IWorkflowDb['name'],
		nodes: IWorkflowDb['nodes'],
		connections: IWorkflowDb['connections'],
		settings: IWorkflowDb['settings'],
		pinData: IWorkflowDb['pinData'],
		copyData?: boolean,
	): Workflow {
		const nodeTypes = createNodeTypesForWorkflowObject();
		let workflowId: string | undefined = id;
		if (workflowId && workflowId === PLACEHOLDER_EMPTY_WORKFLOW_ID) {
			workflowId = undefined;
		}

		return new Workflow({
			id: workflowId,
			name,
			nodes: copyData ? deepCopy(nodes) : nodes,
			connections: copyData ? deepCopy(connections) : connections,
			active: false,
			nodeTypes,
			settings,
			pinData,
		});
	}

	function getWorkflowInstance(id: string, copyData?: boolean): Workflow {
		const nodes = getWorkflowNodes(id);
		const connections = getWorkflowConnections(id);
		const cacheKey = JSON.stringify({ nodes, connections });

		const cacheEntry = workflowInstancesCacheById.value[id];
		if (!copyData && cacheEntry && cacheKey === cacheEntry.key) {
			return cacheEntry.workflow;
		}

		const name = getWorkflowName(id);
		const settings = getWorkflowSettings(id);
		const pinData = getWorkflowPinData(id);
		const workflowObject = createWorkflowInstance(
			id,
			name,
			nodes,
			connections,
			settings,
			pinData,
			copyData,
		);
		workflowInstancesCacheById.value[id] = { key: cacheKey, workflow: workflowObject };
		return workflowObject;
	}

	// Returns a shallow copy of the nodes which means that all the data on the lower
	// levels still only gets referenced but the top level object is a different one.
	// This has the advantage that it is very fast and does not cause problems with vuex
	// when the workflow replaces the node-parameters.
	function getWorkflowNodes(id: string): IWorkflowDb['nodes'] {
		return workflowsById.value[id].nodes.map((node) => ({ ...node }));
	}

	function getWorkflowConnections(id: string): IWorkflowDb['connections'] {
		return { ...workflowsById.value[id].connections };
	}

	function getWorkflowSettings(id: string): IWorkflowDb['settings'] {
		return workflowsById.value[id].settings ?? { ...defaultWorkflowSettings.settings };
	}

	function getWorkflowName(id: string): IWorkflowDb['name'] {
		return workflowsById.value[id].name;
	}

	function getWorkflowPinData(id: string): IWorkflowDb['pinData'] {
		return workflowsById.value[id].pinData;
	}

	async function runWorkflow(
		workflowId: string,
		options: {
			destinationNode?: string;
			triggerNode?: string;
			nodeData?: ITaskData;
			source?: string;
		},
	) {
		const workflow = workflowsById.value[workflowId];
		console.log('runWorkflow', workflow);
		console.log('options', options);
		// TODO: Implement behavior from 'runWorkflow' in useRunWorkflow.ts using the new workflow store
	}

	function finishActiveExecution(
		workflowId: string,
		finishedActiveExecution: IPushDataExecutionFinished | IPushDataUnsavedExecutionFinished,
	) {
		const workflow = workflowsById.value[workflowId];
		console.log('workflow', workflow);
		console.log('finishedActiveExecution', finishedActiveExecution);
		// TODO: Implement behavior from old workflows store
		// Execution data should be stored in the executions store and not in the workflows store
		// The workflow store should only be responsible for the workflow data itself
	}

	return {
		workflowsById,
		workflows,
		addWorkflow,
		removeWorkflow,
		fetchWorkflow,
		getWorkflowObject: getWorkflowInstance,
		runWorkflow,
		finishActiveExecution,
	};
});
