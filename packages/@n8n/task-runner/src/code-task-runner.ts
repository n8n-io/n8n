import type {
	CodeExecutionMode,
	EnvProviderState,
	IDataObject,
	IExecuteData,
	INode,
	INodeExecutionData,
	INodeParameters,
	INodeTypeDescription,
	IRunExecutionData,
	ITaskDataConnections,
	WorkflowExecuteMode,
	WorkflowParameters,
} from 'n8n-workflow';
import * as a from 'node:assert';

import { DataRequestResponseReconstruct } from './data-request/data-request-response-reconstruct';
import type { BuiltInsParserState } from './js-task-runner/built-ins-parser/built-ins-parser-state';
import type {
	DataRequestResponse,
	InputDataChunkDefinition,
	PartialAdditionalData,
} from './runner-types';
import type { TaskRunnerOpts } from './task-runner';
import { TaskRunner } from './task-runner';

export interface RpcCallObject {
	[name: string]: ((...args: unknown[]) => Promise<unknown>) | RpcCallObject;
}

export interface CodeExecSettings {
	code: string;
	nodeMode: CodeExecutionMode;
	workflowMode: WorkflowExecuteMode;
	continueOnFail: boolean;
	// For executing partial input data
	chunk?: InputDataChunkDefinition;
}

export interface CodeTaskData {
	workflow: Omit<WorkflowParameters, 'nodeTypes'>;
	inputData: ITaskDataConnections;
	connectionInputData: INodeExecutionData[];
	node: INode;

	runExecutionData: IRunExecutionData;
	runIndex: number;
	itemIndex: number;
	activeNodeName: string;
	siblingParameters: INodeParameters;
	mode: WorkflowExecuteMode;
	envProviderState: EnvProviderState;
	executeData?: IExecuteData;
	defaultReturnRunIndex: number;
	selfData: IDataObject;
	contextNodeName: string;
	additionalData: PartialAdditionalData;
}

export class CodeTaskRunner extends TaskRunner {
	protected readonly taskDataReconstruct = new DataRequestResponseReconstruct();

	constructor(opts: TaskRunnerOpts) {
		super(opts);
	}

	protected validateTaskSettings(settings: CodeExecSettings) {
		a.ok(settings.code, 'No code to execute');

		if (settings.nodeMode === 'runOnceForAllItems') {
			a.ok(settings.chunk === undefined, 'Chunking is not supported for runOnceForAllItems');
		}
	}

	protected reconstructTaskData(
		response: DataRequestResponse,
		chunk?: InputDataChunkDefinition,
	): CodeTaskData {
		const inputData = this.taskDataReconstruct.reconstructConnectionInputItems(
			response.inputData,
			chunk,
			// This type assertion is intentional. Chunking is only supported in
			// runOnceForEachItem mode and if a chunk was requested, we intentionally
			// fill the array with undefined values for the items outside the chunk.
			// We only iterate over the chunk items but WorkflowDataProxy expects
			// the full array of items.
		) as INodeExecutionData[];

		return {
			...response,
			connectionInputData: inputData,
			executeData: this.taskDataReconstruct.reconstructExecuteData(response, inputData),
		};
	}

	protected async requestNodeTypeIfNeeded(
		neededBuiltIns: BuiltInsParserState,
		workflow: CodeTaskData['workflow'],
		taskId: string,
	) {
		/**
		 * We request node types only when we know a task needs all nodes, because
		 * needing all nodes means that the task relies on paired item functionality,
		 * which is the same requirement for needing node types.
		 */
		if (neededBuiltIns.needsAllNodes) {
			const uniqueNodeTypes = new Map(
				workflow.nodes.map((node) => [
					`${node.type}|${node.typeVersion}`,
					{ name: node.type, version: node.typeVersion },
				]),
			);

			const unknownNodeTypes = this.nodeTypes.onlyUnknown([...uniqueNodeTypes.values()]);

			const nodeTypes = await this.requestNodeTypes<INodeTypeDescription[]>(
				taskId,
				unknownNodeTypes,
			);

			this.nodeTypes.addNodeTypeDescriptions(nodeTypes);
		}
	}
}
