import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import type { IDataObject } from 'n8n-workflow';

import { WorkflowSubscription } from '../entities';
import { BaseRepository } from './base-repository';
import type { OperationContext } from '../services/transaction';

/** What a caller may set when creating or changing a subscription. */
export type WorkflowSubscriptionInput = {
	cronExpression: string;
	timezone: string;
	inputs: IDataObject;
	enabled: boolean;
};

@Service()
export class WorkflowSubscriptionRepository extends BaseRepository<WorkflowSubscription> {
	constructor(dataSource: DataSource) {
		super(WorkflowSubscription, dataSource.manager);
	}

	async createOne(
		workflowId: string,
		userId: string,
		input: WorkflowSubscriptionInput,
		ctx: OperationContext = {},
	): Promise<WorkflowSubscription> {
		const manager = this.managerFor(ctx);
		const subscription = manager.create(WorkflowSubscription, { workflowId, userId, ...input });
		return await manager.save(subscription);
	}

	/**
	 * One subscription by id alone. Only for the scheduler, which arrives with an
	 * occurrence rather than a person and reads the row to find out whose it is;
	 * anything serving a request must use {@link findOneForUser}.
	 */
	async findOneById(id: string, ctx: OperationContext = {}): Promise<WorkflowSubscription | null> {
		return await this.managerFor(ctx).findOneBy(WorkflowSubscription, { id });
	}

	/**
	 * One subscription, scoped to its owner. Every read is scoped this way: a
	 * subscription id is the only thing an endpoint receives, so without the user
	 * in the predicate one person could address another's schedule.
	 */
	async findOneForUser(
		id: string,
		userId: string,
		ctx: OperationContext = {},
	): Promise<WorkflowSubscription | null> {
		return await this.managerFor(ctx).findOneBy(WorkflowSubscription, { id, userId });
	}

	async findManyForUser(
		userId: string,
		ctx: OperationContext = {},
	): Promise<WorkflowSubscription[]> {
		return await this.managerFor(ctx).find(WorkflowSubscription, {
			where: { userId },
			order: { createdAt: 'ASC' },
		});
	}

	/** Every enabled subscription for a (workflow, person), for deprovisioning a whole grant. */
	async findEnabledForBinding(
		workflowId: string,
		userId: string,
		ctx: OperationContext = {},
	): Promise<WorkflowSubscription[]> {
		return await this.managerFor(ctx).findBy(WorkflowSubscription, {
			workflowId,
			userId,
			enabled: true,
		});
	}

	async countForUser(userId: string, ctx: OperationContext = {}): Promise<number> {
		return await this.managerFor(ctx).countBy(WorkflowSubscription, { userId });
	}

	async updateOne(
		id: string,
		input: WorkflowSubscriptionInput,
		ctx: OperationContext = {},
	): Promise<void> {
		await this.managerFor(ctx).update(WorkflowSubscription, { id }, input);
	}

	async deleteOne(id: string, ctx: OperationContext = {}): Promise<void> {
		await this.managerFor(ctx).delete(WorkflowSubscription, { id });
	}
}
