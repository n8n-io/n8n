/** Model used by an optional observational or episodic memory worker. */
export type AgentMemoryWorkerModel = {
	model: string;
	credential: string;
};

/** Runtime-managed session memory configuration. */
export type AgentObservationalMemoryConfig = {
	enabled?: boolean;
	observerModel?: AgentMemoryWorkerModel;
	reflectorModel?: AgentMemoryWorkerModel;
	observerThresholdTokens?: number;
	reflectorThresholdTokens?: number;
	renderTokenBudget?: number;
	observationLogTailLimit?: number;
	lockTtlMs?: number;
};

/** Cross-session memory backed by OpenAI embeddings. */
export type AgentEpisodicMemoryConfig =
	| { enabled: false }
	| {
			enabled: true;
			/** OpenAI credential id, or `managed` when returned by n8n. */
			credential: string;
			extractorModel?: AgentMemoryWorkerModel;
			reflectorModel?: AgentMemoryWorkerModel;
			topK?: number;
			maxEntriesPerRun?: number;
	  };

/** Source-authoring shape for the Agent's first-class memory configuration. */
export type AgentMemoryConfig = {
	enabled: boolean;
	storage: 'n8n';
	observationalMemory?: AgentObservationalMemoryConfig;
	episodicMemory?: AgentEpisodicMemoryConfig;
};
