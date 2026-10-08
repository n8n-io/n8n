import type { JSONValue } from '@n8n/agents';
import type { AgentSseEvent } from '@n8n/api-types';
import { UnexpectedError } from 'n8n-workflow';

import type { ExecutionRecorder } from '../execution-recorder';

/**
 * Emit a custom event during a turn. The client renders it through an
 * extension keyed by `name` and ignores names it does not know.
 */
export type SystemAgentHostEventEmitter = (name: string, payload?: JSONValue) => void;

const MAX_HOST_EVENT_NAME_LENGTH = 128;

interface PendingHostEvent {
	name: string;
	payload: JSONValue;
}

/**
 * Carries the custom events of one turn to the chat stream and to the
 * execution record. Events that come before the turn starts to record (for
 * example from `prepareTurn`) wait in a buffer, so that the stream and the
 * record keep the same order. Events that come after the turn closed are
 * dropped: the record is already final.
 */
export class SystemAgentHostEventChannel {
	private recorder?: ExecutionRecorder;

	private pending: PendingHostEvent[] = [];

	private closed = false;

	constructor(
		private readonly send: (event: AgentSseEvent) => void,
		private readonly onDropped?: (name: string) => void,
	) {}

	readonly emit: SystemAgentHostEventEmitter = (name, payload = null) => {
		if (typeof name !== 'string' || name.length === 0 || name.length > MAX_HOST_EVENT_NAME_LENGTH) {
			throw new UnexpectedError('A host event needs a name of 1 to 128 characters');
		}
		if (this.closed) {
			this.onDropped?.(name);
			return;
		}
		if (!this.recorder) {
			this.pending.push({ name, payload });
			return;
		}
		this.deliver(this.recorder, name, payload);
	};

	/** Start to record and send. Events from the buffer go first. */
	attach(recorder: ExecutionRecorder): void {
		if (this.closed) return;
		this.recorder = recorder;
		const pending = this.pending;
		this.pending = [];
		for (const event of pending) this.deliver(recorder, event.name, event.payload);
	}

	/** The turn settled. Drop buffered events and refuse new ones. */
	close(): void {
		this.closed = true;
		this.pending = [];
	}

	private deliver(recorder: ExecutionRecorder, name: string, payload: JSONValue): void {
		const recorded = recorder.recordHostEvent(name, payload);
		this.send({ type: 'host-event', name, payload: recorded.payload });
	}
}
