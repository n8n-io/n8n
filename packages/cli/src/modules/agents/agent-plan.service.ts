import type { AgentPlanWorkState } from '@n8n/api-types';
import { AgentPlanWorkRepository } from './repositories/agent-plan-work.repository';
import { projectPlanWorkState } from './plans/agent-plan-work-state';
import type { OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';

import { parseAgentPlan, type AgentPlanDocument } from './plans/agent-plan.schema';
import {
	getAgentPlanReadiness,
	prepareAgentPlan,
	type AgentPlanReadiness,
} from './plans/agent-plan.validation';
import {
	AgentPlanRepository,
	AgentPlanWriteConflictError,
	type AgentPlanRecord,
	type AgentPlanRevision,
} from './repositories/agent-plan.repository';

type PlanDocumentInput = { data: unknown; formatVersion: number };
type PlanWrite = { threadId: string; planId: string; expectedRevision: number };

export type AgentPlanSnapshot = Omit<AgentPlanRecord, 'data'> & {
	data: AgentPlanDocument;
	readiness: AgentPlanReadiness;
	workState?: AgentPlanWorkState;
};

@Service()
export class AgentPlanService {
	constructor(
		private readonly repository: AgentPlanRepository,
		private readonly work: AgentPlanWorkRepository,
	) {}

	async createActivePlan(
		input: PlanDocumentInput & { id: string; threadId: string },
		ctx: OperationContext,
	) {
		const data = prepareAgentPlan(input.data, input.formatVersion, null, new Date());
		return await this.withWorkState(
			this.decode(await this.repository.createActivePlan({ ...input, data }, ctx)),
			input.threadId,
			ctx,
		);
	}

	async findActivePlan(threadId: string, ctx: OperationContext): Promise<AgentPlanSnapshot | null> {
		const plan = await this.repository.findActivePlan(threadId, ctx);
		return plan ? await this.withWorkState(this.decode(plan), threadId, ctx) : null;
	}

	async findPlan(threadId: string, planId: string, ctx: OperationContext) {
		const plan = await this.repository.findPlan(threadId, planId, ctx);
		return plan ? await this.withWorkState(this.decode(plan), threadId, ctx) : null;
	}

	async findRevision(threadId: string, planId: string, revision: number, ctx: OperationContext) {
		const plan = await this.repository.findRevision(threadId, planId, revision, ctx);
		return plan ? this.decode(plan) : null;
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
		const current = await this.loadForWrite(input, ctx);
		const data = prepareAgentPlan(input.data, input.formatVersion, current.data, new Date());
		return await this.withWorkState(
			this.decode(await this.repository.replacePlan({ ...input, data }, ctx)),
			input.threadId,
			ctx,
		);
	}

	async closePlan(input: PlanWrite, ctx: OperationContext) {
		await this.loadForWrite(input, ctx);
		return await this.withWorkState(
			this.decode(await this.repository.closePlan(input, ctx)),
			input.threadId,
			ctx,
		);
	}

	private async withWorkState(
		plan: AgentPlanSnapshot,
		threadId: string,
		ctx: OperationContext,
	): Promise<AgentPlanSnapshot> {
		const [stop, jobs] = await Promise.all([
			this.work.stopForPlan(threadId, plan.id, ctx),
			this.work.jobStatesForPlan(plan.id, ctx),
		]);
		return { ...plan, workState: projectPlanWorkState(plan.data, stop, jobs) };
	}

	private async loadForWrite(input: PlanWrite, ctx: OperationContext) {
		const current = await this.repository.findPlan(input.threadId, input.planId, ctx);
		if (!current || current.closedAt !== null || current.revision !== input.expectedRevision) {
			throw new AgentPlanWriteConflictError();
		}
		return this.decode(current);
	}

	private decode<RecordType extends AgentPlanRecord | AgentPlanRevision>(record: RecordType) {
		const data = parseAgentPlan(record.data, record.formatVersion);
		const readiness = getAgentPlanReadiness(data);
		return { ...record, data, readiness: record.closedAt ? { ready: [], blocked: [] } : readiness };
	}
}
