import type { Response } from 'express';
import type { Workflow } from 'n8n-workflow';

/**
 * Releases a workflow's expression isolate exactly once, on whichever happens
 * first: the caller finishing, or the HTTP response ending.
 *
 * Webhook handlers acquire an isolate and release it in a `finally` that wraps
 * `await new Promise(...)` around `executeWebhook`. That only runs if the
 * promise settles. `.catch(reject)` makes it settle when `executeWebhook`
 * throws, but form webhooks send their response *without* invoking the
 * completion callback, so on that path the promise never settles at all, the
 * `await` never returns, and the isolate is never released.
 *
 * `isolated-vm` isolates are native resources — an unreachable `Isolate`
 * wrapper does not free the underlying V8 isolate, only `dispose()` does — so
 * every such request strands one for the lifetime of the process.
 *
 * Binding the release to the response closes that gap: `close` fires on normal
 * completion and on abort, including when the execution promise is abandoned.
 *
 * @returns a release function for the caller's own `finally`; calling it after
 * the response has already triggered the release is a no-op.
 */
export function releaseIsolateOnResponse(workflow: Workflow, response: Response) {
	let released = false;

	const release = async () => {
		if (released) return;
		released = true;
		await workflow.expression.releaseIsolate();
	};

	// A response handler must never reject: nothing awaits these, so an
	// unhandled rejection here would surface as a process-level error.
	const releaseQuietly = () => {
		void release().catch(() => {});
	};

	response.on('close', releaseQuietly);
	response.on('finish', releaseQuietly);

	// The caller awaits before reaching this point, so the client may already
	// have disconnected — in which case 'close' fired before the listener above
	// existed and would never fire again, leaking the isolate this is meant to
	// protect. Releasing immediately is safe: both flags mean the response is
	// over, and `release` is guarded so the listeners cannot double-release.
	if (response.writableEnded || response.destroyed) releaseQuietly();

	return release;
}
