/**
 * A node can leave a promise that rejects outside its step (for example a
 * Redis client that fails to connect after the step ended). n8n logs these and
 * goes on. Without a handler, Node.js ends the host, and every later step of
 * every execution fails with "no fallback host is connected".
 */
export function keepRunningOnUnhandledRejection(log: (message: string) => void): () => void {
	const handler = (reason: unknown) => {
		log(`Unhandled rejection: ${reason instanceof Error ? reason.message : String(reason)}`);
	};
	process.on('unhandledRejection', handler);
	return () => process.off('unhandledRejection', handler);
}
