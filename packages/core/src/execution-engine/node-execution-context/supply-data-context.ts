import get from 'lodash/get';
import type {
	AINodeConnectionType,
	CloseFunction,
	ExecutionBaseError,
	IExecuteData,
	IGetNodeParameterOptions,
	INode,
	INodeExecutionData,
	IRunExecutionData,
	ISupplyDataFunctions,
	ITaskData,
	ITaskDataConnections,
	ITaskMetadata,
	IWorkflowExecuteAdditionalData,
	Workflow,
	WorkflowExecuteMode,
	NodeConnectionType,
	ISourceData,
} from 'n8n-workflow';
import { createDeferredPromise, jsonParse, NodeConnectionTypes } from 'n8n-workflow';

import { BaseExecuteContext } from './base-execute-context';
import {
	assertBinaryData,
	detectBinaryEncoding,
	getBinaryDataBuffer,
	getBinaryHelperFunctions,
} from './utils/binary-helper-functions';
import { constructExecutionMetaData } from './utils/construct-execution-metadata';
import { copyInputItems } from './utils/copy-input-items';
import { getDataStoreHelperFunctions } from './utils/data-store-helper-functions';
import { getDeduplicationHelperFunctions } from './utils/deduplication-helper-functions';
import { getFileSystemHelperFunctions } from './utils/file-system-helper-functions';
// eslint-disable-next-line import-x/no-cycle
import { getInputConnectionData } from './utils/get-input-connection-data';
import { normalizeItems } from './utils/normalize-items';
import { getRequestHelperFunctions } from './utils/request-helper-functions';
import { returnJsonArray } from './utils/return-json-array';
import { getSSHTunnelFunctions } from './utils/ssh-tunnel-helper-functions';

export class SupplyDataContext extends BaseExecuteContext implements ISupplyDataFunctions {
	readonly helpers: ISupplyDataFunctions['helpers'];

	readonly getNodeParameter: ISupplyDataFunctions['getNodeParameter'];

	readonly parentNode?: INode;

	constructor(
		workflow: Workflow,
		node: INode,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		runExecutionData: IRunExecutionData,
		runIndex: number,
		connectionInputData: INodeExecutionData[],
		inputData: ITaskDataConnections,
		private readonly connectionType: NodeConnectionType,
		executeData: IExecuteData,
		private readonly closeFunctions: CloseFunction[],
		abortSignal?: AbortSignal,
		parentNode?: INode,
	) {
		super(
			workflow,
			node,
			additionalData,
			mode,
			runExecutionData,
			runIndex,
			connectionInputData,
			inputData,
			executeData,
			abortSignal,
		);

		this.parentNode = parentNode;

		this.helpers = {
			createDeferredPromise,
			copyInputItems,
			...getRequestHelperFunctions(
				workflow,
				node,
				additionalData,
				runExecutionData,
				connectionInputData,
			),
			...getSSHTunnelFunctions(),
			...getFileSystemHelperFunctions(node),
			...getBinaryHelperFunctions(additionalData, workflow.id),
			...getDataStoreHelperFunctions(additionalData, workflow, node),
			...getDeduplicationHelperFunctions(workflow, node),
			assertBinaryData: (itemIndex, propertyName) =>
				assertBinaryData(inputData, node, itemIndex, propertyName, 0),
			getBinaryDataBuffer: async (itemIndex, propertyName) =>
				await getBinaryDataBuffer(inputData, itemIndex, propertyName, 0),
			detectBinaryEncoding: (buffer: Buffer) => detectBinaryEncoding(buffer),

			returnJsonArray,
			normalizeItems,
			constructExecutionMetaData,
		};

		this.getNodeParameter = ((
			parameterName: string,
			itemIndex: number,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			fallbackValue?: any,
			options?: IGetNodeParameterOptions,
		) =>
			this._getNodeParameter(
				parameterName,
				itemIndex,
				fallbackValue,
				options,
			)) as ISupplyDataFunctions['getNodeParameter'];
	}

	cloneWith(replacements: {
		runIndex: number;
		inputData: INodeExecutionData[][];
	}): SupplyDataContext {
		const context = new SupplyDataContext(
			this.workflow,
			this.node,
			this.additionalData,
			this.mode,
			this.runExecutionData,
			replacements.runIndex,
			this.connectionInputData,
			{},
			this.connectionType,
			this.executeData,
			this.closeFunctions,
			this.abortSignal,
			this.parentNode,
		);
		context.addInputData(NodeConnectionTypes.AiTool, replacements.inputData);
		return context;
	}

	async getInputConnectionData(
		connectionType: AINodeConnectionType,
		itemIndex: number,
	): Promise<unknown> {
		return await getInputConnectionData.call(
			this,
			this.workflow,
			this.runExecutionData,
			this.runIndex,
			this.connectionInputData,
			this.inputData,
			this.additionalData,
			this.executeData,
			this.mode,
			this.closeFunctions,
			connectionType,
			itemIndex,
			this.abortSignal,
		);
	}

	getInputData(inputIndex = 0, connectionType = this.connectionType) {
		if (!this.inputData.hasOwnProperty(connectionType)) {
			// Return empty array because else it would throw error when nothing is connected to input
			return [];
		}
		return super.getInputItems(inputIndex, connectionType) ?? [];
	}

	getNextRunIndex(): number {
		const nodeName = this.node.name;
		return this.runExecutionData.resultData.runData[nodeName]?.length ?? 0;
	}

	/** @deprecated create a context object with inputData for every runIndex */
	addInputData(
		connectionType: AINodeConnectionType,
		data: INodeExecutionData[][],
		runIndex?: number,
	): { index: number } {
		const nodeName = this.node.name;
		const currentNodeRunIndex = this.getNextRunIndex();

		this.addExecutionDataFunctions(
			'input',
			data,
			connectionType,
			nodeName,
			currentNodeRunIndex,
			undefined,
			runIndex,
		).catch((error) => {
			this.logger.warn(
				`There was a problem logging input data of node "${nodeName}": ${
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
					error.message
				}`,
			);
		});

		return { index: currentNodeRunIndex };
	}

	/** @deprecated Switch to WorkflowExecute to store output on runExecutionData.resultData.runData */
	addOutputData(
		connectionType: AINodeConnectionType,
		currentNodeRunIndex: number,
		data: INodeExecutionData[][] | ExecutionBaseError,
		metadata?: ITaskMetadata,
		sourceNodeRunIndex?: number,
	): void {
		const nodeName = this.node.name;
		this.addExecutionDataFunctions(
			'output',
			data,
			connectionType,
			nodeName,
			currentNodeRunIndex,
			metadata,
			sourceNodeRunIndex,
		).catch((error) => {
			this.logger.warn(
				`There was a problem logging output data of node "${nodeName}": ${
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
					error.message
				}`,
			);
		});
	}

	async addExecutionDataFunctions(
		type: 'input' | 'output',
		data: INodeExecutionData[][] | ExecutionBaseError,
		connectionType: AINodeConnectionType,
		sourceNodeName: string,
		currentNodeRunIndex: number,
		metadata?: ITaskMetadata,
		sourceNodeRunIndex?: number,
	): Promise<void> {
		const {
			additionalData,
			runExecutionData,
			runIndex: currentRunIndex,
			node: { name: nodeName },
		} = this;

		let taskData: ITaskData | undefined;
		const source: ISourceData[] = this.parentNode
			? [
					{
						previousNode: this.parentNode.name,
						previousNodeRun: sourceNodeRunIndex ?? currentRunIndex,
					},
				]
			: [];

		if (type === 'input') {
			taskData = {
				startTime: Date.now(),
				executionTime: 0,
				executionIndex: additionalData.currentNodeExecutionIndex++,
				executionStatus: 'running',
				source,
			};
		} else {
			// At the moment we expect that there is always an input sent before the output
			taskData = get(
				runExecutionData,
				['resultData', 'runData', nodeName, currentNodeRunIndex],
				undefined,
			);
			if (taskData === undefined) {
				return;
			}
			taskData.metadata = metadata;
			taskData.source = source;
		}
		taskData = taskData!;

		if (data instanceof Error) {
			// if running node was already marked as "canceled" because execution was aborted
			// leave as "canceled" instead of showing "This operation was aborted" error
			if (
				!(type === 'output' && this.abortSignal?.aborted && taskData.executionStatus === 'canceled')
			) {
				taskData.executionStatus = 'error';
				taskData.error = data;
			}
		} else {
			if (type === 'output') {
				taskData.executionStatus = 'success';
			}
			taskData.data = {
				[connectionType]: data,
			} as ITaskDataConnections;
		}

		if (type === 'input') {
			if (!(data instanceof Error)) {
				this.inputData[connectionType] = data;
				// TODO: remove inputOverride
				taskData.inputOverride = {
					[connectionType]: data,
				} as ITaskDataConnections;
			}

			if (!runExecutionData.resultData.runData.hasOwnProperty(nodeName)) {
				runExecutionData.resultData.runData[nodeName] = [];
			}

			runExecutionData.resultData.runData[nodeName][currentNodeRunIndex] = taskData;
			await additionalData.hooks?.runHook('nodeExecuteBefore', [nodeName, taskData]);
		} else {
			// Outputs
			taskData.executionTime = Date.now() - taskData.startTime;

			await additionalData.hooks?.runHook('nodeExecuteAfter', [
				nodeName,
				taskData,
				this.runExecutionData,
			]);

			if (get(runExecutionData, 'executionData.metadata', undefined) === undefined) {
				runExecutionData.executionData!.metadata = {};
			}

			let sourceTaskData = runExecutionData.executionData?.metadata?.[sourceNodeName];

			if (!sourceTaskData) {
				runExecutionData.executionData!.metadata[sourceNodeName] = [];
				sourceTaskData = runExecutionData.executionData!.metadata[sourceNodeName];
			}
			if (!sourceTaskData[currentNodeRunIndex]) {
				sourceTaskData[currentNodeRunIndex] = {
					subRun: [],
				};
			}

			sourceTaskData[currentNodeRunIndex].subRun!.push({
				node: nodeName,
				runIndex: currentNodeRunIndex,
			});
		}
	}

	logNodeOutput(...args: unknown[]): void {
		if (this.mode === 'manual') {
			const parsedLogArgs = args.map((arg) =>
				typeof arg === 'string' ? jsonParse(arg, { fallbackValue: arg }) : arg,
			);
			this.sendMessageToUI(...parsedLogArgs);
			return;
		}

		if (process.env.CODE_ENABLE_STDOUT === 'true') {
			console.log(`[Workflow "${this.getWorkflow().id}"][Node "${this.node.name}"]`, ...args);
		}
	}
}
