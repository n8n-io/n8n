import type { Request, Response } from 'express';
import type {
	CloseFunction,
	ICredentialDataDecryptedObject,
	IDataObject,
	IExecuteData,
	IGetNodeParameterOptions,
	INode,
	INodeExecutionData,
	IRunExecutionData,
	ITaskDataConnections,
	IWebhookData,
	IWebhookFunctions,
	IWorkflowExecuteAdditionalData,
	NodeConnectionType,
	NodeParameterValueType,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { ApplicationError, createDeferredPromise } from 'n8n-workflow';

// eslint-disable-next-line import/no-cycle
import {
	copyBinaryFile,
	getAdditionalKeys,
	getCredentials,
	getInputConnectionData,
	getNodeParameter,
	getNodeWebhookUrl,
	returnJsonArray,
} from '@/NodeExecuteFunctions';

import { BinaryHelpers } from './helpers/binary-helpers';
import { RequestHelpers } from './helpers/request-helpers';
import { NodeExecutionContext } from './node-execution-context';

export class WebhookContext extends NodeExecutionContext implements IWebhookFunctions {
	readonly helpers: IWebhookFunctions['helpers'];

	readonly nodeHelpers: IWebhookFunctions['nodeHelpers'];

	constructor(
		workflow: Workflow,
		node: INode,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		private readonly webhookData: IWebhookData,
		private readonly closeFunctions: CloseFunction[],
		private readonly runExecutionData: IRunExecutionData | null,
	) {
		super(workflow, node, additionalData, mode);

		this.helpers = {
			createDeferredPromise,
			returnJsonArray,
			...new BinaryHelpers(workflow, additionalData).exported,
			...new RequestHelpers(this, workflow, node, additionalData).exported,
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
	}

	async getCredentials<T extends object = ICredentialDataDecryptedObject>(type: string) {
		return await getCredentials<T>(this.workflow, this.node, type, this.additionalData, this.mode);
	}

	getBodyData() {
		if (this.additionalData.httpRequest === undefined) {
			throw new ApplicationError('Request is missing');
		}
		return this.additionalData.httpRequest.body as IDataObject;
	}

	getHeaderData() {
		if (this.additionalData.httpRequest === undefined) {
			throw new ApplicationError('Request is missing');
		}
		return this.additionalData.httpRequest.headers;
	}

	getParamsData(): object {
		if (this.additionalData.httpRequest === undefined) {
			throw new ApplicationError('Request is missing');
		}
		return this.additionalData.httpRequest.params;
	}

	getQueryData(): object {
		if (this.additionalData.httpRequest === undefined) {
			throw new ApplicationError('Request is missing');
		}
		return this.additionalData.httpRequest.query;
	}

	getRequestObject(): Request {
		if (this.additionalData.httpRequest === undefined) {
			throw new ApplicationError('Request is missing');
		}
		return this.additionalData.httpRequest;
	}

	getResponseObject(): Response {
		if (this.additionalData.httpResponse === undefined) {
			throw new ApplicationError('Response is missing');
		}
		return this.additionalData.httpResponse;
	}

	getNodeWebhookUrl(name: string): string | undefined {
		return getNodeWebhookUrl(
			name,
			this.workflow,
			this.node,
			this.additionalData,
			this.mode,
			getAdditionalKeys(this.additionalData, this.mode, null),
		);
	}

	getWebhookName() {
		return this.webhookData.webhookDescription.name;
	}

	async getInputConnectionData(inputName: NodeConnectionType, itemIndex: number): Promise<unknown> {
		// To be able to use expressions like "$json.sessionId" set the
		// body data the webhook received to what is normally used for
		// incoming node data.
		const connectionInputData: INodeExecutionData[] = [
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			{ json: this.additionalData.httpRequest?.body || {} },
		];
		const runExecutionData: IRunExecutionData = {
			resultData: {
				runData: {},
			},
		};
		const executeData: IExecuteData = {
			data: {
				main: [connectionInputData],
			},
			node: this.node,
			source: null,
		};
		const runIndex = 0;

		return await getInputConnectionData.call(
			this,
			this.workflow,
			runExecutionData,
			runIndex,
			connectionInputData,
			{} as ITaskDataConnections,
			this.additionalData,
			executeData,
			this.mode,
			this.closeFunctions,
			inputName,
			itemIndex,
		);
	}

	evaluateExpression(expression: string, evaluateItemIndex?: number) {
		const itemIndex = evaluateItemIndex ?? 0;
		const runIndex = 0;

		let connectionInputData: INodeExecutionData[] = [];
		let executionData: IExecuteData | undefined;

		if (this.runExecutionData?.executionData !== undefined) {
			executionData = this.runExecutionData.executionData.nodeExecutionStack[0];

			if (executionData !== undefined) {
				connectionInputData = executionData.data.main[0]!;
			}
		}

		const additionalKeys = getAdditionalKeys(this.additionalData, this.mode, this.runExecutionData);

		return this.workflow.expression.resolveSimpleParameterValue(
			`=${expression}`,
			{},
			this.runExecutionData,
			runIndex,
			itemIndex,
			this.node.name,
			connectionInputData,
			this.mode,
			additionalKeys,
			executionData,
		);
	}

	getNodeParameter(
		parameterName: string,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		fallbackValue?: any,
		options?: IGetNodeParameterOptions,
	): NodeParameterValueType | object {
		const itemIndex = 0;
		const runIndex = 0;

		let connectionInputData: INodeExecutionData[] = [];
		let executionData: IExecuteData | undefined;

		if (this.runExecutionData?.executionData !== undefined) {
			executionData = this.runExecutionData.executionData.nodeExecutionStack[0];

			if (executionData !== undefined) {
				connectionInputData = executionData.data.main[0]!;
			}
		}

		const additionalKeys = getAdditionalKeys(this.additionalData, this.mode, this.runExecutionData);

		return getNodeParameter(
			this.workflow,
			this.runExecutionData,
			runIndex,
			connectionInputData,
			this.node,
			parameterName,
			itemIndex,
			this.mode,
			additionalKeys,
			executionData,
			fallbackValue,
			options,
		);
	}
}
