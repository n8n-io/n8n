import type {
	ICredentialDataDecryptedObject,
	INode,
	IHookFunctions,
	IWorkflowExecuteAdditionalData,
	Workflow,
	WorkflowActivateMode,
	WorkflowExecuteMode,
	IWebhookData,
	WebhookType,
} from 'n8n-workflow';
import { ApplicationError } from 'n8n-workflow';

// eslint-disable-next-line import/no-cycle
import {
	getNodeWebhookUrl,
	getRequestHelperFunctions,
	getWebhookDescription,
} from '@/node-execute-functions';

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
		return await this._getCredentials<T>(type);
	}

	getNodeWebhookUrl(name: WebhookType): string | undefined {
		return getNodeWebhookUrl(
			name,
			this.workflow,
			this.node,
			this.additionalData,
			this.mode,
			this.additionalKeys,
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
