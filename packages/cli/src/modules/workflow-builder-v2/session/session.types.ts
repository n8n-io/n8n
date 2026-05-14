import type { SerializableAgentState } from '@n8n/agents';
import type { IConnections, INode, NodeConnectionType } from 'n8n-workflow';

export type TaskStatus = 'pending' | 'active' | 'done';

export interface Task {
	id: string;
	title: string;
	status: TaskStatus;
}

export type InsertionPoint = { kind: 'fromStart' } | { kind: 'after'; afterNodeId: string };

export type ConnectionMode = 'inputs' | 'outputs';

export interface ConnectionContext {
	/** Node whose plus/connection affordance opened the builder prompt. */
	nodeId: string;
	/**
	 * Canvas handle side for `nodeId`. `outputs` means the new node is added
	 * after this node; `inputs` means the new node supplies this node input.
	 */
	mode: ConnectionMode;
	type: NodeConnectionType;
	index: number;
	/**
	 * Present when the prompt was opened from an existing edge. Commit removes
	 * the old edge and inserts the new node between source and target.
	 */
	targetNodeId?: string;
	targetType?: NodeConnectionType;
	targetIndex?: number;
}

export interface Ghost {
	nodeType: string;
	version: number;
	displayName: string;
	reason: string;
	/** Parameters shown on the ghost and committed unchanged after pick. */
	parameters?: INode['parameters'];
	position?: [number, number];
}

export interface ChatMessage {
	role: 'assistant' | 'user';
	content: string;
}

export interface WorkflowJson {
	nodes: INode[];
	connections: IConnections;
	[key: string]: unknown;
}

export interface CommitResult {
	nodeId: string;
	name: string;
	missing: {
		params: Array<{ path: string; displayName: string }>;
		credentials: Array<{ name: string; displayName: string }>;
	};
	workflowSummary: string;
}

/**
 * Captured by `propose_nodes` on `pick` (resume). Authorizes a single
 * subsequent `commit_node` call: the LLM may only commit the exact node the
 * user picked. Cleared by `commit_node` on success and by `propose_nodes` on
 * reject. When this is null, `commit_node` rejects with `no-pending-pick`.
 */
export interface PendingCommit {
	nodeType: string;
	version: number;
	displayName: string;
	/** Parameters that were shown to the user on the picked ghost. */
	parameters?: INode['parameters'];
	insertionPoint: InsertionPoint;
	connectionContext: ConnectionContext | null;
	/** Position the FE rendered the picked ghost at, if any. */
	position?: [number, number];
}

export interface RunState {
	sessionId: string;
	projectId: string;
	userPrompt: string;
	workflow: WorkflowJson;
	requestedInsertionPoint: InsertionPoint | null;
	connectionContext: ConnectionContext | null;
	/** Per-proposal connection context supplied by the agent in full-workflow mode. */
	pendingConnectionContext: ConnectionContext | null;
	taskList: Task[];
	pendingGhosts: Ghost[] | null;
	pendingInsertionPoint: InsertionPoint | null;
	narrative: ChatMessage[];
	/** Persisted suspended agent state for resume (when present). */
	agentState: SerializableAgentState | null;
	/** runId and toolCallId of the currently suspended `propose_nodes` tool call. */
	pendingResume: { runId: string; toolCallId: string } | null;
	/**
	 * On `pick`, the FE supplies the on-canvas position the ghost was rendered
	 * at. The `commit_node` tool consumes this so the committed node lands at
	 * the exact spot the user saw the ghost. Cleared by `commit_node` after use.
	 */
	pickedPosition: [number, number] | null;
	/**
	 * Set when the service commits the picked ghost immediately before resuming
	 * the suspended `propose_nodes` call. The resumed tool returns this to the
	 * model so it can continue with the next task instead of calling
	 * `commit_node` for a node that is already on the canvas.
	 */
	autoCommittedPick: CommitResult | null;
	/**
	 * Set by `propose_nodes` on a successful `pick` resume; consumed (and
	 * cleared) by `commit_node`. Guards against the LLM committing without
	 * going through `propose_nodes` first or committing a different node than
	 * the user picked.
	 */
	pendingCommit: PendingCommit | null;
	done: boolean;
}
