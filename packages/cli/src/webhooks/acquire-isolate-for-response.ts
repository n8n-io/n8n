import type { Response } from 'express';
import type { Workflow } from 'n8n-workflow';

type Options = {
	/** Set false to skip the acquisition; the returned release is then a no-op. */
	acquire?: boolean;
};

/**
 * Acquires a workflow's expression isolate for a webhook request and guarantees
 * it is released exactly once, on whichever happens first: the caller
 * finishing, or the HTTP response ending.
 *
 * Webhook handlers used to acquire an isolate and release it in a `finally`
 * that wraps `await new Promise(...)` around `executeWebhook`. That only runs
 * if the promise settles. `.catch(reject)` makes it settle when
 * `executeWebhook` throws, but form webhooks send their response *without*
 * invoking the completion callback, so on that path the promise never settles
 * at all, the `await` never returns, and the isolate is never released.
 *
 * `isolated-vm` isolates are native resources — an unreachable `Isolate`
 * wrapper does not free the underlying V8 isolate, only `dispose()` does — so
 * every such request strands one for the lifetime of the process.
 *
 * Binding the release to the response closes that gap: `close` fires on normal
 * completion and on abort, including when the execution promise is abandoned.
 *
 * The subscription is installed here, before the acquisition, because `close`
 * fires once: a client that disconnects while the isolate is being acquired
 * would never be seen by a listener added afterwards.
 *
 * @returns `release` for the caller's own `finally`, a no-op once the response
 * has already triggered it, and `responseEnded` to tell the caller the request
 * is already over. Callers must stop when it is set — the isolate has been
 * released, so executing would evaluate expressions with no bridge.
 */
export async function acquireIsolateForResponse(
	workflow: Workflow,
	response: Response,
	{ acquire = true }: Options = {},
) {
	let responseEnded = false;
	let acquisitionSettled = false;
	let released = false;

	const release = async () => {
		if (released) return;
		released = true;
		await workflow.expression.releaseIsolate();
	};

	const onResponseEnd = () => {
		responseEnded = true;
		// Releasing mid-acquisition would latch the guard against an isolate that
		// does not exist yet, so the acquisition below releases that case instead.
		if (!acquisitionSettled) return;
		// A response handler must never reject: nothing awaits these, so an
		// unhandled rejection here would surface as a process-level error.
		void release().catch(() => {});
	};

	response.on('close', onResponseEnd);
	response.on('finish', onResponseEnd);

	if (acquire) await workflow.expression.acquireIsolate();
	acquisitionSettled = true;

	// The client left while we were acquiring, so the listener above ran before
	// there was anything to release. Nothing is left to serve.
	if (responseEnded) await release();

	return { release, responseEnded };
}
