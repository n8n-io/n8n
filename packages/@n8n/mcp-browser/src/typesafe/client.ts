/**
 * TypeSafe System One client.
 *
 * Plain `fetch` rather than `@typesafe-ai/sdk`: the wire contract is one POST
 * with three fields. Move to the SDK if this graduates past the prototype — it
 * adds retries and answer-type inference this does not need yet.
 *
 * The API key is an argument, never read from the environment here, so the
 * host stays the only place that knows where configuration comes from.
 */

import { z } from 'zod';

import type { Question, SystemOneFn, SystemOneResult } from './types';

const API_URL = 'https://api.typesafe.ai/v1/systemone';
/**
 * Pinned rather than `jev-latest`, so a vendor release cannot silently change
 * behaviour under a tuned confidence threshold. The API rejects an unknown id,
 * so bumping this is a deliberate, visible step: `jev-latest` echoes the
 * version it resolved to in the response `model` field.
 */
export const DEFAULT_SYSTEM_ONE_MODEL = 'jev-1.13.0';
const REQUEST_TIMEOUT_MS = 10_000;

const answerSchema = z.discriminatedUnion('type', [
	z.object({ type: z.literal('noul'), noul: z.number() }),
	z.object({
		type: z.literal('choice'),
		choice: z.string(),
		confidence: z.number(),
		probabilities: z.record(z.string(), z.number()),
	}),
]);

const resultSchema = z.object({
	model: z.string(),
	answers: z.record(z.string(), answerSchema),
	usage: z.object({ input_tokens: z.number(), output_tokens: z.number() }),
});

const MAX_DETAIL_CHARS = 200;

/**
 * Pull the human-readable reason out of an error body. The API uses two shapes:
 * `{"detail":"Too many choices..."}` and
 * `{"detail":{"error_type":"...","message":"Unknown model: x"}}`.
 */
function extractErrorDetail(body: string): string {
	try {
		const parsed: unknown = JSON.parse(body);
		if (typeof parsed !== 'object' || parsed === null || !('detail' in parsed)) return '';
		const { detail } = parsed;
		if (typeof detail === 'string') return detail.slice(0, MAX_DETAIL_CHARS);
		if (typeof detail === 'object' && detail !== null && 'message' in detail) {
			const { message } = detail;
			if (typeof message === 'string') return message.slice(0, MAX_DETAIL_CHARS);
		}
		return '';
	} catch {
		return '';
	}
}

export interface SystemOneOptions {
	model?: string;
	timeoutMs?: number;
	/** Called with transport failures. The response body can echo request content, so it is never thrown into an agent's context. */
	onError?: (info: { status: number; statusText: string; body: string }) => void;
}

/**
 * Returns `undefined` for an empty key. An unset key is the feature switch:
 * with no client, `browser_act` reports itself unavailable instead of failing
 * partway through a run.
 */
export function createSystemOneFn(
	apiKey: string,
	options: SystemOneOptions = {},
): SystemOneFn | undefined {
	if (!apiKey) return undefined;

	const { model = DEFAULT_SYSTEM_ONE_MODEL, timeoutMs = REQUEST_TIMEOUT_MS, onError } = options;

	return async (request: {
		state: unknown;
		questions: Record<string, Question>;
	}): Promise<SystemOneResult> => {
		const response = await fetch(API_URL, {
			method: 'POST',
			headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
			body: JSON.stringify({ ...request, model }),
			signal: AbortSignal.timeout(timeoutMs),
		});

		if (!response.ok) {
			const body = await response.text().catch(() => '');
			const detail = extractErrorDetail(body);
			onError?.({ status: response.status, statusText: response.statusText, body });
			// The detail is the vendor's own description of what was wrong with the
			// request ("Too many choices", "Unknown model: x"). Without it a 400 is
			// undiagnosable, so it goes in the message; it is capped in case a
			// validation error ever quotes request content back.
			throw new Error(
				`Fast model request failed with status ${response.status}${detail ? `: ${detail}` : ''}`,
			);
		}

		return resultSchema.parse(await response.json());
	};
}
