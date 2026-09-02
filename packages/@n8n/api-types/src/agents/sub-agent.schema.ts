import type { RunnableAgentJsonConfig } from './agent-json-config.schema';

export const SUB_AGENT_MAX_CHILDREN_MIN = 1;
export const SUB_AGENT_MAX_CHILDREN_MAX = 20;
export const SUB_AGENT_MAX_CHILDREN_DEFAULT = 10;

/**
 * A saved n8n agent source. Unpinned sources resolve per run type — the
 * current draft for test runs, the published version for production runs.
 * `versionId` pins resolution, so a resumed run continues on the exact
 * version it started with.
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
	policy?: SubAgentRunPolicy;
	parentThreadId?: string;
	/** Parent's episodic-memory resource id, inherited so the child shares its scope. */
	parentResourceId?: string;
	/**
	 * Thread id for the child run. A background dispatcher mints it before the
	 * run starts so its durable job row can reference the child from the moment
	 * of dispatch. When absent, the runner mints one itself.
	 */
	childThreadId?: string;
	/** Parent's workspace principal hash, inherited by configured first-class children. */
	parentSandboxPrincipalHash?: string;
	/**
	 * This delegation's task path — already assigned and policy-checked by the SDK
	 * delegate tool, then validated by `@n8n/agents` (`assertSubAgentTaskPath`)
	 * before the child runs, so a plain string suffices here.
	 */
	taskPath: string;
}
