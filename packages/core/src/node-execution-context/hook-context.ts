import type {
	ICredentialDataDecryptedObject,
	IGetNodeParameterOptions,
	INode,
	INodeExecutionData,
	IHookFunctions,
	IRunExecutionData,
	IWorkflowExecuteAdditionalData,
	NodeParameterValueType,
	Workflow,
	WorkflowActivateMode,
	WorkflowExecuteMode,
	IWebhookData,
} from 'n8n-workflow';
import { ApplicationError } from 'n8n-workflow';

import {
	getAdditionalKeys,
	getCredentials,
	getNodeParameter,
	getNodeWebhookUrl,
	getWebhookDescription,
} from '@/NodeExecuteFunctions';
import { BaseContext } from './base-contexts';
import { RequestHelpers } from './helpers/request-helpers';

export class HookContext extends BaseContext implements IHookFunctions {
	readonly helpers: IHookFunctions['helpers'];

	constructor(
		workflow: Workflow,
		node: INode,
		additionalData: IWorkflowExecuteAdditionalData,
		private readonly mode: WorkflowExecuteMode,
		private readonly activation: WorkflowActivateMode,
		private readonly webhookData?: IWebhookData,
	) {
		super(workflow, node, additionalData);

		const requestHelpers = new RequestHelpers(this, workflow, node, additionalData);

		this.helpers = {
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
	}

	getMode() {
		return this.mode;
	}

	getActivationMode() {
		return this.activation;
	}

	// TODO: This is identical to PollContext
	async getCredentials<T extends object = ICredentialDataDecryptedObject>(type: string) {
		return await getCredentials<T>(this.workflow, this.node, type, this.additionalData, this.mode);
	}

	// TODO: This is identical to PollContext
	getNodeParameter(
		parameterName: string,
		fallbackValue?: any,
		options?: IGetNodeParameterOptions,
	): NodeParameterValueType | object {
		const runExecutionData: IRunExecutionData | null = null;
		const itemIndex = 0;
		const runIndex = 0;
		const connectionInputData: INodeExecutionData[] = [];

		return getNodeParameter(
			this.workflow,
			runExecutionData,
			runIndex,
			connectionInputData,
			this.node,
			parameterName,
			itemIndex,
			this.mode,
			getAdditionalKeys(this.additionalData, this.mode, runExecutionData),
			undefined,
			fallbackValue,
			options,
		);
	}

	getNodeWebhookUrl(name: string): string | undefined {
		return getNodeWebhookUrl(
			name,
			this.workflow,
			this.node,
			this.additionalData,
			this.mode,
			getAdditionalKeys(this.additionalData, this.mode, null),
			this.webhookData?.isTest,
		);
	}

	getWebhookName(): string {
		if (this.webhookData === undefined) {
			throw new ApplicationError('Only supported in webhook functions');
		}
		return this.webhookData.webhookDescription.name;
	}

	getWebhookDescription(name: string) {
		return getWebhookDescription(name, this.workflow, this.node);
	}
}
