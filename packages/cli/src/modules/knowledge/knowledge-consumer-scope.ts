/**
 * Identifies the consumer a knowledge call is made for and bounds the knowledge
 * it can reach. An agent scope reaches that agent's files. Every call across the
 * module boundary carries a scope.
 *
 * `projectId` stays in the scope although the module does not check project
 * membership: the knowledge sandbox id is derived from the instance id, the
 * project id and the agent id, and it must stay byte-identical so that existing
 * sandboxes survive.
 */
export type AgentKnowledgeConsumerScope = {
	kind: 'agent';
	projectId: string;
	agentId: string;
};

/** Union of the consumer kinds. Add a kind here when a new consumer needs knowledge. */
export type KnowledgeConsumerScope = AgentKnowledgeConsumerScope;
