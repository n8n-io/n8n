import type { RunnableAgentJsonConfig } from './agent-json-config.schema';

export const SUB_AGENT_MAX_CHILDREN_MIN = 1;
export const SUB_AGENT_MAX_CHILDREN_MAX = 20;
export const SUB_AGENT_MAX_CHILDREN_DEFAULT = 10;

/**
 * A sub-agent is always a saved n8n agent — optionally pinned to a published
 * version.
 */
export type SubAgentSource = {
	agentId: string;
	versionId?: string;
};

export interface ResolvedSubAgentSource {
	config: RunnableAgentJsonConfig;
	sourceId: string;
	versionId?: string;
}

export interface SubAgentRunPolicy {
	maxChildren?: number;
}

/**
 * In-process contract for spawning a child agent. Built by the SDK delegate tool
 * from the model's already-validated input and handed straight to the runner, so
 * it never crosses an untrusted boundary and needs no runtime schema.
 */
export interface SubAgentSpawnRequest {
	goal: string;
	context?: string;
	expectedOutput?: string;
	source: SubAgentSource;
	/**
	 * 'foreground' blocks the parent turn until the subagent completes — the only
	 * mode implemented today. 'background' (dispatch, return a receipt, reconcile
	 * the result later) is not yet implemented and is a consumer/product concern,
	 * not an SDK one. Tracked in AGENT-186:
	 * https://linear.app/n8n/issue/AGENT-186
	 */
	executionMode?: 'foreground' | 'background';
	policy?: SubAgentRunPolicy;
	parentThreadId?: string;
	/** Parent's episodic-memory resource id, inherited so the child shares its scope. */
	parentResourceId?: string;
	/**
	 * This delegation's task path — already assigned and policy-checked by the SDK
	 * delegate tool, then validated by `@n8n/agents` (`assertSubAgentTaskPath`)
	 * before the child runs, so a plain string suffices here.
	 */
	taskPath: string;
}
