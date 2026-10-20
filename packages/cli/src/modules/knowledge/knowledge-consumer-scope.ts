/**
 * Who is asking for knowledge. Every call across the module boundary carries a scope.
 *
 * `projectId` stays in the scope although the module does not check project
 * membership: the knowledge sandbox id is derived from the instance id, the
 * project id and the agent id, and it must stay byte-identical so that existing
 * sandboxes survive.
 */
export interface AgentKnowledgeConsumerScope {
	kind: 'agent';
	projectId: string;
	agentId: string;
}

/** WIP Note: Follow-up phases will add further consumer kinds (for example Instance AI) as union members. */
export type KnowledgeConsumerScope = AgentKnowledgeConsumerScope;
