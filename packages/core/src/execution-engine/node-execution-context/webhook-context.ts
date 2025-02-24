import type { Request, Response } from 'express';
import type {
	AINodeConnectionType,
	CloseFunction,
	ICredentialDataDecryptedObject,
	IDataObject,
	IExecuteData,
	INode,
	INodeExecutionData,
	IRunExecutionData,
	ITaskDataConnections,
	IWebhookData,
	IWebhookFunctions,
	IWorkflowExecuteAdditionalData,
	WebhookType,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { ApplicationError, createDeferredPromise } from 'n8n-workflow';

import { NodeExecutionContext } from './node-execution-context';
import { copyBinaryFile, getBinaryHelperFunctions } from './utils/binary-helper-functions';
import { getInputConnectionData } from './utils/get-input-connection-data';
import { getRequestHelperFunctions } from './utils/request-helper-functions';
import { returnJsonArray } from './utils/return-json-array';
import { getNodeWebhookUrl } from './utils/webhook-helper-functions';

/**
 * Specialized execution context for webhook nodes.
 * Handles HTTP request/response for webhook-triggered workflows.
 *
 * ### Responsibilities
 *
 * - Providing access to HTTP request data (body, headers, query params)
 * - Managing HTTP response sending
 * - Handling webhook URLs and test webhooks
 * - Supporting file uploads and binary data processing
 *
 * ### Response Modes
 *
 * - **Immediate**: Responds as soon as the webhook node executes
 * - **ResponseNode**: Waits to get a response from a specific Response-to-* node
 * - **LastNode**: Waits for the entire workflow to complete
 *
 * ### Webhook Flow
 *
 * ```mermaid
 * sequenceDiagram
 *   participant Client
 *   participant Server
 *   participant WC as WebhookContext
 *   participant WE as WorkflowExecute
 *
 *   Client->>Server: HTTP Request to webhook URL
 *   Server->>WC: Create context with request/response
 *   WC->>WC: Process request data
 *   WC->>WE: Trigger workflow execution
 *   WE-->>WC: Execute workflow (may be async)
 *   WC->>Client: Send response (immediate or deferred)
 * ```
 */
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
				connectionInputData = executionData.data.main[0]!;
			}
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
			throw new ApplicationError('Response is missing');
		}
		return this.additionalData.httpResponse;
	}

	private assertHttpRequest() {
		const { httpRequest } = this.additionalData;
		if (httpRequest === undefined) {
			throw new ApplicationError('Request is missing');
		}
		return httpRequest;
	}

	getNodeWebhookUrl(name: WebhookType): string | undefined {
		return getNodeWebhookUrl(
			name,
			this.workflow,
			this.node,
			this.additionalData,
			this.mode,
			this.additionalKeys,
		);
	}

	getWebhookName() {
		return this.webhookData.webhookDescription.name;
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
