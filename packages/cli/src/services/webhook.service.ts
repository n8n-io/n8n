import { WebhookRepository } from '@db/repositories/webhook.repository';
import { Service } from 'typedi';
import type { WebhookEntity } from '@db/entities/WebhookEntity';
import type { IHttpRequestMethods, INode, INodeType, IWebhookData, Workflow } from 'n8n-workflow';
import type { DeepPartial } from 'typeorm';
import { NodeTypes } from '../NodeTypes';
import { InternalServerError } from '../ResponseHelper';

type Method = NonNullable<IHttpRequestMethods>;

const UUID_REGEXP =
	/^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/;

interface RegisteredWebhook {
	isDynamic: boolean;
	webhookPath: string;
	workflow: Workflow;
	webhookData: IWebhookData;
	node: INode;
	nodeType: INodeType;
}

@Service()
export class WebhookService {
	private registration = new Map<string, Map<IHttpRequestMethods, RegisteredWebhook>>();

	constructor(
		private readonly webhookRepository: WebhookRepository,
		private readonly nodeTypes: NodeTypes,
	) {}

	registerWebhook(
		webhook: WebhookEntity,
		data: Omit<RegisteredWebhook, 'nodeType' | 'isDynamic' | 'webhookPath'>,
	) {
		const { node } = data;
		const nodeType = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
		if (nodeType === undefined) {
			throw new InternalServerError(`The type of the webhook node "${node.name}" is not known`);
		} else if (nodeType.webhook === undefined) {
			throw new InternalServerError(`The node "${node.name}" does not have any webhooks defined.`);
		}

		const pathOrId = webhook.isDynamic ? webhook.webhookId! : webhook.webhookPath;
		const webhookGroup =
			this.registration.get(pathOrId) ?? new Map<IHttpRequestMethods, RegisteredWebhook>();
		webhookGroup.set(webhook.method, {
			...data,
			isDynamic: webhook.isDynamic,
			webhookPath: webhook.webhookPath,
			nodeType,
		});
		this.registration.set(pathOrId, webhookGroup);
		// TODO: update these on redis, and publish a message for others to pull the cache
		// save pathOrId on a hash in redis
	}

	unregisterWebhook(webhook: WebhookEntity) {
		const pathOrId = webhook.isDynamic ? webhook.webhookId! : webhook.webhookPath;
		const webhookGroup = this.registration.get(pathOrId);
		webhookGroup?.delete(webhook.method);
	}

	findWebhook(method: Method, path: string) {
		const webhookGroup = this.getWebhookGroup(path);
		return webhookGroup?.get(method);
	}

	private getWebhookGroup(path: string) {
		let webhookGroup = this.registration.get(path);
		if (!webhookGroup) {
			const possibleId = path.split('/')[0];
			if (UUID_REGEXP.test(possibleId)) {
				webhookGroup = this.registration.get(possibleId);
			}
		}
		return webhookGroup;
	}

	async storeWebhook(webhook: WebhookEntity) {
		const exists = await this.webhookRepository.exist({
			where: {
				webhookPath: webhook.webhookPath,
				method: webhook.method,
			},
		});
		if (!exists) {
			await this.webhookRepository.insert(webhook);
		}
	}

	createWebhook(data: DeepPartial<WebhookEntity>) {
		return this.webhookRepository.create(data);
	}

	async deleteWorkflowWebhooks(workflowId: string) {
		const webhooks = await this.webhookRepository.findBy({ workflowId });

		return this.deleteWebhooks(webhooks);
	}

	private async deleteWebhooks(webhooks: WebhookEntity[]) {
		webhooks.forEach((webhook) => this.unregisterWebhook(webhook));
		return this.webhookRepository.remove(webhooks);
	}

	getWebhookMethods(path: string) {
		const webhookGroup = this.getWebhookGroup(path);
		return (webhookGroup && Array.from(webhookGroup.keys())) ?? [];
	}
}
