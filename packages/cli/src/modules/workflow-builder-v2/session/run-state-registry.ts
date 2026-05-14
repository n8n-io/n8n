import type { SerializableAgentState } from '@n8n/agents';
import { Service } from '@n8n/di';

import type { RunState } from './session.types';

/**
 * In-memory registry of workflow-builder-v2 sessions.
 *
 * POC-grade — single-process, no TTL, no eviction. Production would persist
 * via a TypeORM entity or external store.
 */
@Service()
export class RunStateRegistry {
	private readonly states = new Map<string, RunState>();

	private readonly checkpoints = new Map<string, SerializableAgentState>();

	create(state: RunState): void {
		this.states.set(state.sessionId, state);
	}

	get(sessionId: string): RunState | undefined {
		return this.states.get(sessionId);
	}

	require(sessionId: string): RunState {
		const state = this.states.get(sessionId);
		if (!state) throw new Error(`Session ${sessionId} not found`);
		return state;
	}

	update(sessionId: string, patch: Partial<RunState>): void {
		const existing = this.require(sessionId);
		this.states.set(sessionId, { ...existing, ...patch });
	}

	delete(sessionId: string): void {
		this.states.delete(sessionId);
		// Best-effort cleanup of any checkpoint state keyed on this session.
		for (const key of this.checkpoints.keys()) {
			if (key.startsWith(`${sessionId}:`)) this.checkpoints.delete(key);
		}
	}

	saveCheckpoint(key: string, state: SerializableAgentState): void {
		this.checkpoints.set(key, state);
	}

	loadCheckpoint(key: string): SerializableAgentState | undefined {
		return this.checkpoints.get(key);
	}

	deleteCheckpoint(key: string): void {
		this.checkpoints.delete(key);
	}
}
