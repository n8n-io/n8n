import { WebhookRepository } from '@db/repositories/webhook.repository';
import { Service } from 'typedi';
// import { CacheService } from './cache.service';
import type { WebhookEntity } from '@db/entities/WebhookEntity';
import type { IHttpRequestMethods, INode, INodeType, IWebhookData, Workflow } from 'n8n-workflow';
import type { DeepPartial } from 'typeorm';
import { NodeTypes } from '../NodeTypes';
import { InternalServerError } from '../ResponseHelper';
import { WorkflowRepository } from '../databases/repositories/workflow.repository';

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
		private readonly workflowRepository: WorkflowRepository,
		private readonly nodeTypes: NodeTypes, // private cacheService: CacheService,
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

	async populateCache() {
		// const allWebhooks = await this.webhookRepository.find();
		// allWebhooks.forEach(async (webhook) => {
		// 	const workflowData = await this.workflowRepository.findById(webhook.workflowId);
		// 	if (!workflowData) return;
		// 	const workflow = new Workflow({
		// 		id: webhook.workflowId,
		// 		name: workflowData.name,
		// 		nodes: workflowData.nodes,
		// 		connections: workflowData.connections,
		// 		active: workflowData.active,
		// 		nodeTypes: this.nodeTypes,
		// 		staticData: workflowData.staticData,
		// 		settings: workflowData.settings,
		// 	});
		// 	let node: INode;
		// 	if (workflow.nodes.hasOwnProperty(webhookData.node)) {
		// 		node = workflow.nodes[webhookData.node];
		// 	}
		// 	// const node = workflow?.getNode(webhookData.node) as INode;
		// 	this.registerWebhook(webhook, { workflow, node, webhookData });
		// });
	}

	// async populateCache() {
	// 	const allWebhooks = await this.webhookRepository.find();

	// 	if (!allWebhooks) return;

	// 	// void this.cacheService.setMany(allWebhooks.map((w) => [w.cacheKey, w]));
	// }

	// private async findCached(method: Method, path: string) {
	// 	const cacheKey = `webhook:${method}-${path}`;

	// 	const cachedWebhook = await this.cacheService.get(cacheKey);

	// 	if (cachedWebhook) return this.webhookRepository.create(cachedWebhook);

	// 	let dbWebhook = await this.findStaticWebhook(method, path);

	// 	if (dbWebhook === null) {
	// 		dbWebhook = await this.findDynamicWebhook(method, path);
	// 	}

	// 	void this.cacheService.set(cacheKey, dbWebhook);

	// 	return dbWebhook;
	// }

	/**
	 * Find a matching webhook with zero dynamic path segments, e.g. `<uuid>` or `user/profile`.
	 */
	// private async findStaticWebhook(method: Method, path: string) {
	// 	return this.webhookRepository.findOneBy({ webhookPath: path, method });
	// }

	/**
	 * Find a matching webhook with one or more dynamic path segments, e.g. `<uuid>/user/:id/posts`.
	 * It is mandatory for dynamic webhooks to have `<uuid>/` at the base.
	 */
	// private async findDynamicWebhook(method: Method, path: string) {
	// 	const [uuidSegment, ...otherSegments] = path.split('/');

	// 	const dynamicWebhooks = await this.webhookRepository.findBy({
	// 		webhookId: uuidSegment,
	// 		method,
	// 		pathLength: otherSegments.length,
	// 	});

	// 	if (dynamicWebhooks.length === 0) return null;

	// 	const requestSegments = new Set(otherSegments);

	// 	const { webhook } = dynamicWebhooks.reduce<{
	// 		webhook: WebhookEntity | null;
	// 		maxMatches: number;
	// 	}>(
	// 		(acc, dw) => {
	// 			const allStaticSegmentsMatch = dw.staticSegments.every((s) => requestSegments.has(s));

	// 			if (allStaticSegmentsMatch && dw.staticSegments.length > acc.maxMatches) {
	// 				acc.maxMatches = dw.staticSegments.length;
	// 				acc.webhook = dw;
	// 				return acc;
	// 			} else if (dw.staticSegments.length === 0 && !acc.webhook) {
	// 				acc.webhook = dw; // edge case: if path is `:var`, match on anything
	// 			}

	// 			return acc;
	// 		},
	// 		{ webhook: null, maxMatches: 0 },
	// 	);

	// 	return webhook;
	// }

	// async findWebhook(method: Method, path: string) {
	// 	return this.findCached(method, path);
	// }

	async storeWebhook(webhook: WebhookEntity) {
		// void this.cacheService.set(webhook.cacheKey, webhook);
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
		// void this.cacheService.deleteMany(webhooks.map((w) => w.cacheKey));
		webhooks.forEach((webhook) => this.unregisterWebhook(webhook));
		return this.webhookRepository.remove(webhooks);
	}

	getWebhookMethods(path: string) {
		const webhookGroup = this.getWebhookGroup(path);
		return (webhookGroup && Array.from(webhookGroup.keys())) ?? [];
	}

	// async getWebhookMethods(path: string) {
	// 	return this.webhookRepository
	// 		.find({ select: ['method'], where: { webhookPath: path } })
	// 		.then((rows) => rows.map((r) => r.method));
	// }
}
