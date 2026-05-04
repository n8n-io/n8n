// ---------------------------------------------------------------------------
// One-time browser-connection bootstrap.
//
// `browser_connect` requires the user to click "Connect" in the n8n AI
// Browser Bridge extension's connect.html page (the daemon auto-opens it
// in Chrome). This helper sends a single targeted prompt to the agent
// before the eval scenarios run, so the user clicks once at the start
// instead of mid-run.
//
// Once the daemon's BrowserConnection is established, it persists across
// chat threads and MCP calls — subsequent `browser_connect` invocations
// from scenario runs will throw `AlreadyConnectedError` and the agent
// will proceed against the existing session.
// ---------------------------------------------------------------------------

import { runChat } from './chat';
import type { N8nClient } from '../clients/n8n-client';
import type { EvalLogger } from '../harness/logger';

const BOOTSTRAP_PROMPT =
	'Use the browser_connect tool to connect to my Chrome browser. ' +
	'A Chrome window will open with a page asking me to confirm — I will click Connect. ' +
	'Just call browser_connect, do not do anything else.';

export interface BootstrapOptions {
	client: N8nClient;
	logger: EvalLogger;
	timeoutMs?: number;
	/** When true, skip deleting the bootstrap chat thread (default: false). */
	keepData?: boolean;
}

export async function bootstrapBrowserConnection(opts: BootstrapOptions): Promise<void> {
	const { client, logger } = opts;

	logger.info('');
	logger.info('═══ Browser bootstrap ═══════════════════════════════════════════════');
	logger.info('Triggering browser_connect. A Chrome window will open shortly.');
	logger.info('Click "Connect" in the extension page when it appears.');
	logger.info('');

	const trace = await runChat({
		client,
		prompt: BOOTSTRAP_PROMPT,
		timeoutMs: opts.timeoutMs ?? 180_000,
		logger,
	});

	const connectCalls = trace.toolCalls.filter((tc) => tc.toolName === 'browser_connect');
	const succeeded = connectCalls.some((tc) => tc.error === undefined);

	if (succeeded) {
		logger.info('Browser bootstrap complete — daemon now has a live browser session.');
	} else if (connectCalls.length > 0) {
		const sampleError = connectCalls[0].error ?? 'unknown error';
		logger.warn(
			`browser_connect was called ${String(connectCalls.length)} time(s) but errored: ${sampleError}`,
		);
		logger.warn(
			'Continuing anyway — scenarios may still work if the daemon already had a session.',
		);
	} else {
		logger.warn('Agent did not call browser_connect during bootstrap. Continuing.');
	}

	if (!opts.keepData) {
		try {
			await client.deleteThread(trace.threadId);
			logger.verbose(`[bootstrap] deleted chat thread ${trace.threadId}`);
		} catch {
			// best-effort
		}
	}

	logger.info('═══════════════════════════════════════════════════════════════════');
	logger.info('');
}
