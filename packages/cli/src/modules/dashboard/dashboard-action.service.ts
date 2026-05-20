import type { DashboardAction, ExecuteDashboardActionDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import axios from 'axios';
import { NodeHelpers } from 'n8n-workflow';
import type { INode } from 'n8n-workflow';

import { UrlService } from '@/services/url.service';

import { DashboardRepository } from './dashboard.repository';
import { DashboardActionNotFoundError } from './errors/dashboard-action-not-found.error';
import { DashboardNotFoundError } from './errors/dashboard-not-found.error';
import { DashboardValidationError } from './errors/dashboard-validation.error';

const MAX_PAYLOAD_BYTES = 64 * 1024; // 64 KB
const IDEMPOTENCY_TTL_MS = 60_000;
const DEFAULT_TIMEOUT_MS = 30_000;

type IdempotencyEntry = {
	expiresAt: number;
	response: {
		status: number;
		ok: boolean;
		body: unknown;
		workflowId?: string;
		webhookNodeName?: string;
		actionLabel?: string;
	};
};

@Service()
export class DashboardActionService {
	private readonly idempotencyCache = new Map<string, IdempotencyEntry>();

	constructor(
		private readonly dashboardRepository: DashboardRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly urlService: UrlService,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('dashboard');
	}

	async executeAction(
		dashboardId: string,
		projectId: string,
		slug: string,
		dto: ExecuteDashboardActionDto,
	) {
		const dashboard = await this.dashboardRepository.findOne({
			where: { id: dashboardId, projectId },
		});
		if (!dashboard) throw new DashboardNotFoundError(dashboardId);

		const action = this.findAction(dashboard.spec, slug, dto.widgetId);
		if (!action) throw new DashboardActionNotFoundError(slug);

		// Idempotency dedupe: identical (dashboard, slug, key) within 60s returns the cached response.
		const cached = this.checkIdempotency(dashboardId, slug, dto.idempotencyKey);
		if (cached) return cached;

		// SSRF protection: resolve the URL server-side from workflowId + webhookNodeId.
		// We deliberately ignore any persisted `webhookUrl` from the spec — it might
		// have been crafted to point at internal services.
		const url = await this.resolveActionUrl(action, projectId);

		const payload = this.buildPayload(dashboard.id, slug, action, dto);
		this.assertPayloadSize(payload);

		const timeoutMs = Number(process.env.N8N_DASHBOARD_ACTION_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;

		this.logger.info('Firing dashboard action webhook', { dashboardId, slug, url });

		try {
			const response = await axios.post(url, payload, {
				headers: {
					'Content-Type': 'application/json',
					'X-N8N-Dashboard-Id': dashboard.id,
					'X-N8N-Dashboard-Action': slug,
					...(dto.idempotencyKey ? { 'Idempotency-Key': dto.idempotencyKey } : {}),
				},
				timeout: timeoutMs,
				validateStatus: () => true,
				maxBodyLength: MAX_PAYLOAD_BYTES,
				maxContentLength: 10 * 1024 * 1024, // 10 MB response cap
			});

			const result = {
				status: response.status,
				ok: response.status >= 200 && response.status < 300,
				body: response.data as unknown,
				/** Echoed back so the frontend can show a "View run" link / toast. */
				workflowId: action.target.workflowId,
				webhookNodeName: action.target.webhookNodeName,
				actionLabel: action.label,
			};
			this.logger.info('Dashboard action webhook response', {
				dashboardId,
				slug,
				status: result.status,
				ok: result.ok,
			});
			this.cacheIdempotency(dashboardId, slug, dto.idempotencyKey, result);
			return result;
		} catch (err) {
			this.logger.warn('Failed to trigger dashboard action webhook', {
				dashboardId,
				slug,
				url,
				error: err instanceof Error ? err.message : String(err),
			});
			throw err;
		}
	}

	/**
	 * Resolve the webhook URL by looking up the bound workflow + node and reading
	 * the node's `path` parameter. The resulting URL is always rooted at the
	 * instance's own webhook base — external URLs cannot be specified by spec.
	 */
	private async resolveActionUrl(action: DashboardAction, projectId: string): Promise<string> {
		const target = action.target as {
			workflowId?: string;
			webhookId?: string;
			webhookNodeId?: string;
			webhookNodeName?: string;
		};
		const { workflowId, webhookId, webhookNodeId, webhookNodeName } = target;
		if (!workflowId || !webhookNodeId) {
			throw new DashboardValidationError(
				`Action "${action.slug}" is missing workflowId or webhookNodeId. Re-bind it via the dashboard picker.`,
			);
		}

		const workflow = await this.workflowRepository.findOne({
			where: { id: workflowId },
			select: ['id', 'nodes', 'active'],
		});
		if (!workflow) {
			throw new DashboardValidationError(
				`Workflow "${workflowId}" referenced by action "${action.slug}" no longer exists.`,
			);
		}

		const rawNode = this.findWebhookNode((workflow.nodes ?? []) as INode[], {
			webhookId,
			webhookNodeId,
			webhookNodeName,
		});
		if (!rawNode) {
			const present = (workflow.nodes ?? [])
				.map((n) => `${(n as INode).name} (${(n as INode).id})`)
				.join(', ');
			throw new DashboardValidationError(
				`Webhook node not found in workflow "${workflowId}". ` +
					`Bound webhookId="${webhookId ?? '?'}", nodeId="${webhookNodeId}", name="${webhookNodeName ?? '?'}". ` +
					`Workflow contains: ${present || '(no nodes)'}. ` +
					`Re-bind the action via the dashboard picker.`,
			);
		}

		const isWebhookNode =
			rawNode.type === 'n8n-nodes-base.webhook' ||
			rawNode.type === 'n8n-nodes-base.formTrigger' ||
			rawNode.type === 'n8n-nodes-base.mcpTrigger';
		if (!isWebhookNode) {
			throw new DashboardValidationError(
				`Node "${rawNode.name}" in workflow "${workflowId}" is not a webhook-style trigger (got type "${rawNode.type}").`,
			);
		}

		if (!workflow.active) {
			throw new DashboardValidationError(
				`Workflow "${workflowId}" is not active. Activate it before firing actions.`,
			);
		}

		// Build the webhook URL using n8n's canonical helper. Mirrors what the
		// editor's `useWorkflowHelpers.getWebhookUrl()` does:
		//   - The webhook handler is mounted at `<webhookBaseUrl>/webhook/...`.
		//     `urlService.getWebhookBaseUrl()` returns the instance root with a
		//     trailing slash; we strip the slash and append `/webhook` to match
		//     `rootStore.webhookUrl` in editor-ui.
		//   - `isFullPath = true` for all three supported trigger node types
		//     (n8n-nodes-base.webhook, formTrigger, mcpTrigger).
		//   - The helper falls back to `node.webhookId` when `path` is empty,
		//     which is the right behavior for AI-built webhooks that don't
		//     configure a custom path.
		const instanceWebhookBase = this.urlService.getWebhookBaseUrl().replace(/\/$/, '') + '/webhook';
		const path = String((rawNode.parameters ?? {}).path ?? '');
		void projectId; // reserved for future per-project URL scoping

		return NodeHelpers.getNodeWebhookUrl(instanceWebhookBase, workflowId, rawNode, path, true);
	}

	/**
	 * Resilient lookup chain. n8n generates two identifiers per webhook node:
	 *
	 *   - `node.id` — UI identifier. **Regenerated** on every AI builder save
	 *     (see `regenerateNodeIds` in `parse-validate-handler.ts`). Unreliable
	 *     as a long-term binding key.
	 *   - `node.webhookId` — internal routing UUID. Created once when the
	 *     webhook node is first saved and **never** regenerated. The canonical
	 *     stable identifier for webhook nodes.
	 *
	 * Priority (most → least stable):
	 *   1. `node.webhookId` match
	 *   2. `node.id` match (legacy bindings stored before webhookId was captured)
	 *   3. `node.name` match (stable for AI-built workflows with deterministic names)
	 *   4. Sole webhook-style node in the workflow
	 */
	private findWebhookNode(
		nodes: INode[],
		target: { webhookId?: string; webhookNodeId?: string; webhookNodeName?: string },
	): INode | undefined {
		if (target.webhookId) {
			const byWebhookId = nodes.find(
				(n) => (n as INode & { webhookId?: string }).webhookId === target.webhookId,
			);
			if (byWebhookId) return byWebhookId;
		}

		if (target.webhookNodeId) {
			const byId = nodes.find((n) => n.id === target.webhookNodeId);
			if (byId) {
				if (target.webhookId) {
					// We had a webhookId but it didn't match — odd. Log so we know.
					this.logger.warn('Dashboard action: webhookId stale; falling back to node.id match', {
						boundWebhookId: target.webhookId,
						resolvedNodeId: byId.id,
						resolvedWebhookId: (byId as INode & { webhookId?: string }).webhookId,
					});
				}
				return byId;
			}
		}

		if (target.webhookNodeName) {
			const byName = nodes.find((n) => n.name === target.webhookNodeName);
			if (byName) {
				this.logger.warn('Dashboard action node id drifted; falling back to name match', {
					boundNodeId: target.webhookNodeId,
					boundName: target.webhookNodeName,
					resolvedNodeId: byName.id,
					resolvedWebhookId: (byName as INode & { webhookId?: string }).webhookId,
				});
				return byName;
			}
		}

		const webhookCandidates = nodes.filter(
			(n) =>
				n.type === 'n8n-nodes-base.webhook' ||
				n.type === 'n8n-nodes-base.formTrigger' ||
				n.type === 'n8n-nodes-base.mcpTrigger',
		);
		if (webhookCandidates.length === 1) {
			this.logger.warn(
				'Dashboard action: all identifiers drifted; falling back to sole webhook node',
				{ resolvedNodeId: webhookCandidates[0].id },
			);
			return webhookCandidates[0];
		}

		return undefined;
	}

	private findAction(
		spec: {
			actions?: DashboardAction[];
			widgets?: Array<unknown>;
			views?: Array<{ widgets: Array<unknown> }>;
		},
		slug: string,
		widgetId?: string,
	): DashboardAction | undefined {
		const topLevel = spec.actions?.find((a) => a.slug === slug);
		if (topLevel) return topLevel;

		const allWidgets: unknown[] = [
			...(spec.widgets ?? []),
			...(spec.views?.flatMap((v) => v.widgets) ?? []),
		];

		for (const widget of allWidgets) {
			const w = widget as { id?: string; type?: string; rowActions?: DashboardAction[] };
			if (widgetId && w.id !== widgetId) continue;
			if (w.type === 'table' && Array.isArray(w.rowActions)) {
				const found = w.rowActions.find((a) => a.slug === slug);
				if (found) return found;
			}
		}
		return undefined;
	}

	private buildPayload(
		dashboardId: string,
		slug: string,
		action: DashboardAction,
		dto: ExecuteDashboardActionDto,
	) {
		const meta = {
			dashboardId,
			actionSlug: slug,
			widgetId: dto.widgetId,
			rowId: dto.rowId,
		};

		switch (action.payloadShape) {
			case 'rows':
				return { ...meta, rows: dto.rows ?? [] };
			case 'custom': {
				const template = action.customPayloadTemplate ?? {};
				const row = dto.row ?? {};
				const interpolated: Record<string, unknown> = {};
				for (const [k, v] of Object.entries(template)) {
					interpolated[k] = typeof v === 'string' ? this.interpolate(v, row) : v;
				}
				return { ...meta, payload: interpolated };
			}
			case 'row':
			default:
				return { ...meta, row: dto.row ?? null };
		}
	}

	/** Replace `{{row.<col>}}` placeholders with row values; non-string values are JSON-stringified. */
	private interpolate(template: string, row: Record<string, unknown>): string {
		return template.replace(/\{\{\s*row\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (_, key: string) => {
			const v = row[key];
			if (v === null || v === undefined) return '';
			return typeof v === 'string' ? v : JSON.stringify(v);
		});
	}

	private assertPayloadSize(payload: unknown): void {
		const size = Buffer.byteLength(JSON.stringify(payload), 'utf8');
		if (size > MAX_PAYLOAD_BYTES) {
			throw new DashboardValidationError(
				`Action payload of ${size} bytes exceeds the ${MAX_PAYLOAD_BYTES}-byte limit.`,
			);
		}
	}

	private idempotencyId(dashboardId: string, slug: string, key?: string): string | null {
		if (!key) return null;
		return `${dashboardId}::${slug}::${key}`;
	}

	private checkIdempotency(dashboardId: string, slug: string, key?: string) {
		const id = this.idempotencyId(dashboardId, slug, key);
		if (!id) return undefined;
		const entry = this.idempotencyCache.get(id);
		if (!entry) return undefined;
		if (Date.now() > entry.expiresAt) {
			this.idempotencyCache.delete(id);
			return undefined;
		}
		return entry.response;
	}

	private cacheIdempotency(
		dashboardId: string,
		slug: string,
		key: string | undefined,
		response: IdempotencyEntry['response'],
	) {
		const id = this.idempotencyId(dashboardId, slug, key);
		if (!id) return;
		this.idempotencyCache.set(id, {
			expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
			response,
		});
		// Opportunistic GC.
		if (this.idempotencyCache.size > 1000) {
			const now = Date.now();
			for (const [k, v] of this.idempotencyCache.entries()) {
				if (v.expiresAt < now) this.idempotencyCache.delete(k);
			}
		}
	}
}
