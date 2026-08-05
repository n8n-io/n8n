import { CatalogRunDto, CatalogSubscriptionDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Delete,
	Get,
	GlobalScope,
	Patch,
	Post,
	ProjectScope,
	RestController,
} from '@n8n/decorators';
import type { IDataObject } from 'n8n-workflow';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { CatalogRunService } from '@/workflows/catalog-run.service';
import { CatalogSubscriptionService } from '@/workflows/catalog-subscription.service';
import { CatalogService } from '@/workflows/catalog.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

type WorkflowParam = { workflowId: string };
type SubscriptionParam = { subscriptionId: string };

/**
 * Running a workflow you were given access to, without opening the editor.
 *
 * `@ProjectScope` resolves workflow → project from `:workflowId` and rejects
 * before the handler, so someone with execute but not read never reaches it —
 * which is the point: the catalog is for people who run workflows, not build
 * them, and it never hands out the graph.
 */
@RestController('/catalog')
export class CatalogController {
	constructor(
		private readonly catalogService: CatalogService,
		private readonly catalogRunService: CatalogRunService,
		private readonly catalogSubscriptionService: CatalogSubscriptionService,
		private readonly workflowFinderService: WorkflowFinderService,
	) {}

	/**
	 * Scoped globally rather than per project: the listing spans every project
	 * the person belongs to, and the per-workflow filtering happens in the query.
	 */
	@Get('/workflows')
	@GlobalScope('workflow:list')
	async list(req: AuthenticatedRequest) {
		return await this.catalogService.list(req.user);
	}

	@Post('/workflows/:workflowId/run')
	@ProjectScope('workflow:execute')
	async run(req: AuthenticatedRequest<WorkflowParam>, _res: unknown, @Body payload: CatalogRunDto) {
		const workflow = await this.workflowFinderService.findWorkflowForUser(
			req.params.workflowId,
			req.user,
			['workflow:execute'],
		);

		if (!workflow) {
			throw new NotFoundError('Could not find workflow');
		}

		return await this.catalogRunService.run(
			workflow,
			req.user,
			(payload.inputs ?? {}) as IDataObject,
		);
	}

	/**
	 * Scoped globally rather than per project, like the listing: someone's
	 * schedules span every project they belong to, and each one is filtered to
	 * them by the query rather than by the route.
	 */
	@Get('/subscriptions')
	@GlobalScope('workflow:list')
	async listSubscriptions(req: AuthenticatedRequest) {
		return await this.catalogSubscriptionService.list(req.user);
	}

	/**
	 * Taking on a schedule is also where consent to run as this person is
	 * recorded, so it is gated on execute access to the workflow itself.
	 */
	@Post('/workflows/:workflowId/subscriptions')
	@ProjectScope('workflow:execute')
	async createSubscription(
		req: AuthenticatedRequest<WorkflowParam>,
		_res: unknown,
		@Body payload: CatalogSubscriptionDto,
	) {
		return await this.catalogSubscriptionService.create(req.user, req.params.workflowId, {
			cronExpression: payload.cronExpression,
			timezone: payload.timezone,
			inputs: (payload.inputs ?? {}) as IDataObject,
			enabled: payload.enabled ?? true,
		});
	}

	/**
	 * Not `@ProjectScope`: the route names a subscription, not a workflow, so
	 * there is no workflow for the decorator to resolve a project from. The
	 * service scopes every read to the requesting person and re-checks execute
	 * access on the workflow behind it.
	 */
	@Patch('/subscriptions/:subscriptionId')
	@GlobalScope('workflow:list')
	async updateSubscription(
		req: AuthenticatedRequest<SubscriptionParam>,
		_res: unknown,
		@Body payload: CatalogSubscriptionDto,
	) {
		return await this.catalogSubscriptionService.update(req.user, req.params.subscriptionId, {
			cronExpression: payload.cronExpression,
			timezone: payload.timezone,
			inputs: (payload.inputs ?? {}) as IDataObject,
			enabled: payload.enabled ?? true,
		});
	}

	@Delete('/subscriptions/:subscriptionId')
	@GlobalScope('workflow:list')
	async deleteSubscription(req: AuthenticatedRequest<SubscriptionParam>) {
		await this.catalogSubscriptionService.remove(req.user, req.params.subscriptionId);
		return { success: true };
	}

	/**
	 * Withdraw consent for a workflow, which takes every schedule for it with it.
	 * Separate from deleting a single schedule: this is the answer to "stop using
	 * my accounts", and it must hold even if a schedule is added a moment later.
	 */
	@Delete('/workflows/:workflowId/consent')
	@ProjectScope('workflow:execute')
	async revokeConsent(req: AuthenticatedRequest<WorkflowParam>) {
		await this.catalogSubscriptionService.revokeConsent(req.user, req.params.workflowId);
		return { success: true };
	}
}
