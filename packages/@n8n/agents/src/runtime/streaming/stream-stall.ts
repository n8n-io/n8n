/**
 * Chunk-idle stall detection for model streams.
 *
 * The AI transport raises undici's network idle timeouts to one hour so long
 * completions and slow non-streaming calls are not cut off — which means a
 * dead connection (half-open socket, a proxy that keeps the wire warm without
 * forwarding data) can hang a streaming turn for that long. Streaming
 * responses emit deltas continuously, so extended silence *between chunks* is
 * the reliable liveness signal the network layer cannot see. These helpers
 * fail the turn fast with a typed, user-explainable error instead.
 *
 * Liveness includes raw provider events (see `StreamSink.streamModelTurn`), so
 * keepalives reset the deadline. Deliberate consequence: a middlebox that
 * forwards parseable keepalive frames while its upstream is wedged keeps the
 * turn alive until the network timeout — a false stall is judged worse.
 */

/**
 * Max silence between chunks once the turn has streamed content. Bytes were
 * flowing and stopped — beyond this the connection is dead for all practical
 * purposes, and the user is staring at a frozen response.
 */
export const DEFAULT_MODEL_STREAM_IDLE_TIMEOUT_MS = 90_000;

/**
 * Max silence before the turn's first content chunk. Deliberately longer than
 * the post-content limit: a large cache-miss prompt legitimately spends 1-3
 * minutes in prompt processing before the provider sends anything, and a trip
 * here is recovered by a silent retry rather than a user-facing error.
 */
export const DEFAULT_MODEL_STREAM_FIRST_OUTPUT_TIMEOUT_MS = 3 * 60_000;

/**
 * How many times a stalled turn is silently re-issued before the stall error
 * surfaces. Only applies while the stalled attempt has streamed no content
 * (see `StreamSink.callModel`) — retrying an attempt the user already saw
 * would duplicate segments and orphan persisted tool-call facts.
 */
export const MAX_MODEL_STREAM_STALL_RETRIES = 1;

/**
 * Upper bound for the stall deadlines. Node's setTimeout clamps delays above
 * 2^31-1 ms to 1 ms, so an unclamped "huge value to effectively disable"
 * override would instead stall every turn immediately.
 */
export const MAX_MODEL_STREAM_TIMEOUT_MS = 2 ** 31 - 1;

export class ModelStreamStallError extends Error {
	constructor(idleMs: number) {
		super(
			`The model stream stalled: no data received for ${Math.round(idleMs / 1000)} seconds. ` +
				'This is usually a transient connection issue — please try again.',
		);
		this.name = 'ModelStreamStallError';
	}
}

/** Resolve the iterator the way `for await` would: async first, sync fallback. */
function getChunkIterator<T>(
	source: AsyncIterable<T> | Iterable<T>,
): AsyncIterator<T> | Iterator<T> {
	if (Symbol.asyncIterator in source) return source[Symbol.asyncIterator]();
	return source[Symbol.iterator]();
}

/**
 * Yield chunks from `source`, throwing {@link ModelStreamStallError} when no
 * chunk arrives within `idleMs`. `onStall` fires first so the caller can abort
 * the underlying request (releasing the socket and settling the abandoned
 * read). The abandoned read's eventual rejection is swallowed — the stall
 * error is the one the caller reports.
 *
 * `getLastActivityAt` reports liveness the iterator cannot see (keepalive raw
 * chunks consumed upstream of it): the deadline re-arms while that activity
 * stays fresh instead of stalling.
 */
export async function* withChunkIdleTimeout<T>(
	source: AsyncIterable<T> | Iterable<T>,
	getIdleMs: () => number,
	onStall: () => void,
	getLastActivityAt?: () => number,
): AsyncGenerator<T> {
	const iterator = getChunkIterator(source);
	try {
		while (true) {
			const next = Promise.resolve(iterator.next());
			// If the deadline wins, the losing read settles later — without a
			// handler its rejection would surface as an unhandled rejection.
			next.catch(() => undefined);
			const result = await raceWithStallDeadline(next, getIdleMs(), onStall, getLastActivityAt);
			if (result.done) return;
			yield result.value;
		}
	} finally {
		// Fire-and-forget: a wedged source's teardown may itself never settle,
		// and awaiting it here would block the stall error on the very hang this
		// wrapper exists to break. `onStall` already aborted the underlying
		// request, which is what actually reclaims the socket.
		void Promise.resolve()
			.then(async () => await iterator.return?.())
			.catch(() => undefined);
	}
}

/**
 * Await `promise` with the same stall deadline. Used for the SDK's post-stream
 * result promises (`finishReason`, `usage`, `response`, …), which settle
 * instantly on a healthy stream but would otherwise be an unguarded await.
 *
 * When `getLastActivityAt` is given, a deadline that fires while out-of-band
 * activity is fresher than `idleMs` re-arms for the remainder instead of
 * stalling.
 */
export async function raceWithStallDeadline<T>(
	promise: PromiseLike<T>,
	idleMs: number,
	onStall?: () => void,
	getLastActivityAt?: () => number,
): Promise<T> {
	let timer: NodeJS.Timeout | undefined;
	try {
		return await Promise.race([
			promise,
			new Promise<never>((_, reject) => {
				const arm = (delayMs: number) => {
					timer = setTimeout(() => {
						if (getLastActivityAt) {
							const sinceActivity = Date.now() - getLastActivityAt();
							if (sinceActivity < idleMs) {
								arm(idleMs - sinceActivity);
								return;
							}
						}
						onStall?.();
						reject(new ModelStreamStallError(idleMs));
					}, delayMs);
					timer.unref?.();
				};
				arm(idleMs);
			}),
		]);
	} finally {
		clearTimeout(timer);
	}
}
