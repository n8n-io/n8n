import {
	IWebhookData,
	WebhookHttpMethod,
	WorkflowExecuteMode,
} from 'n8n-workflow';

import {
	NodeExecuteFunctions,
} from './';


export class ActiveWebhooks {
	private workflowWebhooks: {
		[key: string]: IWebhookData[];
	} = {};

	private webhookUrls: {
		[key: string]: IWebhookData;
	} = {};

	testWebhooks = false;


	/**
	 * Adds a new webhook
	 *
	 * @param {IWebhookData} webhookData
	 * @param {WorkflowExecuteMode} mode
	 * @returns {Promise<void>}
	 * @memberof ActiveWebhooks
	 */
	async add(webhookData: IWebhookData, mode: WorkflowExecuteMode): Promise<void> {
		if (webhookData.workflow.id === undefined) {
			throw new Error('Webhooks can only be added for saved workflows as an id is needed!');
		}

		if (this.workflowWebhooks[webhookData.workflow.id] === undefined) {
			this.workflowWebhooks[webhookData.workflow.id] = [];
		}

		// Make the webhook available directly because sometimes to create it successfully
		// it gets called
		this.webhookUrls[this.getWebhookKey(webhookData.httpMethod, webhookData.path)] = webhookData;

		const webhookExists = await webhookData.workflow.runWebhookMethod('checkExists', webhookData, NodeExecuteFunctions, mode, this.testWebhooks);
		if (webhookExists === false) {
			// If webhook does not exist yet create it
			await webhookData.workflow.runWebhookMethod('create', webhookData, NodeExecuteFunctions, mode, this.testWebhooks);
		}

		// Run the "activate" hooks on the nodes
		await webhookData.workflow.runNodeHooks('activate', webhookData, NodeExecuteFunctions, mode);

		this.workflowWebhooks[webhookData.workflow.id].push(webhookData);
	}


	/**
	 * Returns webhookData if a webhook with matches is currently registered
	 *
	 * @param {WebhookHttpMethod} httpMethod
	 * @param {string} path
	 * @returns {(IWebhookData | undefined)}
	 * @memberof ActiveWebhooks
	 */
	get(httpMethod: WebhookHttpMethod, path: string): IWebhookData | undefined {
		const webhookKey = this.getWebhookKey(httpMethod, path);
		if (this.webhookUrls[webhookKey] === undefined) {
			return undefined;
		}

		return this.webhookUrls[webhookKey];
	}


	/**
	 * Returns key to uniquely identify a webhook
	 *
	 * @param {WebhookHttpMethod} httpMethod
	 * @param {string} path
	 * @returns {string}
	 * @memberof ActiveWebhooks
	 */
	getWebhookKey(httpMethod: WebhookHttpMethod, path: string): string {
		return `${httpMethod}|${path}`;
	}


	/**
	 * Removes all webhooks of a workflow
	 *
	 * @param {string} workflowId
	 * @returns {boolean}
	 * @memberof ActiveWebhooks
	 */
	async removeByWorkflowId(workflowId: string): Promise<boolean> {
		if (this.workflowWebhooks[workflowId] === undefined) {
			// If it did not exist then there is nothing to remove
			return false;
		}

		const webhooks = this.workflowWebhooks[workflowId];

		const mode = 'internal';

		// Go through all the registered webhooks of the workflow and remove them
		for (const webhookData of webhooks) {
			await webhookData.workflow.runWebhookMethod('delete', webhookData, NodeExecuteFunctions, mode, this.testWebhooks);

			// Run the "deactivate" hooks on the nodes
			await webhookData.workflow.runNodeHooks('deactivate', webhookData, NodeExecuteFunctions, mode);

			delete this.webhookUrls[this.getWebhookKey(webhookData.httpMethod, webhookData.path)];
		}

		// Remove also the workflow-webhook entry
		delete this.workflowWebhooks[workflowId];

		return true;
	}


	/**
	 * Removes all the currently active webhooks
	 */
	async removeAll(): Promise<void> {
		const workflowIds = Object.keys(this.workflowWebhooks);

		const removePromises = [];
		for (const workflowId of workflowIds) {
			removePromises.push(this.removeByWorkflowId(workflowId));
		}

		await Promise.all(removePromises);
		return;
	}


	// /**
	//  * Removes a single webhook by its key.
	//  * Currently not used, runNodeHooks for "deactivate" is missing
	//  *
	//  * @param {string} webhookKey
	//  * @returns {boolean}
	//  * @memberof ActiveWebhooks
	//  */
	// removeByWebhookKey(webhookKey: string): boolean {
	// 	if (this.webhookUrls[webhookKey] === undefined) {
	// 		// If it did not exist then there is nothing to remove
	// 		return false;
	// 	}

	// 	const webhookData = this.webhookUrls[webhookKey];

	// 	// Remove from workflow-webhooks
	// 	const workflowWebhooks = this.workflowWebhooks[webhookData.workflowId];
	// 	for (let index = 0; index < workflowWebhooks.length; index++) {
	// 		if (workflowWebhooks[index].path === webhookData.path) {
	// 			workflowWebhooks.splice(index, 1);
	// 			break;
	// 		}
	// 	}

	// 	if (workflowWebhooks.length === 0) {
	// 		// When there are no webhooks left for any workflow remove it totally
	// 		delete this.workflowWebhooks[webhookData.workflowId];
	// 	}

	// 	// Remove from webhook urls
	// 	delete this.webhookUrls[webhookKey];

	// 	return true;
	// }

}
