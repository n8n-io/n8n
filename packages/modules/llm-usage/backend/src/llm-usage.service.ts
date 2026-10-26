import type {
	LlmUsageCallItem,
	LlmUsageCallsQueryDto,
	LlmUsageCallsResponse,
	LlmUsageSummaryResponse,
	LlmUsageTopGroup,
	LlmUsageTotals,
} from '@n8n/api-types';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';

import {
	LlmUsageRepository,
	type LlmUsageCall,
	type LlmUsageTimeRange,
} from './llm-usage.repository';

/** The number of entries in each top-spender list. */
const TOP_GROUP_SIZE = 5;

const sumTotals = (days: LlmUsageTotals[]): LlmUsageTotals =>
	days.reduce(
		(sum, day) => ({
			calls: sum.calls + day.calls,
			unpricedCalls: sum.unpricedCalls + day.unpricedCalls,
			inputTokens: sum.inputTokens + day.inputTokens,
			outputTokens: sum.outputTokens + day.outputTokens,
			cacheReadTokens: sum.cacheReadTokens + day.cacheReadTokens,
			costUsd: sum.costUsd + day.costUsd,
		}),
		{ calls: 0, unpricedCalls: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, costUsd: 0 },
	);

/** The fields that the API returns for a call. A new column stays internal until it is added here. */
const toCallItem = (call: LlmUsageCall): LlmUsageCallItem => ({
	callId: call.callId,
	startedAt: call.startedAt?.toISOString() ?? null,
	finishedAt: call.finishedAt.toISOString(),
	durationMs: call.durationMs,
	callerType: call.callerType,
	subType: call.subType,
	workflowId: call.workflowId,
	workflowName: call.workflowName,
	executionId: call.executionId,
	executionMode: call.executionMode,
	nodeName: call.nodeName,
	agentId: call.agentId,
	agentName: call.agentName,
	threadId: call.threadId,
	threadTitle: call.threadTitle,
	projectId: call.projectId,
	projectName: call.projectName,
	userId: call.userId,
	userEmail: call.userEmail,
	// Only the name: the API never returns credential IDs.
	credentialName: call.credentialName,
	managedBy: call.managedBy,
	provider: call.provider,
	model: call.model,
	inputTokens: call.inputTokens,
	outputTokens: call.outputTokens,
	estimatedCostUsd: call.estimatedCostUsd,
	priced: call.priced,
});

/** The last `days` times 24 hours, up to now. */
const lastDays = (days: number): LlmUsageTimeRange => {
	const to = new Date();
	return { from: new Date(to.getTime() - days * Time.days.toMilliseconds), to };
};

/** Builds the responses of the LLM usage API from the stored calls. */
@Service()
export class LlmUsageService {
	constructor(private readonly repository: LlmUsageRepository) {}

	/** Totals, daily spend and the top spenders of the last `days` days. */
	async getSummary(days: number): Promise<LlmUsageSummaryResponse> {
		const range = lastDays(days);
		// The range total is the sum of its days, so no separate query reads the range again.
		const dailyTotals = await this.repository.dailyTotals(range);
		const topGroup = async (groupBy: LlmUsageTopGroup) =>
			await this.repository.totalsByGroup({ ...range, groupBy, limit: TOP_GROUP_SIZE });
		// One query at a time (properties are evaluated in order): each reads the whole range,
		// and together they would take every connection of the pool from the rest of n8n.
		const top = {
			workflow: await topGroup('workflow'),
			agent: await topGroup('agent'),
			model: await topGroup('model'),
			caller: await topGroup('caller'),
			user: await topGroup('user'),
		};
		return {
			totals: sumTotals(dailyTotals),
			daily: dailyTotals.map(({ date, calls, costUsd }) => ({ date, calls, costUsd })),
			top,
		};
	}

	/** One page of the calls of the last `days` days. */
	async getCalls({ days, ...page }: LlmUsageCallsQueryDto): Promise<LlmUsageCallsResponse> {
		const { count, items } = await this.repository.listCalls({ ...lastDays(days), ...page });
		return { count, items: items.map(toCallItem) };
	}

	/**
	 * One page of the calls in a time range, oldest first. Calls stored later mostly finished
	 * later too, so they land on later pages instead of moving the pages a client has read.
	 */
	async listCallsInRange({
		offset,
		limit,
		...range
	}: LlmUsageTimeRange & { offset: number; limit: number }) {
		return await this.repository.listCalls({
			...range,
			skip: offset,
			take: limit,
			sortBy: 'finishedAt',
			sortOrder: 'asc',
		});
	}
}
