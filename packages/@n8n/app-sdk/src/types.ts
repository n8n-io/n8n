// Wire types of the app API. They mirror `@n8n/api-types` structurally,
// so the SDK ships without dependencies.

/**
 * The generated `src/n8n-bindings.d.ts` of an app augments this interface with
 * `workflows`, `tables`, and `agents`, so keys, inputs, and rows are type-checked.
 * It stays empty here: interface merging rejects a property that is declared
 * twice with different types.
 */
// oxlint-disable-next-line typescript/no-empty-object-type
export interface Bindings {}

type AnyWorkflows = Record<string, { input: unknown; output: unknown }>;
export type Workflows = Bindings extends { workflows: infer W extends AnyWorkflows }
	? W
	: AnyWorkflows;
export type WorkflowKey = Extract<keyof Workflows, string>;

type AnyTables = Record<string, { row: Record<string, unknown> }>;
export type Tables = Bindings extends { tables: infer T extends AnyTables } ? T : AnyTables;
export type TableKey = Extract<keyof Tables, string>;
export type Row<K extends TableKey> = Tables[K]['row'];
/** What the app sends. The server fills `id`, `createdAt`, and `updatedAt`. */
export type NewRow<K extends TableKey> = Partial<Omit<Row<K>, 'id' | 'createdAt' | 'updatedAt'>>;
export type ColumnName<K extends TableKey> = Extract<keyof Row<K>, string>;

type AnyAgents = Record<string, unknown>;
export type Agents = Bindings extends { agents: infer A extends AnyAgents } ? A : AnyAgents;
export type AgentKey = Extract<keyof Agents, string>;

export interface AppUser {
	id: string;
	email: string | null;
	firstName: string | null;
	lastName: string | null;
}

export interface MeResponse {
	/** `null` on a public app, where visitors do not sign in. */
	user: AppUser | null;
	visibility: 'public' | 'project' | 'instance';
}

export type RuntimeBinding =
	| { key: string; kind: 'workflow' }
	| { key: string; kind: 'dataTable'; permissions: Array<'read' | 'insert' | 'update' | 'delete'> }
	| { key: string; kind: 'agent'; permissions: Array<'chat' | 'history'> };

export type RunStatus = 'success' | 'error' | 'waiting' | 'canceled' | 'running' | 'unknown';

export interface RunResult<T> {
	executionId: string;
	status: RunStatus;
	/** The items of the node that ran last. Set when `status` is `success`. */
	output?: T;
	error?: string;
}

/** The same shape as the n8n data table filter. `type` defaults to `and`, `condition` to `eq`. */
export interface TableFilter<K extends TableKey = TableKey> {
	type?: 'and' | 'or';
	filters: Array<{
		columnName: ColumnName<K>;
		condition?:
			| 'eq'
			| 'neq'
			| 'like'
			| 'ilike'
			| 'gt'
			| 'gte'
			| 'lt'
			| 'lte'
			| 'isEmpty'
			| 'isNotEmpty';
		value: string | number | boolean | null;
	}>;
}

export interface TableListOptions<K extends TableKey> {
	filter?: TableFilter<K>;
	/** Case-insensitive match over all columns as text. */
	search?: string;
	sortBy?: `${ColumnName<K>}:${'asc' | 'desc'}`;
	/** At most 250. */
	take?: number;
	skip?: number;
	signal?: AbortSignal;
}

export interface ToolSuspendedPayload {
	toolCallId: string;
	/** Send it back with `resume`. */
	runId: string;
	toolName: string;
	input: unknown;
}

/** Token use of the model calls of one turn. `cost` is an estimate in USD. */
export interface AgentTokenUsage {
	promptTokens: number;
	completionTokens: number;
	totalTokens: number;
	cost?: number;
}

/** One content part of a stored message, for example `{ type: 'text', text }`. */
export interface AgentMessageContentPart {
	type: string;
	text?: string;
	toolName?: string;
	toolCallId?: string;
	input?: unknown;
	output?: unknown;
	[key: string]: unknown;
}

/**
 * One `data:` line of the chat stream. A turn ends with `done` or `tool-call-suspended`.
 * It mirrors the n8n agent chat stream, so new event types can appear. Ignore the ones you do not know.
 */
export type AgentSseEvent =
	| {
			type: 'message-steered';
			queueId: string;
			executionId: string;
			message: { id: string; role: string; content: AgentMessageContentPart[] };
	  }
	| { type: 'message-queued'; queueId: string; sessionId: string }
	| {
			type: 'execution-started';
			executionId: string;
			sessionId: string;
			message?: string;
			inputMessageIds?: string[];
	  }
	| { type: 'usage'; usage: AgentTokenUsage }
	| { type: 'start-step' }
	| { type: 'finish-step' }
	| { type: 'text-start'; id: string }
	| { type: 'text-delta'; id: string; delta: string }
	| { type: 'text-end'; id: string }
	| { type: 'reasoning-start'; id: string }
	| { type: 'reasoning-delta'; id: string; delta: string }
	| { type: 'reasoning-end'; id: string }
	| { type: 'tool-input-start'; toolCallId: string; toolName: string }
	| { type: 'tool-input-delta'; toolCallId: string; delta: string }
	| { type: 'tool-call'; toolCallId: string; toolName: string; input: unknown }
	| { type: 'tool-execution-start'; toolCallId: string; toolName: string; startTime: number }
	| {
			type: 'tool-execution-end';
			toolCallId: string;
			toolName: string;
			isError: boolean;
			endTime: number;
	  }
	| {
			type: 'tool-result';
			toolCallId: string;
			toolName: string;
			output: unknown;
			isError?: boolean;
			canceled?: boolean;
	  }
	| { type: 'tool-call-suspended'; payload: ToolSuspendedPayload }
	| {
			/** Live progress of a sub-agent, for the parent `delegate_subagent` tool call. */
			type: 'subagent-chunk';
			parentToolCallId: string;
			taskPath: string;
			chunk: { type: string; [key: string]: unknown };
	  }
	| { type: 'message'; message: { role: string; content: AgentMessageContentPart[] } }
	| { type: 'host-event'; name: string; key?: string; payload: unknown }
	| { type: 'warning'; message: string; code?: string; source?: 'mcp'; server?: string }
	| {
			/** The run ended. A `guardrail` stop carries the code of the hook that ended it. */
			type: 'finish';
			finishReason: string;
			usage?: AgentTokenUsage;
			guardrail?: { code: string };
	  }
	| {
			type: 'budget-notice';
			code: 'budget.alert' | 'budget.session' | 'budget.monthly';
			agentId?: string;
	  }
	| { type: 'error'; message: string; errorCode?: string; missing?: string[] }
	| { type: 'done'; sessionId?: string; executionId?: string };

export interface AgentChatMessagesResponse {
	messages: Array<{ id: string; role: string; content: AgentMessageContentPart[] }>;
	/** Suspended tool calls that wait for `resume`, for example an approval. */
	openSuspensions: Array<{ toolCallId: string; runId: string; suspendPayload?: unknown }>;
}
