import { Service } from '@n8n/di';

import type { AgentMetricsScope } from '@/events/maps/agent-metrics.event-map';

export interface AgentActiveExecutionCount extends AgentMetricsScope {
	count: number;
}

/**
 * Lightweight bridge so the Prometheus collector can read the executions that
 * run in this process without depending on the agents module. Keyed by
 * execution id, so a repeated stop cannot drive the count below the real value.
 */
@Service()
export class AgentExecutionProbe {
	private readonly active = new Map<string, AgentMetricsScope>();

	track(executionId: string, scope: AgentMetricsScope): void {
		this.active.set(executionId, scope);
	}

	untrack(executionId: string): void {
		this.active.delete(executionId);
	}

	activeCounts(): AgentActiveExecutionCount[] {
		const counts = new Map<string, AgentActiveExecutionCount>();
		for (const scope of this.active.values()) {
			const key = `${scope.agent}\u0000${scope.kind}`;
			const entry = counts.get(key);
			if (entry) entry.count++;
			else counts.set(key, { ...scope, count: 1 });
		}
		return [...counts.values()];
	}
}
