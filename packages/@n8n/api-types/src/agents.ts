/**
 * JSON shape of an agent's configuration, as stored on the backend and
 * consumed by the UI. The backend has a Zod schema that produces a
 * structurally-compatible type (see `agent-json-config.ts` in the CLI module);
 * keep this interface in sync when the schema changes.
 */

export interface NodeToolConfig {
	nodeType: string;
	nodeTypeVersion: number;
	nodeParameters?: Record<string, unknown>;
	credentials?: Record<string, { id: string; name: string }>;
}

export interface AgentJsonToolRef {
	type: 'custom' | 'workflow' | 'node';
	id?: string;
	workflow?: string;
	name?: string;
	description?: string;
	node?: NodeToolConfig;
	inputSchema?: Record<string, unknown>;
	requireApproval?: boolean;
}

export interface AgentJsonConfig {
	name: string;
	description?: string;
	model: string;
	credential?: string;
	instructions: string;
	memory?: {
		enabled: boolean;
		storage: 'n8n' | 'sqlite' | 'postgres';
		connection?: Record<string, unknown>;
		lastMessages?: number;
		semanticRecall?: {
			topK: number;
			scope?: 'thread' | 'resource';
			messageRange?: { before: number; after: number };
			embedder?: string;
		};
	};
	tools?: AgentJsonToolRef[];
	providerTools?: Record<string, Record<string, unknown>>;
	config?: {
		thinking?: {
			provider: 'anthropic' | 'openai';
			budgetTokens?: number;
			reasoningEffort?: string;
		};
		toolCallConcurrency?: number;
		requireToolApproval?: boolean;
		nodeTools?: {
			enabled: boolean;
		};
	};
}

/**
 * The snapshot of an agent at publish time. Returned by publish/unpublish
 * endpoints as part of the agent payload so the UI can derive publish state
 * (`not-published` / `published-no-changes` / `published-with-changes`) from
 * `agent.versionId` vs `publishedVersion.publishedFromVersionId`.
 */
export interface AgentPublishedVersionDto {
	schema: AgentJsonConfig | null;
	publishedFromVersionId: string;
	model: string | null;
	provider: string | null;
	credentialId: string | null;
	publishedById: string | null;
}
