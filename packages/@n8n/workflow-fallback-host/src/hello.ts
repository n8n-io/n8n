/**
 * Version 2 of the runtime protocol: direct connections to the workers.
 *
 * The runtime starts each connection with `{"hello":{"version":2}}`. The
 * server process hands such a connection to one worker process, and the
 * worker answers `{"hello":{"version":2,"workers":N,"worker":k}}`. The
 * runtime then keeps one connection for each worker, so a step goes from
 * the runtime to the worker that runs it, with no hop through the server.
 *
 * A runtime of version 1 sends a step first. The server then answers that
 * connection itself, as before (`worker-pool.ts`, `runFrame`).
 *
 * Each worker connection works as the version 1 protocol, with one more frame
 * from the worker: `{"goaway":{}}` when the worker is recycled. The runtime then
 * sends no new steps on that connection and opens a new one, which the
 * server gives to another worker. When a worker stops, the server writes
 * `{"worker_lost":{"reason":"..."}}` on each of its connections and closes
 * them. The runtime then fails a step that was alone on the connection (it
 * caused the stop, not retryable) and sends the other steps again, each
 * alone. A connection that closes without `worker_lost` (the whole host or
 * its server process stopped) blames no step: a step alone on it fails as
 * retryable.
 */
import { isJsonObject } from './protocol';

export const HELLO_VERSION = 2;

/** True when the first frame of a connection is a hello of version 2 or later. */
export function isHello(body: Buffer): boolean {
	// A step frame is much larger than a hello; skip the parse for it.
	if (body.length > 256) return false;
	let parsed: unknown;
	try {
		parsed = JSON.parse(body.toString('utf8'));
	} catch {
		return false;
	}
	if (!isJsonObject(parsed) || !isJsonObject(parsed.hello)) return false;
	const { version } = parsed.hello;
	return typeof version === 'number' && version >= HELLO_VERSION;
}

/** The answer to a hello. `workers` 0: steps run in the server process. */
export function helloAnswer(workers: number, worker: number) {
	return { version: HELLO_VERSION, workers, worker };
}

/** The frame that tells the runtime to send no new steps on a connection. */
export const GOAWAY = { goaway: {} };

/**
 * The last frame on the connections of a worker that stopped. The server
 * process writes it, then closes the connection. The runtime puts `reason`
 * in the error of a step that was alone on the connection.
 */
export function workerLost(reason: string) {
	return { worker_lost: { reason } };
}
