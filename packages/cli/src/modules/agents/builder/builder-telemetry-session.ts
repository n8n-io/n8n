import { AsyncLocalStorage } from 'node:async_hooks';

/** The n8n Assistant thread and run that a builder write belongs to. */
export interface BuilderTelemetrySession {
	threadId: string;
	runId: string;
}

const storage = new AsyncLocalStorage<BuilderTelemetrySession>();

/**
 * Runs `fn` with the Assistant session attached. A builder write reaches the
 * agent telemetry through many services, so the session travels with the async
 * context instead of through each of their signatures.
 */
export async function runInBuilderTelemetrySession<T>(
	session: BuilderTelemetrySession | undefined,
	fn: () => Promise<T>,
): Promise<T> {
	return session ? await storage.run(session, fn) : await fn();
}

/** `thread_id` and `run_id` of the current builder write, or nothing outside an Assistant run. */
export function builderTelemetrySessionProperties(): { thread_id?: string; run_id?: string } {
	const session = storage.getStore();
	return session ? { thread_id: session.threadId, run_id: session.runId } : {};
}
