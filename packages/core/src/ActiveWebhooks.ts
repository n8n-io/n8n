import {
	IWebhookData,
	WebhookHttpMethod,
	Workflow,
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
		[key: string]: IWebhookData[];
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
	async add(workflow: Workflow, webhookData: IWebhookData, mode: WorkflowExecuteMode): Promise<void> {
		if (workflow.id === undefined) {
			throw new Error('Webhooks can only be added for saved workflows as an id is needed!');
		}

		const webhookKey = this.getWebhookKey(webhookData.httpMethod, webhookData.path, webhookData.webhookId);

		//check that there is not a webhook already registed with that path/method
		if (this.webhookUrls[webhookKey] && !webhookData.webhookId) {
			throw new Error(`Test-Webhook can not be activated because another one with the same method "${webhookData.httpMethod}" and path "${webhookData.path}" is already active!`);
		}

		if (this.workflowWebhooks[webhookData.workflowId] === undefined) {
			this.workflowWebhooks[webhookData.workflowId] = [];
		}

		// Make the webhook available directly because sometimes to create it successfully
		// it gets called
		if (!this.webhookUrls[webhookKey]) {
			this.webhookUrls[webhookKey] = [];
		}
		this.webhookUrls[webhookKey].push(webhookData);

		try {
			const webhookExists = await workflow.runWebhookMethod('checkExists', webhookData, NodeExecuteFunctions, mode, this.testWebhooks);
			if (webhookExists !== true) {
				// If webhook does not exist yet create it
				await workflow.runWebhookMethod('create', webhookData, NodeExecuteFunctions, mode, this.testWebhooks);

			}
		} catch (error) {
			// If there was a problem unregister the webhook again
			if (this.webhookUrls[webhookKey].length <= 1) {
				delete this.webhookUrls[webhookKey];
			} else {
				this.webhookUrls[webhookKey] = this.webhookUrls[webhookKey].filter(webhook => webhook.path !== webhookData.path);
			}

			throw error;
		}
		this.workflowWebhooks[webhookData.workflowId].push(webhookData);
	}


	/**
	 * Returns webhookData if a webhook with matches is currently registered
	 *
	 * @param {WebhookHttpMethod} httpMethod
	 * @param {string} path
	 * @param {(string | undefined)} webhookId
	 * @returns {(IWebhookData | undefined)}
	 * @memberof ActiveWebhooks
	 */
	get(httpMethod: WebhookHttpMethod, path: string, webhookId?: string): IWebhookData | undefined {
		const webhookKey = this.getWebhookKey(httpMethod, path, webhookId);
		if (this.webhookUrls[webhookKey] === undefined) {
			return undefined;
		}

		// set webhook to the first webhook result
		// if more results have been returned choose the one with the most route-matches
		let webhook = this.webhookUrls[webhookKey][0];
		if (this.webhookUrls[webhookKey].length > 1) {
			let maxMatches = 0;
			const pathElementsSet = new Set(path.split('/'));
			this.webhookUrls[webhookKey].forEach(dynamicWebhook => {
				const intersection =
					dynamicWebhook.path
					.split('/')
					.reduce((acc, element) => pathElementsSet.has(element) ? acc += 1 : acc, 0);

				if (intersection > maxMatches) {
					maxMatches = intersection;
					webhook = dynamicWebhook;
				}
			});
			if (maxMatches === 0) {
				return undefined;
			}
		}

		return webhook;
	}

	/**
	 * Gets all request methods associated with a single webhook
	 * @param path
	 */
	getWebhookMethods(path: string): string[] {
		const methods : string[] = [];

		Object.keys(this.webhookUrls)
		.filter(key => key.includes(path))
		.map(key => {
			methods.push(key.split('|')[0]);
		});

		return methods;
	}

	/**
	 * Returns the ids of all the workflows which have active webhooks
	 *
	 * @returns {string[]}
	 * @memberof ActiveWebhooks
	 */
	getWorkflowIds(): string[] {
		return Object.keys(this.workflowWebhooks);
	}


	/**
	 * Returns key to uniquely identify a webhook
	 *
	 * @param {WebhookHttpMethod} httpMethod
	 * @param {string} path
	 * @param {(string | undefined)} webhookId
	 * @returns {string}
	 * @memberof ActiveWebhooks
	 */
	getWebhookKey(httpMethod: WebhookHttpMethod, path: string, webhookId?: string): string {
		if (webhookId) {
			if (path.startsWith(webhookId)) {
				const cutFromIndex = path.indexOf('/') + 1;
				path = path.slice(cutFromIndex);
			}
			return `${httpMethod}|${webhookId}|${path.split('/').length}`;
		}
		return `${httpMethod}|${path}`;
	}


	/**
	 * Removes all webhooks of a workflow
	 *
	 * @param {Workflow} workflow
	 * @returns {boolean}
	 * @memberof ActiveWebhooks
	 */
	async removeWorkflow(workflow: Workflow): Promise<boolean> {
		const workflowId = workflow.id!.toString();

		if (this.workflowWebhooks[workflowId] === undefined) {
			// If it did not exist then there is nothing to remove
			return false;
		}

		const webhooks = this.workflowWebhooks[workflowId];

		const mode = 'internal';

		// Go through all the registered webhooks of the workflow and remove them
		for (const webhookData of webhooks) {
			await workflow.runWebhookMethod('delete', webhookData, NodeExecuteFunctions, mode, this.testWebhooks);

			delete this.webhookUrls[this.getWebhookKey(webhookData.httpMethod, webhookData.path, webhookData.webhookId)];
		}

		// Remove also the workflow-webhook entry
		delete this.workflowWebhooks[workflowId];

		return true;
	}


	/**
	 * Removes all the webhooks of the given workflows
	 */
	async removeAll(workflows: Workflow[]): Promise<void> {
		const removePromises = [];
		for (const workflow of workflows) {
			removePromises.push(this.removeWorkflow(workflow));
		}

		await Promise.all(removePromises);
		return;
	}

}
