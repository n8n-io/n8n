import type { BaseCallbackConfig, CallbackManager } from '@langchain/core/callbacks/manager';
import type { BaseOutputParser } from '@langchain/core/output_parsers';
import type { DynamicStructuredTool, Tool } from '@langchain/core/tools';
import type {
	AINodeConnectionType,
	AiRootNodeExecuteFunctions,
	CloseFunction,
	IExecuteData,
	IExecuteFunctions,
	IExecuteResponsePromiseData,
	IGetNodeParameterOptions,
	INode,
	INodeExecutionData,
	IRunExecutionData,
	ITaskDataConnections,
	IWorkflowExecuteAdditionalData,
	Result,
	TracingConfig,
	Workflow,
	WorkflowExecuteMode,
	ZodObjectAny,
} from 'n8n-workflow';
import {
	ApplicationError,
	createDeferredPromise,
	createEnvProviderState,
	NodeConnectionType,
	NodeOperationError,
} from 'n8n-workflow';

// eslint-disable-next-line import/no-cycle
import {
	returnJsonArray,
	copyInputItems,
	normalizeItems,
	constructExecutionMetaData,
	getInputConnectionData,
	assertBinaryData,
	getBinaryDataBuffer,
	copyBinaryFile,
	getRequestHelperFunctions,
	getBinaryHelperFunctions,
	getSSHTunnelFunctions,
	getFileSystemHelperFunctions,
	getCheckProcessedHelperFunctions,
} from '@/NodeExecuteFunctions';

import { BaseExecuteContext } from './base-execute-context';
import { N8nTool } from './n8n-tool';
import { escapeSingleCurlyBrackets } from './utils';

export class ExecuteContext extends BaseExecuteContext implements IExecuteFunctions {
	readonly helpers: IExecuteFunctions['helpers'];

	readonly nodeHelpers: IExecuteFunctions['nodeHelpers'];

	readonly getNodeParameter: IExecuteFunctions['getNodeParameter'];

	constructor(
		workflow: Workflow,
		node: INode,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		runExecutionData: IRunExecutionData,
		runIndex: number,
		connectionInputData: INodeExecutionData[],
		inputData: ITaskDataConnections,
		executeData: IExecuteData,
		private readonly closeFunctions: CloseFunction[],
		abortSignal?: AbortSignal,
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

		this.helpers = {
			createDeferredPromise,
			returnJsonArray,
			copyInputItems,
			normalizeItems,
			constructExecutionMetaData,
			...getRequestHelperFunctions(
				workflow,
				node,
				additionalData,
				runExecutionData,
				connectionInputData,
			),
			...getBinaryHelperFunctions(additionalData, workflow.id),
			...getSSHTunnelFunctions(),
			...getFileSystemHelperFunctions(node),
			...getCheckProcessedHelperFunctions(workflow, node),

			assertBinaryData: (itemIndex, propertyName) =>
				assertBinaryData(inputData, node, itemIndex, propertyName, 0),
			getBinaryDataBuffer: async (itemIndex, propertyName) =>
				await getBinaryDataBuffer(inputData, itemIndex, propertyName, 0),
		};

		this.nodeHelpers = {
			copyBinaryFile: async (filePath, fileName, mimeType) =>
				await copyBinaryFile(
					this.workflow.id,
					this.additionalData.executionId!,
					filePath,
					fileName,
					mimeType,
				),
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
			)) as IExecuteFunctions['getNodeParameter'];
	}

	async startJob<T = unknown, E = unknown>(
		jobType: string,
		settings: unknown,
		itemIndex: number,
	): Promise<Result<T, E>> {
		return await this.additionalData.startAgentJob<T, E>(
			this.additionalData,
			jobType,
			settings,
			this,
			this.inputData,
			this.node,
			this.workflow,
			this.runExecutionData,
			this.runIndex,
			itemIndex,
			this.node.name,
			this.connectionInputData,
			{},
			this.mode,
			createEnvProviderState(),
			this.executeData,
		);
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

	getInputData(inputIndex = 0, connectionType = NodeConnectionType.Main) {
		if (!this.inputData.hasOwnProperty(connectionType)) {
			// Return empty array because else it would throw error when nothing is connected to input
			return [];
		}
		return super.getInputItems(inputIndex, connectionType) ?? [];
	}

	logNodeOutput(...args: unknown[]): void {
		if (this.mode === 'manual') {
			this.sendMessageToUI(...args);
			return;
		}

		if (process.env.CODE_ENABLE_STDOUT === 'true') {
			console.log(`[Workflow "${this.getWorkflow().id}"][Node "${this.node.name}"]`, ...args);
		}
	}

	async sendResponse(response: IExecuteResponsePromiseData): Promise<void> {
		await this.additionalData.hooks?.executeHookFunctions('sendResponse', [response]);
	}

	/** @deprecated use ISupplyDataFunctions.addInputData */
	addInputData(): { index: number } {
		throw new ApplicationError('addInputData should not be called on IExecuteFunctions');
	}

	/** @deprecated use ISupplyDataFunctions.addOutputData */
	addOutputData(): void {
		throw new ApplicationError('addOutputData should not be called on IExecuteFunctions');
	}

	getParentCallbackManager(): CallbackManager | undefined {
		return this.additionalData.parentCallbackManager;
	}

	getAiRootNodeExecuteFunctions(): AiRootNodeExecuteFunctions {
		const {
			getConnectedTools,
			getPromptInputByType,
			getTracingConfig,
			extractParsedOutput,
			checkForStructuredTools,
		} = this;
		return Object.create(this, {
			getConnectedTools: { value: getConnectedTools },
			getPromptInputByType: { value: getPromptInputByType },
			getTracingConfig: { value: getTracingConfig },
			extractParsedOutput: { value: extractParsedOutput },
			checkForStructuredTools: { value: checkForStructuredTools },
		});
	}

	async getConnectedTools(
		enforceUniqueNames: boolean,
		convertStructuredTool = true,
		escapeCurlyBrackets = false,
	) {
		const connectedTools =
			((await this.getInputConnectionData(NodeConnectionType.AiTool, 0)) as Tool[]) || [];

		if (!enforceUniqueNames) return connectedTools;

		const seenNames = new Set<string>();

		const finalTools = [];

		for (const tool of connectedTools) {
			const { name } = tool;
			if (seenNames.has(name)) {
				throw new NodeOperationError(
					this.node,
					`You have multiple tools with the same name: '${name}', please rename them to avoid conflicts`,
				);
			}
			seenNames.add(name);

			if (escapeCurlyBrackets) {
				tool.description = escapeSingleCurlyBrackets(tool.description) ?? tool.description;
			}

			if (convertStructuredTool && tool instanceof N8nTool) {
				finalTools.push(tool.asDynamicTool());
			} else {
				finalTools.push(tool);
			}
		}

		return finalTools;
	}

	getPromptInputByType(
		itemIndex: number,
		promptTypeKey: string = 'text',
		inputKey: string = 'promptType',
	) {
		const prompt = this.getNodeParameter(promptTypeKey, itemIndex) as string;

		let input;
		if (prompt === 'auto') {
			input = this.evaluateExpression('{{ $json["chatInput"] }}', itemIndex) as string;
		} else {
			input = this.getNodeParameter(inputKey, itemIndex) as string;
		}

		if (input === undefined) {
			throw new NodeOperationError(this.node, 'No prompt specified', {
				description:
					"Expected to find the prompt in an input field called 'chatInput' (this is what the chat trigger node outputs). To use something else, change the 'Prompt' parameter",
			});
		}

		return input;
	}

	getTracingConfig(config: TracingConfig = {}): BaseCallbackConfig {
		const parentRunManager = this.getParentCallbackManager?.();

		return {
			runName: `[${this.workflow.name}] ${this.node.name}`,
			metadata: {
				execution_id: this.getExecutionId(),
				workflow: this.workflow,
				node: this.node.name,
				...(config.additionalMetadata ?? {}),
			},
			callbacks: parentRunManager,
		};
	}

	async extractParsedOutput(
		outputParser: BaseOutputParser<unknown>,
		output: string,
	): Promise<Record<string, unknown> | undefined> {
		const parsedOutput = (await outputParser.parse(output)) as {
			output: Record<string, unknown>;
		};

		if (this.node.typeVersion <= 1.6) {
			return parsedOutput;
		}
		// For 1.7 and above, we try to extract the output from the parsed output
		// with fallback to the original output if it's not present
		return parsedOutput?.output ?? parsedOutput;
	}

	checkForStructuredTools(
		tools: Array<Tool | DynamicStructuredTool<ZodObjectAny>>,
		node: INode,
		currentAgentType: string,
	) {
		const dynamicStructuredTools = tools.filter(
			(tool) => tool.constructor.name === 'DynamicStructuredTool',
		);
		if (dynamicStructuredTools.length > 0) {
			const getToolName = (tool: Tool | DynamicStructuredTool) => `"${tool.name}"`;
			throw new NodeOperationError(
				node,
				`The selected tools are not supported by "${currentAgentType}", please use "Tools Agent" instead`,
				{
					itemIndex: 0,
					description: `Incompatible connected tools: ${dynamicStructuredTools.map(getToolName).join(', ')}`,
				},
			);
		}
	}
}
