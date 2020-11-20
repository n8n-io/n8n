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
	async add(workflow: Workflow, webhookData: IWebhookData, mode: WorkflowExecuteMode): Promise<void> {
		if (workflow.id === undefined) {
			throw new Error('Webhooks can only be added for saved workflows as an id is needed!');
		}

		const webhookKey = this.getWebhookKey(webhookData.httpMethod, webhookData.path);

		//check that there is not a webhook already registed with that path/method
		if (this.webhookUrls[webhookKey] !== undefined) {
			throw new Error(`Test-Webhook can not be activated because another one with the same method "${webhookData.httpMethod}" and path "${webhookData.path}" is already active!`);
		}

		if (this.workflowWebhooks[webhookData.workflowId] === undefined) {
			this.workflowWebhooks[webhookData.workflowId] = [];
		}

		// Make the webhook available directly because sometimes to create it successfully
		// it gets called
		this.webhookUrls[webhookKey] = webhookData;

		try {
			const webhookExists = await workflow.runWebhookMethod('checkExists', webhookData, NodeExecuteFunctions, mode, this.testWebhooks);
			if (webhookExists !== true) {
				// If webhook does not exist yet create it
				await workflow.runWebhookMethod('create', webhookData, NodeExecuteFunctions, mode, this.testWebhooks);

			}
		} catch (error) {
			// If there was a problem unregister the webhook again
			delete this.webhookUrls[webhookKey];

			throw error;
		}
		this.workflowWebhooks[webhookData.workflowId].push(webhookData);
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
	 * @returns {string}
	 * @memberof ActiveWebhooks
	 */
	getWebhookKey(httpMethod: WebhookHttpMethod, path: string): string {
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

			delete this.webhookUrls[this.getWebhookKey(webhookData.httpMethod, webhookData.path)];
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
