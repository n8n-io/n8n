import type { Request, Response } from 'express';
import type {
	AINodeConnectionType,
	CloseFunction,
	CredentialCheckResult,
	ICredentialDataDecryptedObject,
	IDataObject,
	IExecuteData,
	INode,
	INodeExecutionData,
	IRunExecutionData,
	ITaskDataConnections,
	IUser,
	IWebhookData,
	IWebhookFunctions,
	IWorkflowExecuteAdditionalData,
	N8nOAuth2ValidationResult,
	WebhookType,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { UnexpectedError, createDeferredPromise, createEmptyRunExecutionData } from 'n8n-workflow';

import { NodeExecutionContext } from './node-execution-context';
import { copyBinaryFile, getBinaryHelperFunctions } from './utils/binary-helper-functions';
import { getInputConnectionData } from './utils/get-input-connection-data';
import { getRequestHelperFunctions } from './utils/request-helper-functions';
import { returnJsonArray } from './utils/return-json-array';
import { getNodeWebhookUrl } from './utils/webhook-helper-functions';
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
		runExecutionData: IRunExecutionData | null,
	) {
		let connectionInputData: INodeExecutionData[] = [];
		let executionData: IExecuteData | undefined;

		if (runExecutionData?.executionData !== undefined) {
			executionData = runExecutionData.executionData.nodeExecutionStack[0];
			if (executionData !== undefined) {
				connectionInputData = executionData.data.main[0] ?? [];
			}
		}

		if (executionData === undefined && additionalData.httpRequest) {
			const req = additionalData.httpRequest;
			connectionInputData = [
				{
					json: {
						body: (req.body ?? {}) as IDataObject,
						headers: req.headers,
						params: req.params as IDataObject,
						query: req.query as IDataObject,
					},
				},
			];
		}

		super(
			workflow,
			node,
			additionalData,
			mode,
			runExecutionData,
			0,
			connectionInputData,
			executionData,
		);

		this.helpers = {
			createDeferredPromise,
			returnJsonArray,
			...getRequestHelperFunctions(workflow, node, additionalData),
			...getBinaryHelperFunctions(additionalData, workflow.id),
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
		return await this._getCredentials<T>(type);
	}

	getBodyData() {
		return this.assertHttpRequest().body as IDataObject;
	}

	getHeaderData() {
		return this.assertHttpRequest().headers;
	}

	getParamsData(): object {
		return this.assertHttpRequest().params;
	}

	getQueryData(): object {
		return this.assertHttpRequest().query;
	}

	getRequestObject(): Request {
		return this.assertHttpRequest();
	}

	getResponseObject(): Response {
		if (this.additionalData.httpResponse === undefined) {
			throw new UnexpectedError('Response is missing');
		}
		return this.additionalData.httpResponse;
	}

	private assertHttpRequest() {
		const { httpRequest } = this.additionalData;
		if (httpRequest === undefined) {
			throw new UnexpectedError('Request is missing');
		}
		return httpRequest;
	}

	getNodeWebhookUrl(name: WebhookType): string | undefined {
		// MCP webhooks are served under dedicated /mcp and /mcp-test endpoints; the OAuth
		// resource URL must match the endpoint the request actually arrived on. Other webhook
		// types keep their existing behaviour (production base) here.
		const isTest =
			this.webhookData.webhookDescription.nodeType === 'mcp' ? this.webhookData.isTest : undefined;

		return getNodeWebhookUrl(
			name,
			this.workflow,
			this.node,
			this.additionalData,
			this.mode,
			this.additionalKeys,
			isTest,
		);
	}

	getWebhookName() {
		return this.webhookData.webhookDescription.name;
	}

	async validateCookieAuth(cookieValue: string): Promise<IUser> {
		if (!this.additionalData.validateCookieAuth) {
			throw new UnexpectedError('Cookie auth validation is not available');
		}
		return await this.additionalData.validateCookieAuth(cookieValue);
	}

	async validateN8nOAuth2Token(
		token: string,
		resourceUrl: string,
	): Promise<N8nOAuth2ValidationResult> {
		if (!this.additionalData.validateN8nOAuth2Token) {
			throw new UnexpectedError('OAuth2 token validation is not available');
		}
		return await this.additionalData.validateN8nOAuth2Token(token, resourceUrl);
	}

	async establishTriggerIdentity(token: string, resource: string): Promise<void> {
		if (!this.additionalData.establishTriggerIdentity) {
			throw new UnexpectedError('Trigger identity establishment is not available');
		}
		await this.additionalData.establishTriggerIdentity(token, resource);
	}

	async checkTriggerCredentialStatus(): Promise<CredentialCheckResult | undefined> {
		if (!this.additionalData.checkTriggerCredentialStatus) {
			return undefined;
		}
		return await this.additionalData.checkTriggerCredentialStatus();
	}

	async getInputConnectionData(
		connectionType: AINodeConnectionType,
		itemIndex: number,
	): Promise<unknown> {
		// To be able to use expressions like "$json.sessionId" set the
		// body data the webhook received to what is normally used for
		// incoming node data.
		const connectionInputData: INodeExecutionData[] = [
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			{ json: this.additionalData.httpRequest?.body || {} },
		];
		const runExecutionData = this.runExecutionData ?? createEmptyRunExecutionData();
		const executeData: IExecuteData = {
			data: {
				main: [connectionInputData],
			},
			node: this.node,
			source: null,
		};

		return await getInputConnectionData.call(
			this,
			this.workflow,
			runExecutionData,
			this.runIndex,
			connectionInputData,
			{} as ITaskDataConnections,
			this.additionalData,
			executeData,
			this.mode,
			this.closeFunctions,
			connectionType,
			itemIndex,
		);
	}
}
