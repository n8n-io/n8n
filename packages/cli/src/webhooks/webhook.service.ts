import { Logger } from '@n8n/backend-common';
import type { WebhookEntity } from '@n8n/db';
import { WebhookRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { HookContext, WebhookContext } from 'n8n-core';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import {
	isNodeClassInstance,
	NodeHelpers,
	resolveWebhookDescriptionField,
	UnexpectedError,
	WebhookPathTakenError,
} from 'n8n-workflow';
import type {
	IHttpRequestMethods,
	INode,
	IRunExecutionData,
	IWebhookData,
	IWebhookDescription,
	IWebhookResponseData,
	IWorkflowExecuteAdditionalData,
	WebhookSetupMethodNames,
	Workflow,
	WorkflowActivateMode,
	WorkflowExecuteMode,
} from 'n8n-workflow';

import { NodeTypes } from '@/node-types';
import { CacheService } from '@/services/cache/cache.service';

import type { Method } from './webhook.types';

@Service()
export class WebhookService {
	constructor(
		private readonly logger: Logger,
		private readonly webhookRepository: WebhookRepository,
		private readonly cacheService: CacheService,
		private readonly nodeTypes: NodeTypes,
	) {}

	async populateCache() {
		const staticWebhooks = await this.webhookRepository.getStaticWebhooks();

		if (staticWebhooks.length === 0) return;

		void this.cacheService.setMany(staticWebhooks.map((w) => [w.cacheKey, w]));
	}

	async findAll() {
		return await this.webhookRepository.find();
	}

	private async findCached(method: Method, path: string) {
		const staticWebhook = await this.findCachedStaticWebhook(method, path);

		if (staticWebhook) return staticWebhook;

		return await this.findDynamicWebhook(path, method);
	}

	/**
	 * Cached lookup for a webhook with zero dynamic path segments. Returns the
	 * cached entity if present, otherwise queries the database and caches a hit.
	 */
	private async findCachedStaticWebhook(method: Method, path: string) {
		const cacheKey = `webhook:${method}-${path}`;

		let cachedStaticWebhook;
		try {
			cachedStaticWebhook = await this.cacheService.get(cacheKey);
		} catch (error) {
			this.logger.warn('Failed to query webhook cache', {
				error: ensureError(error).message,
			});
			cachedStaticWebhook = undefined;
		}

		if (cachedStaticWebhook) return this.webhookRepository.create(cachedStaticWebhook);

		const dbStaticWebhook = await this.findStaticWebhookInDb(method, path);

		if (dbStaticWebhook) {
			void this.cacheService.set(cacheKey, dbStaticWebhook).catch((error) => {
				this.logger.warn('Failed to cache webhook', {
					error: ensureError(error).message,
				});
			});
		}

		return dbStaticWebhook;
	}

	/**
	 * Find a matching webhook with zero dynamic path segments, e.g. `<uuid>` or `user/profile`.
	 */
	private async findStaticWebhookInDb(method: Method, path: string) {
		return await this.webhookRepository.findOneBy({ webhookPath: path, method });
	}

	/**
	 * Find a static webhook (no dynamic path segments) by method and path, using the
	 * cache. Unlike {@link findWebhook}, this never falls back to a dynamic-webhook DB
	 * probe, so it is cheaper for callers that only handle static paths.
	 */
	async findStaticWebhook(method: Method, path: string) {
		return await this.findCachedStaticWebhook(method, path);
	}

	/**
	 * Resolve a path (concrete or templated) to the rows of the one trigger that would
	 * handle it — one per method it listens on, so callers can derive its method-set.
	 *
	 * Selection mirrors {@link findWebhook}, method first: narrowing by method only at
	 * the end would let a static row for another method shadow the dynamic template that
	 * actually routes. Without a method, only a path naming exactly one trigger resolves,
	 * which costs the dynamic probe even on a static hit. `method` is untrusted input,
	 * hence `string` rather than {@link Method}. Bypasses the cache.
	 */
	async findTriggerWebhooksByPath(path: string, method?: string): Promise<WebhookEntity[]> {
		const staticWebhooks = await this.webhookRepository.findStaticWebhooksByPath(path);

		if (method) {
			const staticMatch = staticWebhooks.find((webhook) => webhook.method === method);
			if (staticMatch) return this.rowsOfSameTrigger(staticWebhooks, staticMatch);
			return await this.findDynamicTriggerWebhooks(path, method);
		}

		// Without a method the path must name one trigger across *both* kinds: a concrete
		// path can be served statically on one method and by a dynamic template on
		// another, so accepting a lone static row here would answer an ambiguous probe.
		const candidates = [...staticWebhooks, ...(await this.findDynamicTriggerWebhooks(path))];
		const [first] = candidates;
		if (!first) return [];

		const oneTrigger = this.rowsOfSameTrigger(candidates, first);
		return oneTrigger.length === candidates.length ? oneTrigger : [];
	}

	/** Rows of the dynamic trigger whose template the path resolves to, if any. */
	private async findDynamicTriggerWebhooks(
		path: string,
		method?: string,
	): Promise<WebhookEntity[]> {
		const [uuidSegment, ...otherSegments] = path.split('/');
		const candidates = await this.webhookRepository.findDynamicWebhooksByWebhookId(
			uuidSegment,
			otherSegments.length,
		);

		const eligible = method ? candidates.filter((dw) => dw.method === method) : candidates;
		const match = this.pickMatchingTemplate(eligible, new Set(otherSegments));

		return match ? this.rowsOfSameTrigger(candidates, match) : [];
	}

	/** Every row of the trigger `row` belongs to — one per method it listens on. */
	private rowsOfSameTrigger(webhooks: WebhookEntity[], row: WebhookEntity) {
		return webhooks.filter(
			(webhook) =>
				webhook.workflowId === row.workflowId &&
				webhook.node === row.node &&
				webhook.webhookPath === row.webhookPath,
		);
	}

	/**
	 * The candidate whose template best matches the request's segments: most static
	 * segments wins, falling back to an all-wildcard template. Shared by the router and
	 * the OAuth resolver so "which resource" cannot drift from "which trigger fires".
	 */
	private pickMatchingTemplate(candidates: WebhookEntity[], requestSegments: Set<string>) {
		const { webhook } = candidates.reduce<{ webhook: WebhookEntity | null; maxMatches: number }>(
			(acc, dw) => {
				const allStaticSegmentsMatch = dw.staticSegments.every((s) => requestSegments.has(s));

				if (allStaticSegmentsMatch && dw.staticSegments.length > acc.maxMatches) {
					acc.maxMatches = dw.staticSegments.length;
					acc.webhook = dw;
				} else if (dw.staticSegments.length === 0 && !acc.webhook) {
					acc.webhook = dw; // edge case: if path is `:var`, match on anything
				}

				return acc;
			},
			{ webhook: null, maxMatches: 0 },
		);

		return webhook ?? undefined;
	}

	/**
	 * Find a matching webhook with one or more dynamic path segments, e.g. `<uuid>/user/:id/posts`.
	 * It is mandatory for dynamic webhooks to have `<uuid>/` at the base.
	 */
	private async findDynamicWebhook(path: string, method?: Method) {
		const [uuidSegment, ...otherSegments] = path.split('/');

		const dynamicWebhooks = await this.webhookRepository.findBy({
			webhookId: uuidSegment,
			method,
			pathLength: otherSegments.length,
		});

		if (dynamicWebhooks.length === 0) return null;

		return this.pickMatchingTemplate(dynamicWebhooks, new Set(otherSegments)) ?? null;
	}

	async findWebhook(method: Method, path: string) {
		return await this.findCached(method, path);
	}

	async storeWebhook(webhook: WebhookEntity) {
		// The (webhookPath, method) primary key serializes concurrent registrations
		// at the database level (also across processes, e.g. multi-main).
		try {
			await this.webhookRepository.insert(webhook);
		} catch (error) {
			const existing = await this.webhookRepository.findOneBy({
				method: webhook.method,
				webhookPath: webhook.webhookPath,
			});

			// Not a duplicate-path failure (or the row vanished) - surface the original error.
			if (!existing) throw error;

			// Path is held by a different workflow - reject instead of overwriting.
			if (existing.workflowId !== webhook.workflowId) {
				throw new WebhookPathTakenError(webhook.node, ensureError(error));
			}

			// Same workflow re-registering its own path (e.g. a stale row left after an
			// unclean shutdown on init/leadershipChange) - refresh it.
			await this.webhookRepository.update(
				{ method: webhook.method, webhookPath: webhook.webhookPath },
				webhook,
			);
		}

		// Cache only after the write succeeds, so a rejected write never poisons the cache.
		try {
			await this.cacheService.set(webhook.cacheKey, webhook);
		} catch (error) {
			this.logger.warn('Failed to cache webhook', {
				error: ensureError(error).message,
			});
		}
	}

	createWebhook(data: Partial<WebhookEntity>) {
		return this.webhookRepository.create(data);
	}

	/** The webhooks currently registered (stored locally) for a workflow. */
	async getRegisteredWebhooks(workflowId: string) {
		return await this.webhookRepository.findBy({ workflowId });
	}

	async deleteWorkflowWebhooks(workflowId: string) {
		const webhooks = await this.webhookRepository.findBy({ workflowId });

		return await this.deleteWebhooks(webhooks);
	}

	/** Delete the webhooks registered for the given nodes of a workflow. */
	async deleteWorkflowWebhooksForNodes(workflowId: string, nodeNames: string[]) {
		if (nodeNames.length === 0) return;

		const webhooks = await this.webhookRepository.findBy({ workflowId });
		const toDelete = webhooks.filter((webhook) => nodeNames.includes(webhook.node));

		return await this.deleteWebhooks(toDelete);
	}

	private async deleteWebhooks(webhooks: WebhookEntity[]) {
		void this.cacheService.deleteMany(webhooks.map((w) => w.cacheKey));

		return await this.webhookRepository.remove(webhooks);
	}

	async getWebhookMethods(rawPath: string) {
		// Try to find static webhooks first
		const staticMethods = await this.webhookRepository
			.find({ select: ['method'], where: { webhookPath: rawPath } })
			.then((rows) => rows.map((r) => r.method));

		if (staticMethods.length > 0) {
			return staticMethods;
		}

		// Otherwise, try to find dynamic webhooks based on path only
		const dynamicWebhooks = await this.findDynamicWebhook(rawPath);
		return dynamicWebhooks ? [dynamicWebhooks.method] : [];
	}

	private isDynamicPath(rawPath: string) {
		const firstSlashIndex = rawPath.indexOf('/');
		const path = firstSlashIndex !== -1 ? rawPath.substring(firstSlashIndex + 1) : rawPath;

		// if dynamic, first segment is webhook ID so disregard it

		if (path === '' || path === ':' || path === '/:') return false;

		return path.startsWith(':') || path.includes('/:');
	}

	getWebhookPath(webhook: IWebhookData): string {
		return [webhook.path.includes(':') ? webhook.webhookId : undefined, webhook.path]
			.filter((part) => !!part)
			.join('/');
	}

	/**
	 * Returns all the webhooks which should be created for the given node.
	 */
	getNodeWebhooks(
		workflow: Workflow,
		node: INode,
		additionalData: IWorkflowExecuteAdditionalData,
		ignoreRestartWebhooks = false,
	): IWebhookData[] {
		if (node.disabled === true) {
			// Node is disabled so webhooks will also not be enabled
			return [];
		}

		const nodeType = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);

		if (nodeType.description.webhooks === undefined) {
			// Node does not have any webhooks so return
			return [];
		}

		const workflowId = workflow.id || '__UNSAVED__';

		const returnData: IWebhookData[] = [];
		for (const webhookDescription of nodeType.description.webhooks) {
			if (ignoreRestartWebhooks && webhookDescription.restartWebhook === true) {
				continue;
			}

			let nodeWebhookPath = this.evaluateDescriptionProperty(
				workflow,
				node,
				webhookDescription,
				'path',
			);
			if (nodeWebhookPath === undefined || nodeWebhookPath === null) {
				this.logger.error(
					`No webhook path could be found for node "${node.name}" in workflow "${workflowId}".`,
				);
				continue;
			}

			nodeWebhookPath = nodeWebhookPath.toString().trim();

			if (nodeWebhookPath.startsWith('/')) {
				nodeWebhookPath = nodeWebhookPath.slice(1);
			}
			if (nodeWebhookPath.endsWith('/')) {
				nodeWebhookPath = nodeWebhookPath.slice(0, -1);
			}

			const isFullPath = this.evaluateDescriptionProperty(
				workflow,
				node,
				webhookDescription,
				'isFullPath',
				false,
			) as boolean;
			const restartWebhook = this.evaluateDescriptionProperty(
				workflow,
				node,
				webhookDescription,
				'restartWebhook',
				false,
			) as boolean;
			const path = NodeHelpers.getNodeWebhookPath(
				workflowId,
				node,
				nodeWebhookPath,
				isFullPath,
				restartWebhook,
			);

			const webhookMethods = this.evaluateDescriptionProperty(
				workflow,
				node,
				webhookDescription,
				'httpMethod',
				'GET',
			);

			if (webhookMethods === undefined) {
				this.logger.error(
					`The webhook "${path}" for node "${node.name}" in workflow "${workflowId}" could not be added because the httpMethod is not defined.`,
				);
				continue;
			}

			let webhookId: string | undefined;

			if (this.isDynamicPath(path) && node.webhookId) {
				webhookId = node.webhookId;
			}

			String(webhookMethods)
				.split(',')
				.forEach((httpMethod) => {
					if (!httpMethod) return;
					returnData.push({
						httpMethod: httpMethod.trim() as IHttpRequestMethods,
						node: node.name,
						path,
						webhookDescription,
						workflowId,
						workflowExecuteAdditionalData: additionalData,
						webhookId,
					});
				});
		}

		return returnData;
	}

	/**
	 * Evaluates a webhook-description property, preferring the field's native
	 * resolver (see `webhookDescriptionFields` in n8n-workflow) so static-parameter
	 * nodes never engage the expression engine. Falls back to the engine, which
	 * returns plain values as-is and only evaluates `=` templates.
	 */
	private evaluateDescriptionProperty(
		workflow: Workflow,
		node: INode,
		webhookDescription: IWebhookDescription,
		property: string,
		defaultValue?: string | boolean,
	) {
		const native = resolveWebhookDescriptionField(node, webhookDescription, property);
		if (native.resolved) return native.value;

		return workflow.expression.getSimpleParameterValue(
			node,
			webhookDescription[property],
			'internal',
			{},
			undefined,
			defaultValue,
		);
	}

	private async _findWebhookConflicts(
		workflow: Workflow,
		checkEntries: Array<{
			node: INode;
			webhooks: IWebhookData[];
		}>,
	) {
		const conflicts: Array<{
			trigger: INode;
			conflict: Partial<WebhookEntity>;
		}> = [];

		// store processed webhooks in a map -> O(1) remaining webhooks local conflict checks
		const processedWebhooks: Map<string, IWebhookData> = new Map();
		const webhookToKey = (webhook: IWebhookData) =>
			`${webhook.httpMethod} ${this.getWebhookPath(webhook)}`;

		for (const { node, webhooks } of checkEntries) {
			for (const webhook of webhooks) {
				const webhookKey = webhookToKey(webhook);
				const conflict = processedWebhooks.get(webhookKey)!;
				if (conflict) {
					// another node with the same webhook was already processed
					conflicts.push({
						trigger: node,
						conflict: {
							workflowId: workflow.id,
							webhookPath: conflict.path,
							method: conflict.httpMethod,
							node: conflict.node,
							webhookId: conflict.webhookId,
						},
					});
					continue;
				}

				const potentialConflict = await this.findWebhook(
					webhook.httpMethod,
					this.getWebhookPath(webhook),
				);

				if (potentialConflict && potentialConflict.workflowId !== workflow.id) {
					conflicts.push({
						trigger: node,
						conflict: potentialConflict,
					});
					continue;
				}

				processedWebhooks.set(webhookKey, webhook);
			}
		}

		return conflicts;
	}

	/**
	 * Analyzes all webhooks within the provided workflow. Returns all nodes that have a webhook conflict either
	 * within the same workflow or with other published workflows.
	 * @param workflow Workflow
	 * @param additionalData Workflow execution data
	 * @returns list of all nodes with existing webhook conflicts
	 */
	async findWebhookConflicts(workflow: Workflow, additionalData: IWorkflowExecuteAdditionalData) {
		const checkEntries = Object.values(workflow.nodes)
			.map((node) => ({
				node,
				webhooks: this.getNodeWebhooks(workflow, node, additionalData, true),
			}))
			.filter(({ webhooks }) => webhooks.length !== 0);

		return await this._findWebhookConflicts(workflow, checkEntries);
	}

	async createWebhookIfNotExists(
		workflow: Workflow,
		webhookData: IWebhookData,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
	): Promise<void> {
		const webhookExists = await this.runWebhookMethod(
			'checkExists',
			workflow,
			webhookData,
			mode,
			activation,
		);
		if (!webhookExists) {
			// If webhook does not exist yet create it
			await this.runWebhookMethod('create', workflow, webhookData, mode, activation);
		}
	}

	async deleteWebhook(
		workflow: Workflow,
		webhookData: IWebhookData,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
	) {
		await this.runWebhookMethod('delete', workflow, webhookData, mode, activation);
	}

	private async runWebhookMethod(
		method: WebhookSetupMethodNames,
		workflow: Workflow,
		webhookData: IWebhookData,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
	): Promise<boolean | undefined> {
		const node = workflow.getNode(webhookData.node);

		if (!node) return;

		const nodeType = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);

		const webhookFn = nodeType.webhookMethods?.[webhookData.webhookDescription.name]?.[method];
		if (webhookFn === undefined) return;

		const context = new HookContext(
			workflow,
			node,
			webhookData.workflowExecuteAdditionalData,
			mode,
			activation,
			webhookData,
		);

		return await webhookFn.call(context);
	}

	/**
	 * Executes the webhook data to see what it should return and if the
	 * workflow should be started or not
	 */
	async runWebhook(
		workflow: Workflow,
		webhookData: IWebhookData,
		node: INode,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		runExecutionData: IRunExecutionData | null,
	): Promise<IWebhookResponseData> {
		const nodeType = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
		if (nodeType.webhook === undefined) {
			throw new UnexpectedError('Node does not have any webhooks defined', {
				extra: { nodeName: node.name },
			});
		}

		const closeFunctions: Array<() => Promise<void>> = [];
		const context = new WebhookContext(
			workflow,
			node,
			additionalData,
			mode,
			webhookData,
			closeFunctions,
			runExecutionData ?? null,
		);

		try {
			return isNodeClassInstance(nodeType)
				? await nodeType.webhook(context)
				: await nodeType.webhook.call(context);
		} finally {
			const settledResults = await Promise.allSettled(closeFunctions.map(async (fn) => await fn()));
			for (const result of settledResults) {
				if (result.status === 'rejected') {
					this.logger.error('Failed to run webhook close function', {
						error: ensureError(result.reason),
						nodeName: node.name,
						nodeType: node.type,
					});
				}
			}
		}
	}
}
