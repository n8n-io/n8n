/**
 * Draft store — in-memory mutable WorkflowDraft + event emission.
 *
 * Tools mutate the draft through this store; every mutation publishes an
 * `inc-draft-update` event onto the thread's event bus so the canvas can
 * paint the change live.
 */

import type {
	IncDraftEdge,
	IncDraftMutation,
	IncDraftNode,
	IncDraftState,
	IncNodeConnectionType,
	InstanceAiEvent,
	RunId,
	AgentId,
} from '@n8n/api-types';
import type { IDataObject, NodeJSON, WorkflowJSON } from '@n8n/workflow-sdk';
import { nanoid } from 'nanoid';

import type { InstanceAiEventBus } from '../event-bus';

interface ConnectionTargetWire {
	node: string;
	type: string;
	index: number;
}

const DEFAULT_TYPE_VERSION = 1;
const POSITION_STEP_X = 220;

export interface DraftStoreOptions {
	threadId: string;
	runId: string;
	agentId: string;
	userId?: string;
	eventBus: InstanceAiEventBus;
	initialName?: string;
}

export class DraftStore {
	private readonly threadId: string;

	private readonly runId: string;

	private readonly agentId: string;

	private readonly userId?: string;

	private readonly eventBus: InstanceAiEventBus;

	private state: IncDraftState;

	constructor(opts: DraftStoreOptions) {
		this.threadId = opts.threadId;
		this.runId = opts.runId;
		this.agentId = opts.agentId;
		this.userId = opts.userId;
		this.eventBus = opts.eventBus;
		this.state = {
			name: opts.initialName ?? 'New Workflow',
			nodes: [],
			edges: [],
			revision: 0,
		};
	}

	getState(): IncDraftState {
		return this.state;
	}

	getNodeSummaries(): Array<{ name: string; type: string }> {
		return this.state.nodes.map((n) => ({ name: n.name, type: n.type }));
	}

	addNode(input: {
		name: string;
		type: string;
		typeVersion?: number;
		position?: [number, number];
		parameters?: Record<string, unknown>;
	}): IncDraftNode {
		if (this.state.nodes.some((n) => n.name === input.name)) {
			throw new Error(`Node "${input.name}" already exists in draft`);
		}
		const position = input.position ?? [POSITION_STEP_X * (this.state.nodes.length + 1), 0];
		const node: IncDraftNode = {
			id: nanoid(8),
			name: input.name,
			type: input.type,
			typeVersion: input.typeVersion ?? DEFAULT_TYPE_VERSION,
			position,
			parameters: input.parameters ?? {},
		};
		this.state = {
			...this.state,
			nodes: [...this.state.nodes, node],
			revision: this.state.revision + 1,
		};
		this.emit({ kind: 'node_added', node });
		return node;
	}

	setNodeParams(name: string, parameters: Record<string, unknown>): IncDraftNode {
		const idx = this.requireNodeIndex(name);
		const existing = this.state.nodes[idx];
		const merged: IncDraftNode = {
			...existing,
			parameters: { ...existing.parameters, ...parameters },
		};
		const nextNodes = [...this.state.nodes];
		nextNodes[idx] = merged;
		this.state = { ...this.state, nodes: nextNodes, revision: this.state.revision + 1 };
		this.emit({ kind: 'node_updated', name, patch: { parameters } });
		return merged;
	}

	removeNode(name: string): void {
		this.requireNodeIndex(name);
		const remainingEdges = this.state.edges.filter((e) => e.from !== name && e.to !== name);
		this.state = {
			...this.state,
			nodes: this.state.nodes.filter((n) => n.name !== name),
			edges: remainingEdges,
			revision: this.state.revision + 1,
		};
		this.emit({ kind: 'node_removed', name });
	}

	connect(edge: {
		from: string;
		to: string;
		port: IncNodeConnectionType;
		fromIndex?: number;
		toIndex?: number;
	}): IncDraftEdge {
		this.requireNodeIndex(edge.from);
		this.requireNodeIndex(edge.to);
		const built: IncDraftEdge = {
			from: edge.from,
			to: edge.to,
			port: edge.port,
			fromIndex: edge.fromIndex ?? 0,
			toIndex: edge.toIndex ?? 0,
		};
		const duplicate = this.state.edges.some(
			(e) =>
				e.from === built.from &&
				e.to === built.to &&
				e.port === built.port &&
				e.fromIndex === built.fromIndex &&
				e.toIndex === built.toIndex,
		);
		if (duplicate) return built;
		this.state = {
			...this.state,
			edges: [...this.state.edges, built],
			revision: this.state.revision + 1,
		};
		this.emit({ kind: 'edge_added', edge: built });
		return built;
	}

	disconnect(edge: {
		from: string;
		to: string;
		port: IncNodeConnectionType;
		fromIndex?: number;
		toIndex?: number;
	}): void {
		const target: IncDraftEdge = {
			from: edge.from,
			to: edge.to,
			port: edge.port,
			fromIndex: edge.fromIndex ?? 0,
			toIndex: edge.toIndex ?? 0,
		};
		const before = this.state.edges.length;
		const nextEdges = this.state.edges.filter(
			(e) =>
				!(
					e.from === target.from &&
					e.to === target.to &&
					e.port === target.port &&
					e.fromIndex === target.fromIndex &&
					e.toIndex === target.toIndex
				),
		);
		if (nextEdges.length === before) return;
		this.state = { ...this.state, edges: nextEdges, revision: this.state.revision + 1 };
		this.emit({ kind: 'edge_removed', edge: target });
	}

	setName(name: string): void {
		this.state = { ...this.state, name, revision: this.state.revision + 1 };
	}

	markCommitted(workflowId: string): void {
		this.state = { ...this.state, workflowId, revision: this.state.revision + 1 };
		this.emit({ kind: 'committed', workflowId });
	}

	setWorkflowId(workflowId: string): void {
		this.state = { ...this.state, workflowId };
	}

	/** Serialize the draft into the WorkflowJSON shape consumed by InstanceAiWorkflowService. */
	toWorkflowJSON(): WorkflowJSON {
		const nodes: NodeJSON[] = this.state.nodes.map((n) => ({
			id: n.id,
			name: n.name,
			type: n.type,
			typeVersion: n.typeVersion,
			position: n.position,
			parameters: n.parameters as IDataObject,
			...(n.disabled !== undefined && { disabled: n.disabled }),
			...(n.notes !== undefined && { notes: n.notes }),
		}));

		// n8n connections are indexed by SOURCE node:
		//   connections[fromNode][port][fromIndex] = ConnectionTarget[]
		const connections: Record<string, Record<string, ConnectionTargetWire[][]>> = {};
		for (const edge of this.state.edges) {
			const byPort = connections[edge.from] ?? {};
			const slots = byPort[edge.port] ?? [];
			while (slots.length <= edge.fromIndex) slots.push([]);
			slots[edge.fromIndex].push({
				node: edge.to,
				type: edge.port,
				index: edge.toIndex,
			});
			byPort[edge.port] = slots;
			connections[edge.from] = byPort;
		}

		return {
			id: this.state.workflowId,
			name: this.state.name,
			nodes,
			connections: connections as WorkflowJSON['connections'],
		};
	}

	private requireNodeIndex(name: string): number {
		const idx = this.state.nodes.findIndex((n) => n.name === name);
		if (idx === -1) throw new Error(`Node "${name}" does not exist in draft`);
		return idx;
	}

	private emit(mutation: IncDraftMutation): void {
		const event: InstanceAiEvent = {
			type: 'inc-draft-update',
			runId: this.runId as RunId,
			agentId: this.agentId as AgentId,
			...(this.userId !== undefined && { userId: this.userId }),
			payload: { mutation, state: this.state },
		};
		this.eventBus.publish(this.threadId, event);
	}
}
