import type { JsonObject, JsonValue, StepExecutionRequest, WorkflowGraph } from '@n8n/engine';
import type { ExecuteContext } from 'n8n-core';
import { NoOp } from 'n8n-nodes-base/nodes/NoOp/NoOp.node';
import type {
	CloseFunction,
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	INodeTypes,
	IVersionedNodeType,
	IWorkflowBase,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import { Node, NodeConnectionTypes } from 'n8n-workflow';

class EchoParam implements INodeType {
	description = {
		displayName: 'Echo Param',
		name: 'echoParam',
		group: ['transform'],
		version: 1,
		description: 'Echoes a parameter',
		defaults: { name: 'Echo Param' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [{ displayName: 'Message', name: 'message', type: 'string', default: '' }],
	} as unknown as INodeType['description'];

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		return await Promise.resolve([
			items.map((_, i) => ({
				json: { message: this.getNodeParameter('message', i) as string },
			})),
		]);
	}
}

class AlwaysFails implements INodeType {
	description = {
		displayName: 'Always Fails',
		name: 'alwaysFails',
		group: ['transform'],
		version: 1,
		description: 'Throws',
		defaults: { name: 'Always Fails' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [],
	} as unknown as INodeType['description'];

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return await Promise.reject(new Error('boom from node'));
	}
}

class NoExecute implements INodeType {
	description = {
		displayName: 'No Execute',
		name: 'noExecute',
		group: ['trigger'],
		version: 1,
		description: 'Cannot run as a step',
		defaults: { name: 'No Execute' },
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [],
	} as unknown as INodeType['description'];
}

class NewStyleEcho extends Node {
	description = {
		displayName: 'New Style Echo',
		name: 'newStyleEcho',
		group: ['transform'],
		version: 1,
		description: 'New context API node',
		defaults: { name: 'New Style Echo' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [],
	} as unknown as INodeTypeDescription;

	async execute(context: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return await Promise.resolve([
			context.getInputData().map((item) => ({ json: { ...item.json, newStyle: true } })),
		]);
	}
}

const pushCloseFunction = (context: IExecuteFunctions, close: CloseFunction) => {
	(context as unknown as ExecuteContext).closeFunctions.push(close);
};

class SucceedsWithFailingCleanup implements INodeType {
	description = {
		displayName: 'Succeeds With Failing Cleanup',
		name: 'succeedsWithFailingCleanup',
		group: ['transform'],
		version: 1,
		description: 'Registers failing cleanup',
		defaults: { name: 'Succeeds With Failing Cleanup' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [],
	} as unknown as INodeType['description'];

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		pushCloseFunction(this, async () => {
			return await Promise.reject(new Error('cleanup boom'));
		});
		return await Promise.resolve([this.getInputData()]);
	}
}

class FailsWithFailingCleanup implements INodeType {
	description = {
		displayName: 'Fails With Failing Cleanup',
		name: 'failsWithFailingCleanup',
		group: ['transform'],
		version: 1,
		description: 'Fails and registers failing cleanup',
		defaults: { name: 'Fails With Failing Cleanup' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [],
	} as unknown as INodeType['description'];

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		pushCloseFunction(this, async () => {
			return await Promise.reject(new Error('cleanup boom'));
		});
		return await Promise.reject(new Error('boom from node'));
	}
}

class ReturnsEngineRequest extends Node {
	description = {
		displayName: 'Returns Engine Request',
		name: 'returnsEngineRequest',
		group: ['transform'],
		version: 1,
		description: 'Returns a sub-node execution request',
		defaults: { name: 'Returns Engine Request' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [],
	} as unknown as INodeTypeDescription;

	async execute(): Promise<INodeExecutionData[][]> {
		return await Promise.resolve({
			actions: [],
			metadata: {},
		} as unknown as INodeExecutionData[][]);
	}
}

const registry = new Map<string, INodeType>([
	['n8n-nodes-base.noOp', new NoOp()],
	['test.echoParam', new EchoParam()],
	['test.alwaysFails', new AlwaysFails()],
	['test.noExecute', new NoExecute()],
	['test.newStyleEcho', new NewStyleEcho() as unknown as INodeType],
	['test.succeedsWithFailingCleanup', new SucceedsWithFailingCleanup()],
	['test.failsWithFailingCleanup', new FailsWithFailingCleanup()],
	['test.returnsEngineRequest', new ReturnsEngineRequest() as unknown as INodeType],
]);

export const testNodeTypes: INodeTypes = {
	getByName: (type: string): INodeType | IVersionedNodeType => registry.get(type)!,
	getByNameAndVersion: (type: string): INodeType => registry.get(type)!,
	getKnownTypes: (): IDataObject => ({}),
};

export const testAdditionalDataFactory = async (
	executionId: string,
): Promise<IWorkflowExecuteAdditionalData> =>
	await Promise.resolve({
		executionId,
		restApiUrl: 'http://localhost:5678/rest',
		instanceBaseUrl: 'http://localhost:5678',
		webhookBaseUrl: 'http://localhost:5678/webhook',
		webhookTestBaseUrl: 'http://localhost:5678/webhook-test',
		webhookWaitingBaseUrl: 'http://localhost:5678/webhook-waiting',
		formWaitingBaseUrl: 'http://localhost:5678/form-waiting',
		variables: {},
		hooks: undefined,
		credentialsHelper: undefined,
	} as unknown as IWorkflowExecuteAdditionalData);

export const v1Workflow = (
	nodes: Array<{ id: string; name: string; type: string; parameters?: IDataObject }>,
): IWorkflowBase =>
	({
		id: 'wf-1',
		name: 'fixture',
		active: false,
		nodes: nodes.map((n) => ({ typeVersion: 1, position: [0, 0], parameters: {}, ...n })),
		connections: {},
	}) as unknown as IWorkflowBase;

export const stepRequest = (
	graph: WorkflowGraph,
	nodeId: string,
	inputs: JsonValue,
): StepExecutionRequest => ({
	node: graph.nodes.find((n) => n.id === nodeId)!,
	inputs,
	context: { executionId: 'exec-1', stepId: 'step-1', workflowId: 'wf-1', mode: 'manual' },
});

export const items = (...objects: JsonObject[]): JsonValue => [objects.map((json) => ({ json }))];
