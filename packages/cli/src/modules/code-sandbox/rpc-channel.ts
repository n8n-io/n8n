import { isSerializedBuffer, toBuffer } from 'n8n-core';
import type { IExecuteFunctions } from 'n8n-workflow';
import type WebSocket from 'ws';

import type { RpcCallFrame, RpcReply } from './task-api-client';

/** The only methods that a task can call in n8n. */
export const ALLOWED_RPC_METHODS = ['helpers.httpRequest', 'helpers.request'] as const;

type AllowedMethod = (typeof ALLOWED_RPC_METHODS)[number];

const PING_INTERVAL_MS = 15_000;

export interface RpcTaskTarget {
	executeFunctions: IExecuteFunctions;
	rpcCount: number;
}

/**
 * Serializes an error for the RPC result. Only small, known fields go over the
 * wire: an HTTP client error can hold sockets and request objects.
 */
export function serializeRpcError(e: unknown): Record<string, unknown> {
	if (!(e instanceof Error)) return { message: String(e) };
	const out: Record<string, unknown> = { message: e.message, name: e.name };
	const source = e as unknown as Record<string, unknown>;
	for (const key of ['description', 'httpCode', 'code', 'status', 'statusCode', 'context']) {
		const value = source[key];
		if (value !== undefined && (typeof value !== 'object' || value === null || key === 'context')) {
			out[key] = value;
		}
	}
	return out;
}

/**
 * The RPC channel of one sandbox. The daemon tags each call with the task id of
 * the slot that made it, so a worker cannot call on behalf of another task.
 */
export class RpcChannel {
	private readonly tasks = new Map<string, RpcTaskTarget>();

	private ws: WebSocket | undefined;

	private pingTimer: NodeJS.Timeout | undefined;

	private closed = false;

	attach(ws: WebSocket) {
		this.ws = ws;
		this.pingTimer = setInterval(() => {
			if (ws.readyState === ws.OPEN) ws.ping();
		}, PING_INTERVAL_MS);
		this.pingTimer.unref();
	}

	get isClosed() {
		return this.closed;
	}

	register(taskId: string, target: RpcTaskTarget) {
		this.tasks.set(taskId, target);
	}

	unregister(taskId: string) {
		this.tasks.delete(taskId);
	}

	async handleCall(call: RpcCallFrame): Promise<RpcReply> {
		const target = this.tasks.get(call.taskId);
		if (!target) return { ok: false, error: { message: 'Unknown task' } };
		if (!ALLOWED_RPC_METHODS.includes(call.name as AllowedMethod)) {
			return { ok: false, error: { message: 'Method not allowed' } };
		}
		target.rpcCount++;
		const params = call.params.map((p) => (isSerializedBuffer(p) ? toBuffer(p) : p));
		const helpers = target.executeFunctions.helpers as unknown as Record<
			string,
			(...args: unknown[]) => Promise<unknown>
		>;
		const method = call.name.split('.')[1];
		try {
			const data = await helpers[method].call(helpers, ...params);
			return { ok: true, data };
		} catch (e) {
			return { ok: false, error: serializeRpcError(e) };
		}
	}

	markClosed() {
		this.closed = true;
		if (this.pingTimer) clearInterval(this.pingTimer);
	}

	close() {
		this.markClosed();
		try {
			this.ws?.close(1000, 'released');
		} catch {
			// Already closed.
		}
	}
}
