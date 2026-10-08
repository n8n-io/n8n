import type { JSONValue } from '@n8n/agents';
import type { AgentSseEvent } from '@n8n/api-types';
import { UnexpectedError } from 'n8n-workflow';

import type { ExecutionRecorder } from '../execution-recorder';

export interface SystemAgentHostEventOptions {
	/**
	 * Makes the event updatable. A later event of the same turn with the same
	 * name and key replaces this one in its position, in the stream and in
	 * history.
	 */
	key?: string;
}

/**
 * Emit a custom event during a turn. The client renders it through an
 * extension keyed by `name` and ignores names it does not know.
 */
export type SystemAgentHostEventEmitter = (
	name: string,
	payload?: JSONValue,
	options?: SystemAgentHostEventOptions,
) => void;

const MAX_HOST_EVENT_ID_LENGTH = 128;

function isValidId(value: unknown): value is string {
	return typeof value === 'string' && value.length > 0 && value.length <= MAX_HOST_EVENT_ID_LENGTH;
}

interface PendingHostEvent {
	name: string;
	payload: JSONValue;
	key?: string;
}

/**
 * Carries the custom events of one turn to the chat stream and to the
 * execution record. Events that come before the turn starts to record (for
 * example from `prepareTurn`) wait in a buffer, so that the stream and the
 * record keep the same order. Events that come after the turn closed are
 * dropped: the record is already final. The host closes the channel after
 * the settle hook of the provider, so that the hook can still emit.
 */
export class SystemAgentHostEventChannel {
	private recorder?: ExecutionRecorder;

	private pending: PendingHostEvent[] = [];

	private closed = false;

	constructor(
		private readonly send: (event: AgentSseEvent) => void,
		private readonly onDropped?: (name: string) => void,
	) {}

	readonly emit: SystemAgentHostEventEmitter = (name, payload = null, options = {}) => {
		if (!isValidId(name)) {
			throw new UnexpectedError('A host event needs a name of 1 to 128 characters');
		}
		const { key } = options;
		if (key !== undefined && !isValidId(key)) {
			throw new UnexpectedError('A host event key must have 1 to 128 characters');
		}
		if (this.closed) {
			this.onDropped?.(name);
			return;
		}
		const event: PendingHostEvent = { name, payload, ...(key !== undefined ? { key } : {}) };
		if (!this.recorder) {
			this.buffer(event);
			return;
		}
		this.deliver(this.recorder, event);
	};

	/** Start to record and send. Events from the buffer go first. */
	attach(recorder: ExecutionRecorder): void {
		if (this.closed) return;
		this.recorder = recorder;
		const pending = this.pending;
		this.pending = [];
		for (const event of pending) this.deliver(recorder, event);
	}

	/** The turn settled. Drop buffered events and refuse new ones. */
	close(): void {
		this.closed = true;
		this.pending = [];
	}

	/** A keyed event replaces a buffered event with the same name and key. */
	private buffer(event: PendingHostEvent): void {
		const index =
			event.key === undefined
				? -1
				: this.pending.findIndex(({ name, key }) => name === event.name && key === event.key);
		if (index === -1) this.pending.push(event);
		else this.pending[index] = event;
	}

	private deliver(recorder: ExecutionRecorder, { name, payload, key }: PendingHostEvent): void {
		const recorded = recorder.recordHostEvent(name, payload, key);
		this.send({
			type: 'host-event',
			name,
			...(key !== undefined ? { key } : {}),
			payload: recorded.payload,
		});
	}
}
