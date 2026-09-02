import { UnexpectedError } from 'n8n-workflow';
import type {
	ICredentialDataDecryptedObject,
	IExecuteData,
	INode,
	IHookFunctions,
	IWorkflowExecuteAdditionalData,
	Workflow,
	WorkflowActivateMode,
	WorkflowExecuteMode,
	IWebhookData,
	WebhookType,
} from 'n8n-workflow';

import { NodeExecutionContext } from './node-execution-context';
import { getRequestHelperFunctions } from './utils/request-helper-functions';
import { getNodeWebhookUrl, getWebhookDescription } from './utils/webhook-helper-functions';

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
		// No real task run backs a webhook-registration hook, so this only exists to
		// surface `node` to the credentials helper (e.g. for policy checks) — `data`/
		// `source` are unused.
		const executeData: IExecuteData = { data: {}, node: this.node, source: null };

		return await this._getCredentials<T>(type, executeData);
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
			throw new UnexpectedError('Only supported in webhook functions');
		}
		return this.webhookData.webhookDescription.name;
	}

	getWebhookDescription(name: WebhookType) {
		return getWebhookDescription(name, this.workflow, this.node);
	}
}
