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
	WebhookType,
} from 'n8n-workflow';
import { ApplicationError } from 'n8n-workflow';

// eslint-disable-next-line import/no-cycle
import {
	getAdditionalKeys,
	getCredentials,
	getNodeParameter,
	getNodeWebhookUrl,
	getRequestHelperFunctions,
	getWebhookDescription,
} from '@/NodeExecuteFunctions';

import { NodeExecutionContext } from './node-execution-context';

export class HookContext extends NodeExecutionContext implements IHookFunctions {
	readonly helpers: IHookFunctions['helpers'];

	constructor(
		workflow: Workflow,
		node: INode,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		private readonly activation: WorkflowActivateMode,
		private readonly webhookData?: IWebhookData,
	) {
		super(workflow, node, additionalData, mode);

		this.helpers = getRequestHelperFunctions(workflow, node, additionalData);
	}

	getActivationMode() {
		return this.activation;
	}

	async getCredentials<T extends object = ICredentialDataDecryptedObject>(type: string) {
		return await getCredentials<T>(this.workflow, this.node, type, this.additionalData, this.mode);
	}

	getNodeParameter(
		parameterName: string,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

	getNodeWebhookUrl(name: WebhookType): string | undefined {
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

	getWebhookDescription(name: WebhookType) {
		return getWebhookDescription(name, this.workflow, this.node);
	}
}
