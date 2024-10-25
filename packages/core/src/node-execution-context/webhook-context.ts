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
	IWebhookData,
	IWebhookFunctions,
	IWorkflowExecuteAdditionalData,
	NodeConnectionType,
	NodeParameterValueType,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { ApplicationError, createDeferredPromise } from 'n8n-workflow';

import {
	copyBinaryFile,
	getAdditionalKeys,
	getCredentials,
	getInputConnectionData,
	getNodeParameter,
	getNodeWebhookUrl,
	returnJsonArray,
} from '@/NodeExecuteFunctions';
import { BaseContext } from './base-contexts';
import { BinaryHelpers } from './helpers/binary-helpers';
import { RequestHelpers } from './helpers/request-helpers';

export class WebhookContext extends BaseContext implements IWebhookFunctions {
	readonly helpers: IWebhookFunctions['helpers'];

	readonly nodeHelpers: IWebhookFunctions['nodeHelpers'];

	constructor(
		workflow: Workflow,
		node: INode,
		additionalData: IWorkflowExecuteAdditionalData,
		private readonly mode: WorkflowExecuteMode,
		private readonly webhookData: IWebhookData,
		private readonly closeFunctions: CloseFunction[],
		private readonly runExecutionData: IRunExecutionData | null,
	) {
		super(workflow, node, additionalData);

		const binaryHelpers = new BinaryHelpers(workflow, additionalData);
		const requestHelpers = new RequestHelpers(this, workflow, node, additionalData);

		this.helpers = {
			createDeferredPromise: () => createDeferredPromise(),
			returnJsonArray: (items) => returnJsonArray(items),

			getBinaryPath: (id) => binaryHelpers.getBinaryPath(id),
			getBinaryMetadata: (id) => binaryHelpers.getBinaryMetadata(id),
			getBinaryStream: (id) => binaryHelpers.getBinaryStream(id),
			binaryToBuffer: (body) => binaryHelpers.binaryToBuffer(body),
			binaryToString: (body) => binaryHelpers.binaryToString(body),
			prepareBinaryData: binaryHelpers.prepareBinaryData.bind(binaryHelpers),
			setBinaryDataBuffer: binaryHelpers.setBinaryDataBuffer.bind(binaryHelpers),
			copyBinaryFile: () => binaryHelpers.copyBinaryFile(),

			httpRequest: requestHelpers.httpRequest.bind(requestHelpers),
			httpRequestWithAuthentication:
				requestHelpers.httpRequestWithAuthentication.bind(requestHelpers),
			requestWithAuthenticationPaginated:
				requestHelpers.requestWithAuthenticationPaginated.bind(requestHelpers),
			request: requestHelpers.request.bind(requestHelpers),
			requestWithAuthentication: requestHelpers.requestWithAuthentication.bind(requestHelpers),
			requestOAuth1: requestHelpers.requestOAuth1.bind(requestHelpers),
			requestOAuth2: requestHelpers.requestOAuth2.bind(requestHelpers),
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

	getMode() {
		return this.mode;
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

		return await getInputConnectionData(
			this,
			this.workflow,
			runExecutionData,
			runIndex,
			connectionInputData,
			this.additionalData,
			executeData,
			this.mode,
			this.closeFunctions,
			inputName,
			itemIndex,
		);
	}

	evaluateExpression(expression: string, evaluateItemIndex?: number) {
		const itemIndex = evaluateItemIndex === undefined ? 0 : evaluateItemIndex;
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
