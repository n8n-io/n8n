import { isSerializedBuffer, toBuffer } from 'n8n-core';
import type { IExecuteFunctions } from 'n8n-workflow';

import type { RpcReply } from './task-api-client';

/** The only methods that a task can call in n8n. */
export const ALLOWED_RPC_METHODS = ['helpers.httpRequest', 'helpers.request'] as const;

type AllowedMethod = (typeof ALLOWED_RPC_METHODS)[number];

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
 * Runs the RPC calls of one task with the execute functions of that task. The
 * task stream is the scope of a call, so a call cannot reach another task.
 */
export class RpcHandler {
	rpcCount = 0;

	/**
	 * @param allowed The methods that the task may call. Python tasks have no
	 * helpers that call n8n, so they get none: a call from Python user code
	 * that writes to the control socket by hand is refused. Required, so that a
	 * caller cannot get the full list by accident.
	 */
	constructor(
		private readonly executeFunctions: IExecuteFunctions,
		private readonly allowed: readonly AllowedMethod[],
	) {}

	private isAllowedMethod(name: string): name is AllowedMethod {
		return (this.allowed as readonly string[]).includes(name);
	}

	async handleCall(call: { name: string; params: unknown[] }): Promise<RpcReply> {
		if (!this.isAllowedMethod(call.name)) {
			return { ok: false, error: { message: 'Method not allowed' } };
		}
		this.rpcCount++;
		const helpers = this.executeFunctions.helpers as unknown as Record<
			string,
			(...args: unknown[]) => Promise<unknown>
		>;
		const method = call.name.split('.')[1];
		try {
			// Inside the try: invalid params must give an error reply, not a call
			// that stays open until the task times out.
			const params = call.params.map((p) => (isSerializedBuffer(p) ? toBuffer(p) : p));
			const data = await helpers[method].call(helpers, ...params);
			return { ok: true, data };
		} catch (e) {
			return { ok: false, error: serializeRpcError(e) };
		}
	}
}
