import {
	IWebhookData,
	WebhookHttpMethod,
	Workflow,
	WorkflowActivateMode,
	WorkflowExecuteMode,
} from 'n8n-workflow';

import * as NodeExecuteFunctions from './NodeExecuteFunctions';

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
	 */
	async add(
		workflow: Workflow,
		webhookData: IWebhookData,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
	): Promise<void> {
		if (workflow.id === undefined) {
			throw new Error('Webhooks can only be added for saved workflows as an id is needed!');
		}
		if (webhookData.path.endsWith('/')) {
			// eslint-disable-next-line no-param-reassign
			webhookData.path = webhookData.path.slice(0, -1);
		}

		const webhookKey = this.getWebhookKey(
			webhookData.httpMethod,
			webhookData.path,
			webhookData.webhookId,
		);

		// check that there is not a webhook already registered with that path/method
		if (this.webhookUrls[webhookKey] && !webhookData.webhookId) {
			throw new Error(
				`The URL path that the "${webhookData.node}" node uses is already taken. Please change it to something else.`,
			);
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
			const webhookExists = await workflow.runWebhookMethod(
				'checkExists',
				webhookData,
				NodeExecuteFunctions,
				mode,
				activation,
				this.testWebhooks,
			);
			if (webhookExists !== true) {
				// If webhook does not exist yet create it
				await workflow.runWebhookMethod(
					'create',
					webhookData,
					NodeExecuteFunctions,
					mode,
					activation,
					this.testWebhooks,
				);
			}
		} catch (error) {
			// If there was a problem unregister the webhook again
			if (this.webhookUrls[webhookKey].length <= 1) {
				delete this.webhookUrls[webhookKey];
			} else {
				this.webhookUrls[webhookKey] = this.webhookUrls[webhookKey].filter(
					(webhook) => webhook.path !== webhookData.path,
				);
			}

			throw error;
		}
		this.workflowWebhooks[webhookData.workflowId].push(webhookData);
	}

	/**
	 * Returns webhookData if a webhook with matches is currently registered
	 *
	 * @param {(string | undefined)} webhookId
	 */
	get(httpMethod: WebhookHttpMethod, path: string, webhookId?: string): IWebhookData | undefined {
		const webhookKey = this.getWebhookKey(httpMethod, path, webhookId);
		if (this.webhookUrls[webhookKey] === undefined) {
			return undefined;
		}

		let webhook: IWebhookData | undefined;
		let maxMatches = 0;
		const pathElementsSet = new Set(path.split('/'));
		// check if static elements match in path
		// if more results have been returned choose the one with the most static-route matches
		this.webhookUrls[webhookKey].forEach((dynamicWebhook) => {
			const staticElements = dynamicWebhook.path.split('/').filter((ele) => !ele.startsWith(':'));
			const allStaticExist = staticElements.every((staticEle) => pathElementsSet.has(staticEle));

			if (allStaticExist && staticElements.length > maxMatches) {
				maxMatches = staticElements.length;
				webhook = dynamicWebhook;
			}
			// handle routes with no static elements
			else if (staticElements.length === 0 && !webhook) {
				webhook = dynamicWebhook;
			}
		});

		return webhook;
	}

	/**
	 * Gets all request methods associated with a single webhook
	 */
	getWebhookMethods(path: string): string[] {
		const methods: string[] = [];

		Object.keys(this.webhookUrls)
			.filter((key) => key.includes(path))
			// eslint-disable-next-line array-callback-return
			.map((key) => {
				methods.push(key.split('|')[0]);
			});

		return methods;
	}

	/**
	 * Returns the ids of all the workflows which have active webhooks
	 *
	 */
	getWorkflowIds(): string[] {
		return Object.keys(this.workflowWebhooks);
	}

	/**
	 * Returns key to uniquely identify a webhook
	 *
	 * @param {(string | undefined)} webhookId
	 */
	getWebhookKey(httpMethod: WebhookHttpMethod, path: string, webhookId?: string): string {
		if (webhookId) {
			if (path.startsWith(webhookId)) {
				const cutFromIndex = path.indexOf('/') + 1;
				// eslint-disable-next-line no-param-reassign
				path = path.slice(cutFromIndex);
			}
			return `${httpMethod}|${webhookId}|${path.split('/').length}`;
		}
		return `${httpMethod}|${path}`;
	}

	/**
	 * Removes all webhooks of a workflow
	 *
	 */
	async removeWorkflow(workflow: Workflow): Promise<boolean> {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const workflowId = workflow.id!.toString();

		if (this.workflowWebhooks[workflowId] === undefined) {
			// If it did not exist then there is nothing to remove
			return false;
		}

		const webhooks = this.workflowWebhooks[workflowId];

		const mode = 'internal';

		// Go through all the registered webhooks of the workflow and remove them
		// eslint-disable-next-line no-restricted-syntax
		for (const webhookData of webhooks) {
			// eslint-disable-next-line no-await-in-loop
			await workflow.runWebhookMethod(
				'delete',
				webhookData,
				NodeExecuteFunctions,
				mode,
				'update',
				this.testWebhooks,
			);

			delete this.webhookUrls[
				this.getWebhookKey(webhookData.httpMethod, webhookData.path, webhookData.webhookId)
			];
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
		// eslint-disable-next-line no-restricted-syntax
		for (const workflow of workflows) {
			removePromises.push(this.removeWorkflow(workflow));
		}

		await Promise.all(removePromises);
	}
}
