import type { ThreadDetail } from '../composables/useAgentThreadsApi';
import type { AgentUsageUpdate } from '../types';

/** Hide unavailable usage and avoid rounding a positive cost to zero. */
export function formatAgentUsage(
	totalTokens: number,
	cost: number | null | undefined,
): string | null {
	if (!Number.isFinite(totalTokens) || totalTokens <= 0) return null;
	const tokens = `${totalTokens.toLocaleString()}t`;
	if (cost === null || cost === undefined || !Number.isFinite(cost) || cost <= 0) return tokens;
	const price = cost < 0.0001 ? '<$0.0001' : `$${cost.toFixed(4)}`;
	return `${tokens} (${price})`;
}

/** Add live execution snapshots only until the saved totals include them. */
export function getAgentSessionUsage(
	detail: ThreadDetail,
	updates: Record<string, AgentUsageUpdate> = {},
): { totalTokens: number; cost: number | null } {
	let totalTokens = detail.thread.totalPromptTokens + detail.thread.totalCompletionTokens;
	let cost = detail.thread.totalCost;
	let priceKnown = Number.isFinite(cost) && cost >= 0;
	const executions = new Map(detail.executions.map((execution) => [execution.id, execution]));
	for (const execution of detail.executions) {
		if (
			(execution.totalTokens ?? 0) > 0 &&
			(execution.cost === null || !Number.isFinite(execution.cost) || execution.cost <= 0)
		) {
			priceKnown = false;
		}
	}
	for (const update of Object.values(updates)) {
		if (update.sessionId !== detail.thread.id || !update.usage) continue;
		const execution = executions.get(update.executionId);
		if (execution && execution.status !== 'running') continue;
		totalTokens += update.usage.totalTokens;
		if (update.usage.totalTokens <= 0) continue;
		const liveCost = update.usage.cost;
		if (liveCost === undefined || !Number.isFinite(liveCost) || liveCost <= 0) priceKnown = false;
		else cost += liveCost;
	}
	return { totalTokens, cost: priceKnown ? cost : null };
}

/** Add elapsed execution time until the saved session total includes it. */
export function getAgentSessionDuration(
	detail: ThreadDetail,
	updates: Record<string, AgentUsageUpdate>,
	now: number,
): { duration: number; running: boolean } {
	let duration = detail.thread.totalDuration ?? 0;
	let running = false;
	const pending = new Map<string, { startedAt?: number; stoppedAt?: number; complete: boolean }>();
	for (const execution of detail.executions) {
		if (execution.status !== 'running') continue;
		const startedAt = execution.startedAt ? Date.parse(execution.startedAt) : undefined;
		pending.set(execution.id, { startedAt, complete: false });
	}
	const executions = new Map(detail.executions.map((execution) => [execution.id, execution]));
	for (const update of Object.values(updates)) {
		if (update.sessionId !== detail.thread.id) continue;
		const execution = executions.get(update.executionId);
		if (execution && execution.status !== 'running') continue;
		pending.set(update.executionId, {
			...update,
			startedAt: pending.get(update.executionId)?.startedAt ?? update.startedAt,
		});
	}
	for (const execution of pending.values()) {
		const start = execution.startedAt;
		if (start === undefined || !Number.isFinite(start)) continue;
		if (!execution.complete) running = true;
		const end = execution.complete ? (execution.stoppedAt ?? start) : now;
		duration += Math.max(0, end - start);
	}
	return { duration, running };
}
