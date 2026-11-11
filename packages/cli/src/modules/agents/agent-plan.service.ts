import { TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';

import { AgentExecutionUpdateBroadcaster } from './agent-execution-update-broadcaster';
import {
	parseStoredAgentPlan,
	storeAgentPlan,
	type AgentPlanDocument,
} from './plans/agent-plan.schema';
import { resolveAgentPlan } from './plans/agent-plan-state';
import {
	getAgentPlanReadiness,
	prepareAgentPlan,
	type AgentPlanReadiness,
} from './plans/agent-plan.validation';
import { AgentExecutionThreadRepository } from './repositories/agent-execution-thread.repository';
import {
	AgentPlanRepository,
	AgentPlanWriteConflictError,
	type AgentPlanRecord,
} from './repositories/agent-plan.repository';

type PlanDocumentInput = { data: unknown; formatVersion: number };
type PlanWrite = { threadId: string; planId: string; expectedRevision: number };

export type AgentPlanSnapshot = Omit<AgentPlanRecord, 'data'> & {
	data: AgentPlanDocument;
	readiness: AgentPlanReadiness;
};

@Service()
export class AgentPlanService {
	constructor(
		private readonly repository: AgentPlanRepository,
		private readonly txRunner: TransactionRunner,
		private readonly threads: AgentExecutionThreadRepository,
		private readonly updates: AgentExecutionUpdateBroadcaster,
	) {}

	async createActivePlan(
		input: PlanDocumentInput & { id: string; threadId: string },
		ctx: OperationContext,
	) {
		return await this.write(input.threadId, ctx, async (ctx) => {
			const data = prepareAgentPlan(input.data, input.formatVersion, null, new Date());

			return await this.resolve(
				await this.repository.createActivePlan({ ...input, data: storeAgentPlan(data) }, ctx),
				ctx,
			);
		});
	}

	async findActivePlan(threadId: string, ctx: OperationContext): Promise<AgentPlanSnapshot | null> {
		const plan = await this.repository.findActivePlan(threadId, ctx);

		return plan ? await this.resolve(plan, ctx) : null;
	}

	async findLatestPlan(threadId: string, ctx: OperationContext): Promise<AgentPlanSnapshot | null> {
		const plan = await this.repository.findLatestPlan(threadId, ctx);

		return plan ? await this.resolve(plan, ctx) : null;
	}

	async findPlan(threadId: string, planId: string, ctx: OperationContext) {
		const plan = await this.repository.findPlan(threadId, planId, ctx);

		return plan ? await this.resolve(plan, ctx) : null;
	}

	async findRevision(threadId: string, planId: string, revision: number, ctx: OperationContext) {
		// History contains definitions and manual state, not historical job states.
		const plan = await this.repository.findRevision(threadId, planId, revision, ctx);

		return plan ? { ...plan, data: parseStoredAgentPlan(plan.data, plan.formatVersion) } : null;
	}

	async listHistory(
		threadId: string,
		planId: string,
		options: { afterRevision?: number; limit?: number },
		ctx: OperationContext,
	) {
		return await this.repository.listHistory(threadId, planId, options, ctx);
	}

	async replacePlan(input: PlanWrite & PlanDocumentInput, ctx: OperationContext) {
		return await this.updatePlan(input, () => input.data, ctx);
	}

	async updatePlan(
		input: PlanWrite & { formatVersion: number },
		update: (current: AgentPlanDocument) => unknown,
		ctx: OperationContext,
	) {
		return await this.write(input.threadId, ctx, async (ctx) => {
			const current = await this.loadForWrite(input, ctx);
			const data = prepareAgentPlan(
				update(current.data),
				input.formatVersion,
				current.data,
				new Date(),
			);

			return await this.resolve(
				await this.repository.replacePlan({ ...input, data: storeAgentPlan(data) }, ctx),
				ctx,
			);
		});
	}

	async closePlan(input: PlanWrite, ctx: OperationContext) {
		return await this.write(input.threadId, ctx, async (ctx) => {
			await this.loadForWrite(input, ctx);

			return await this.resolve(await this.repository.closePlan(input, ctx), ctx);
		});
	}

	private async write<T>(
		threadId: string,
		ctx: OperationContext,
		action: (ctx: OperationContext) => Promise<T>,
	) {
		const { result, thread } = await this.txRunner.run(ctx, async (ctx) => {
			const thread = await this.threads.lockById(threadId, ctx);

			return { result: await action(ctx), thread };
		});

		if (thread) this.updates.notifyBackgroundJobsUpdated(thread.agentId, threadId);

		return result;
	}

	private async loadForWrite(input: PlanWrite, ctx: OperationContext) {
		const current = await this.repository.findPlan(input.threadId, input.planId, ctx);

		if (!current || current.closedAt !== null || current.revision !== input.expectedRevision)
			throw new AgentPlanWriteConflictError();

		return await this.resolve(current, ctx);
	}

	private async resolve(
		record: AgentPlanRecord,
		ctx: OperationContext,
	): Promise<AgentPlanSnapshot> {
		const data = resolveAgentPlan(
			parseStoredAgentPlan(record.data, record.formatVersion),
			await this.repository.jobStatesForPlan(record.id, ctx),
		);

		return {
			...record,
			data,
			readiness: record.closedAt ? { ready: [], blocked: [] } : getAgentPlanReadiness(data),
		};
	}
}
