import type { ITelemetryTrackProperties } from 'n8n-workflow';

export interface IAgentExecutionTrackProperties extends ITelemetryTrackProperties {
	agent_id: string;
	/**
	 * n8n user ID, present only when the agent run has direct n8n user context —
	 * so in-app chat and manual task runs, but never chat integrations or cron.
	 */
	user_id?: string;
	run_type: AgentRunTelemetryType;
	source?: string;
	/**
	 * Fresh user turns only. Resume continuations and delegated child runs do not
	 * increment this count.
	 */
	message_count?: number;
	/** AI SDK usage from agent, title, memory generation, and embedding calls. */
	token_count?: number;
	/** Tool invocations only. Resuming a suspended tool does not double-count it. */
	tool_call_count?: number;
}

export type AgentRunTelemetryType = 'test' | 'production';

export type AgentTurnTelemetryStatus = 'succeeded' | 'failed';

export type AgentTelemetryMemoryType =
	| 'none'
	| 'n8n'
	| 'n8n_observational'
	| 'n8n_episodic'
	| 'n8n_observational_episodic';

export interface IAgentConfigurationTelemetryProperties {
	model: string | null;
	channels: string[];
	tool_types: string[];
	tool_count: number;
	num_skills: number;
	memory_type: AgentTelemetryMemoryType;
}

export interface IAgentTurnFinishedTrackProperties extends ITelemetryTrackProperties {
	agent_id: string;
	user_id?: string;
	/** Internal aggregation key only. This must never be emitted to telemetry. */
	thread_id: string;
	run_type: AgentRunTelemetryType;
	source?: string;
	/** Absent for saved agents; 'inline' for node-embedded agent definitions. */
	agent_type?: 'inline';
	turn_status: AgentTurnTelemetryStatus;
	configuration: IAgentConfigurationTelemetryProperties;
	latency_ms: number;
	cost: number;
	/**
	 * Tokens for this turn only, from the same recorded usage as `cost` — so the
	 * two reconcile. Narrower than the token count on `Agent execution count`,
	 * which also covers LLM calls belonging to no turn.
	 */
	token_count: number;
	tool_call_count: number;
	/** Successful `load_skill` calls that activated a skill in this turn. */
	skill_load_count?: number;
	loaded_skill_ids?: string[];
}
