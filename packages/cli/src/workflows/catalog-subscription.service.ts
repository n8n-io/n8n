import { Logger } from '@n8n/backend-common';
import { ScheduledJobMisfirePolicy } from '@n8n/constants';
import type { OperationContext, User, WorkflowSubscription } from '@n8n/db';
import {
	TransactionRunner,
	WorkflowCredentialBindingRepository,
	WorkflowRepository,
	WorkflowSubscriptionRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import type { Schedule } from '@n8n/scheduler';
import { computeFirstRunAt, validateSchedule } from '@n8n/scheduler';
import type { CronExpression, IDataObject } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';

import { DurableJobProvisioner } from '@/scheduling/durable-job-provisioner';
import {
	CATALOG_SUBSCRIPTION_TASK_TYPE,
	type CatalogSubscriptionTaskPayload,
} from '@/workflows/catalog-subscription-task';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowInputSchemaService } from '@/workflows/workflow-input-schema.service';

/**
 * How many schedules one person may hold across all workflows.
 *
 * A ceiling rather than a tuned number: each subscription is a durable job the
 * materializer walks on every pass, so an unbounded count is a way for one
 * person to slow the scheduler down for everyone. Pending a decision on whether
 * this belongs in instance config.
 */
export const MAX_SUBSCRIPTIONS_PER_USER = 20;

export type SubscriptionInput = {
	cronExpression: string;
	timezone: string;
	inputs: IDataObject;
	enabled: boolean;
};

export type SubscriptionSummary = {
	id: string;
	workflowId: string;
	workflowName: string | null;
	cronExpression: string;
	timezone: string;
	inputs: IDataObject;
	enabled: boolean;
	/** When it next fires, or null when the subscription is paused. */
	nextRunAt: Date | null;
};

/**
 * A person's own schedules for catalog workflows.
 *
 * Two stores have to agree: the subscription rows here, and the durable jobs the
 * scheduler runs from. Nothing keeps them in step automatically — a job carries
 * an opaque `ownerId` with no foreign key, so a deleted row leaves its jobs
 * firing into nothing. Every path through this service therefore deprovisions
 * before it deletes, and treats a failed provision as a reason to put the row
 * back rather than leave the two disagreeing.
 */
@Service()
export class CatalogSubscriptionService {
	constructor(
		private readonly logger: Logger,
		private readonly txRunner: TransactionRunner,
		private readonly subscriptions: WorkflowSubscriptionRepository,
		private readonly bindings: WorkflowCredentialBindingRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly workflowInputSchemaService: WorkflowInputSchemaService,
		private readonly jobProvisioner: DurableJobProvisioner,
	) {}

	async list(user: User): Promise<SubscriptionSummary[]> {
		const rows = await this.subscriptions.findManyForUser(user.id);
		if (rows.length === 0) return [];

		const workflowIds = [...new Set(rows.map((row) => row.workflowId))];
		const workflows = await this.workflowRepository.findByIds(workflowIds, {
			fields: ['id', 'name'],
		});
		const names = new Map(workflows.map((workflow) => [workflow.id, workflow.name]));

		return rows.map((row) => this.toSummary(row, names.get(row.workflowId) ?? null));
	}

	/**
	 * Take on a workflow's schedule. Granting consent is part of creating the
	 * first schedule rather than a separate step: a schedule is the only reason
	 * the grant exists, so asking twice would be asking the same question twice.
	 */
	async create(
		user: User,
		workflowId: string,
		input: SubscriptionInput,
	): Promise<SubscriptionSummary> {
		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:execute',
		]);

		if (!workflow) {
			throw new UserError('Could not find workflow');
		}

		const schema = await this.workflowInputSchemaService.describe(workflow);
		if (!schema.eligible) {
			throw new UserError('This workflow cannot be run on a schedule', {
				extra: { workflowId, reason: schema.reason },
			});
		}

		const held = await this.subscriptions.countForUser(user.id);
		if (held >= MAX_SUBSCRIPTIONS_PER_USER) {
			throw new UserError(
				`You can hold at most ${MAX_SUBSCRIPTIONS_PER_USER} schedules; remove one to add another`,
			);
		}

		const firstRunAt = this.planFirstRun(input);
		const declared = new Set(schema.fields.map((field) => field.name));
		const inputs = filterToDeclared(input.inputs, declared);

		const subscription = await this.txRunner.run({}, async (ctx) => {
			await this.bindings.grant(workflowId, user.id, ctx);
			return await this.subscriptions.createOne(workflowId, user.id, { ...input, inputs }, ctx);
		});

		try {
			await this.applySchedule(subscription, firstRunAt);
		} catch (error) {
			// The row exists but has no schedule behind it, which would read as a
			// working subscription that never fires. Take it back out. The grant is
			// left standing: consent with nothing scheduled costs nothing, granting
			// is idempotent, and withdrawing it here would surprise someone who had
			// already consented before this attempt.
			await this.subscriptions.deleteOne(subscription.id);
			throw error;
		}

		return this.toSummary(subscription, workflow.name);
	}

	async update(user: User, id: string, input: SubscriptionInput): Promise<SubscriptionSummary> {
		const existing = await this.subscriptions.findOneForUser(id, user.id);
		if (!existing) {
			throw new UserError('Could not find subscription');
		}

		const workflow = await this.workflowFinderService.findWorkflowForUser(
			existing.workflowId,
			user,
			['workflow:execute'],
		);
		if (!workflow) {
			throw new UserError('Could not find workflow');
		}

		const schema = await this.workflowInputSchemaService.describe(workflow);
		if (!schema.eligible) {
			throw new UserError('This workflow cannot be run on a schedule', {
				extra: { workflowId: existing.workflowId, reason: schema.reason },
			});
		}

		const firstRunAt = this.planFirstRun(input);
		const declared = new Set(schema.fields.map((field) => field.name));
		const updated = { ...input, inputs: filterToDeclared(input.inputs, declared) };

		await this.subscriptions.updateOne(id, updated);

		try {
			await this.applySchedule({ ...existing, ...updated }, firstRunAt);
		} catch (error) {
			// Put the row back rather than leave it describing a schedule the
			// scheduler never accepted.
			await this.subscriptions.updateOne(id, {
				cronExpression: existing.cronExpression,
				timezone: existing.timezone,
				inputs: existing.inputs,
				enabled: existing.enabled,
			});
			throw error;
		}

		return this.toSummary({ ...existing, ...updated }, workflow.name);
	}

	/** Deprovision first: a deleted row leaves no way to find the jobs it owned. */
	async remove(user: User, id: string): Promise<void> {
		const existing = await this.subscriptions.findOneForUser(id, user.id);
		if (!existing) {
			throw new UserError('Could not find subscription');
		}

		await this.jobProvisioner.deprovisionOwner(id, CATALOG_SUBSCRIPTION_TASK_TYPE);
		await this.subscriptions.deleteOne(id);
	}

	/**
	 * Withdraw consent for a workflow, taking every schedule for it down first.
	 *
	 * The database cascades the subscription rows away with the grant, but it
	 * cannot reach the scheduler jobs, so those go first and by hand.
	 */
	async revokeConsent(user: User, workflowId: string): Promise<void> {
		const held = await this.subscriptions.findEnabledForBinding(workflowId, user.id);

		for (const subscription of held) {
			await this.jobProvisioner.deprovisionOwner(subscription.id, CATALOG_SUBSCRIPTION_TASK_TYPE);
		}

		await this.txRunner.run({}, async (ctx: OperationContext) => {
			for (const subscription of held) {
				await this.subscriptions.deleteOne(subscription.id, ctx);
			}
			await this.bindings.revoke(workflowId, user.id, ctx);
		});

		this.logger.debug('Revoked catalog consent', {
			workflowId,
			userId: user.id,
			subscriptions: held.length,
		});
	}

	/**
	 * Make the scheduler agree with the row: one job for an enabled subscription,
	 * none for a paused one. Provisioning is a diff by name, so re-running it with
	 * the same schedule leaves the job's clock alone.
	 */
	private async applySchedule(
		subscription: Pick<WorkflowSubscription, 'id' | 'cronExpression' | 'timezone' | 'enabled'>,
		firstRunAt: Date | null,
	): Promise<void> {
		if (!subscription.enabled) {
			await this.jobProvisioner.deprovisionOwner(subscription.id, CATALOG_SUBSCRIPTION_TASK_TYPE);
			return;
		}

		const payload: CatalogSubscriptionTaskPayload = { subscriptionId: subscription.id };

		await this.jobProvisioner.provisionForOwner(
			subscription.id,
			CATALOG_SUBSCRIPTION_TASK_TYPE,
			{ ...payload },
			[
				{
					// One job per subscription, so the name only has to be stable and
					// unique across the instance.
					name: `catalog-subscription:${subscription.id}`,
					schedule: this.toSchedule(subscription),
					firstRunAt,
				},
			],
			// A person who was away should come back to one catch-up run, not to a
			// missed morning; `skip` would silently drop it.
			ScheduledJobMisfirePolicy.Coalesce,
		);
	}

	/**
	 * Validate the schedule by planning its first fire, before anything is
	 * written. A rejected expression must fail the request rather than land a row
	 * the scheduler will not accept.
	 */
	private planFirstRun(input: SubscriptionInput): Date | null {
		if (!input.enabled) return null;

		let firstRunAt: Date | null;
		try {
			firstRunAt = computeFirstRunAt(this.toSchedule(input), new Date());
		} catch (error) {
			throw new UserError('This schedule is not valid', {
				cause: error,
				extra: { cronExpression: input.cronExpression, timezone: input.timezone },
			});
		}

		if (firstRunAt === null) {
			throw new UserError('This schedule would never run');
		}

		return firstRunAt;
	}

	private toSchedule({
		cronExpression,
		timezone,
	}: Pick<SubscriptionInput, 'cronExpression' | 'timezone'>): Schedule {
		if (!isCronExpression(cronExpression)) {
			throw new UserError('This is not a valid schedule expression', {
				extra: { cronExpression },
			});
		}
		return { kind: 'cron', cronExpression, timezone };
	}

	private toSummary(
		subscription: Pick<
			WorkflowSubscription,
			'id' | 'workflowId' | 'cronExpression' | 'timezone' | 'inputs' | 'enabled'
		>,
		workflowName: string | null,
	): SubscriptionSummary {
		return {
			id: subscription.id,
			workflowId: subscription.workflowId,
			workflowName,
			cronExpression: subscription.cronExpression,
			timezone: subscription.timezone,
			inputs: subscription.inputs,
			enabled: subscription.enabled,
			// Recomputed rather than read back from the job row: the answer is the
			// same and it keeps the listing to two queries.
			nextRunAt: subscription.enabled
				? computeFirstRunAt(this.toSchedule(subscription), new Date())
				: null,
		};
	}
}

/**
 * `CronExpression` is a template-literal type that a string arriving on a
 * request can never satisfy structurally, so the scheduler's own validator is
 * the only real check available. Run it and narrow on the answer, keeping the
 * one unavoidable assertion inside the guard rather than at every call site.
 */
function isCronExpression(value: string): value is CronExpression {
	try {
		validateSchedule({
			kind: 'cron',
			cronExpression: value as CronExpression,
			timezone: 'UTC',
		});
		return true;
	} catch {
		return false;
	}
}

/**
 * Drop anything the workflow's trigger does not declare. A builder can remove a
 * field after someone subscribed, and a stored value for it must not keep
 * reaching the workflow.
 */
function filterToDeclared(inputs: IDataObject, declared: Set<string>): IDataObject {
	return Object.fromEntries(Object.entries(inputs).filter(([name]) => declared.has(name)));
}
