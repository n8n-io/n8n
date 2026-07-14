import type { FetchFn } from '@n8n/agents';
import type { InstanceAiEvalAgentModelTurnRecord } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import { jsonParse } from 'n8n-workflow';

import { redactSecretKeys, truncateForLlm } from './request-sanitizer';

// ---------------------------------------------------------------------------
// Record-passthrough transport for the agent's model calls: the real provider
// serves the request (agent evals run the builder-chosen model live), and a
// teed copy of each turn lands in the result for debugging and — later — a
// replay tier. Recording must never alter the live call: auth headers are
// never stored, bodies are redacted and truncated, and a tee failure only
// logs.
// ---------------------------------------------------------------------------

const MAX_RECORDED_REQUEST_CHARS = 8_000;
const MAX_RECORDED_RESPONSE_CHARS = 16_000;

export interface AgentModelTurnRecorder {
	fetch: FetchFn;
	turns: InstanceAiEvalAgentModelTurnRecord[];
	/** Await all in-flight response tees. Call before assembling the result. */
	flush(): Promise<void>;
}

function resolveUrl(input: Parameters<FetchFn>[0]): string {
	if (typeof input === 'string') return input;
	if (input instanceof URL) return input.toString();
	return input.url;
}

function providerFromUrl(url: string): string | undefined {
	try {
		const host = new URL(url).hostname;
		if (host.endsWith('openai.com')) return 'openai';
		if (host.endsWith('anthropic.com')) return 'anthropic';
		if (host.endsWith('googleapis.com')) return 'google';
		if (host.endsWith('openai.azure.com')) return 'azure-openai';
		return host;
	} catch {
		return undefined;
	}
}

function recordableRequestBody(body: unknown): unknown {
	if (typeof body !== 'string') {
		return body === undefined || body === null ? undefined : '[non-string request body]';
	}
	const parsed = jsonParse<unknown>(body, { fallbackValue: undefined });
	if (parsed === undefined) return truncateForLlm(body, MAX_RECORDED_REQUEST_CHARS);
	return jsonParse<unknown>(
		truncateForLlm(JSON.stringify(redactSecretKeys(parsed)), MAX_RECORDED_REQUEST_CHARS),
		{ fallbackValue: '[truncated request body]' },
	);
}

export function createAgentModelTurnRecorder(
	baseFetch: FetchFn,
	logger: Logger,
): AgentModelTurnRecorder {
	const turns: InstanceAiEvalAgentModelTurnRecord[] = [];
	const pendingReads: Array<Promise<void>> = [];

	const recordingFetch: FetchFn = async (input, init) => {
		const url = resolveUrl(input);
		const turn: InstanceAiEvalAgentModelTurnRecord = {
			url,
			provider: providerFromUrl(url),
			streamed: false,
			requestBody: recordableRequestBody(init?.body),
		};
		turns.push(turn);
		const startedAt = Date.now();

		let response: Response;
		try {
			response = await baseFetch(input, init);
		} catch (error) {
			turn.durationMs = Date.now() - startedAt;
			turn.error = error instanceof Error ? error.message : String(error);
			throw error;
		}

		turn.durationMs = Date.now() - startedAt;
		turn.status = response.status;
		turn.streamed = (response.headers.get('content-type') ?? '').includes('text/event-stream');

		// Tee the body off a clone so the live consumer (the AI SDK) is never
		// affected — a failed tee only loses the recording.
		try {
			const teed = response.clone();
			pendingReads.push(
				teed
					.text()
					.then((text) => {
						turn.responseBody = truncateForLlm(text, MAX_RECORDED_RESPONSE_CHARS);
					})
					.catch((error: unknown) => {
						logger.debug('[EvalAgentMock] Model turn tee failed', {
							url,
							error: error instanceof Error ? error.message : String(error),
						});
					}),
			);
		} catch (error) {
			logger.debug('[EvalAgentMock] Model response clone failed', {
				url,
				error: error instanceof Error ? error.message : String(error),
			});
		}

		return response;
	};

	return {
		fetch: recordingFetch,
		turns,
		async flush() {
			await Promise.allSettled(pendingReads);
		},
	};
}
