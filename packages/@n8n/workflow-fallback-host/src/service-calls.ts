/**
 * Service calls of a running step (spec 9.9 of workflow-lang): a step asks a
 * service of n8n, such as the deduplication store, while it runs.
 *
 * On a runtime connection of protocol version 2 (`hello.ts`), the worker
 * sends `{"type":"service","id":"<step frame id>","service","op","args"}` on
 * the connection of the step. `wfrt` hands the call to n8n and gives the
 * answer back on the same connection:
 * `{"type":"serviceResult","id","n","ok":true,"result"}` or
 * `{"type":"serviceResult","id","n","ok":false,"error":"<message>"}`.
 * The calls of one step go one after the other, as `wfrt` numbers them.
 *
 * A step that does not run on such a connection has no service channel, and
 * a call fails.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import type { Socket } from 'node:net';

import { encodeFrame, isJsonObject, type JsonValue } from './protocol';

export interface ServiceChannel {
	call(service: string, op: string, args: unknown): Promise<JsonValue>;
}

export class ServiceCallError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ServiceCallError';
	}
}

const channels = new AsyncLocalStorage<ServiceChannel>();

/** Runs `run` with the service channel of a step. */
export function withServiceChannel<T>(channel: ServiceChannel, run: () => T): T {
	return channels.run(channel, run);
}

/** The service channel of the step that runs now, if it has one. */
export function currentServiceChannel(): ServiceChannel | undefined {
	return channels.getStore();
}

/** Runs a service call of the step that runs now. */
export async function callService(service: string, op: string, args: unknown): Promise<JsonValue> {
	const channel = currentServiceChannel();
	if (!channel) {
		throw new ServiceCallError(
			`The ${service} service needs a runtime connection of protocol version 2; this step has none`,
		);
	}
	return await channel.call(service, op, args);
}

/**
 * The service calls on one runtime connection: a channel for each step, and
 * the answers that `wfrt` sends back (`onResult`).
 */
export class ConnectionServices {
	private readonly waiting = new Map<string, (frame: Record<string, JsonValue>) => void>();

	constructor(private readonly socket: Socket) {}

	/** The channel of the step with frame id `id`. Its calls go one at a time. */
	channelFor(id: string): ServiceChannel {
		let last: Promise<unknown> = Promise.resolve();
		const one = async (service: string, op: string, args: unknown) => {
			const answer = new Promise<Record<string, JsonValue>>((resolve) =>
				this.waiting.set(id, resolve),
			);
			if (this.socket.destroyed || !this.socket.writable) {
				this.waiting.delete(id);
				throw new ServiceCallError('The runtime connection closed before the service answered');
			}
			this.socket.write(encodeFrame({ type: 'service', id, service, op, args }));
			const frame = await answer;
			if (frame.ok === true) return frame.result ?? null;
			throw new ServiceCallError(
				typeof frame.error === 'string' ? frame.error : 'The service call failed',
			);
		};
		return {
			call: async (service, op, args) => {
				const run = last.then(
					async () => await one(service, op, args),
					async () => await one(service, op, args),
				);
				last = run;
				return await run;
			},
		};
	}

	/** True when the frame was an answer of a service call. */
	onFrame(body: Buffer): boolean {
		// Requests start with `{"id"`; an answer starts with `{"type"`.
		if (body.length < 8 || body.toString('latin1', 0, 8) !== '{"type":') return false;
		let parsed: unknown;
		try {
			parsed = JSON.parse(body.toString('utf8'));
		} catch {
			return false;
		}
		if (!isJsonObject(parsed) || parsed.type !== 'serviceResult' || typeof parsed.id !== 'string') {
			return false;
		}
		const resolve = this.waiting.get(parsed.id);
		this.waiting.delete(parsed.id);
		resolve?.(parsed);
		return true;
	}

	/** The connection closed: every call that waits fails. */
	close(): void {
		for (const resolve of this.waiting.values()) {
			resolve({ ok: false, error: 'The runtime connection closed before the service answered' });
		}
		this.waiting.clear();
	}
}
