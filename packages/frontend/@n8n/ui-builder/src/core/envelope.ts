import { isPlainObject } from 'lodash';

import type { UiActionError, UiToast } from './types';

/** What an action's response amounted to, once the shapes are sorted out. */
export interface UiActionResult {
	/** The body's own verdict. Only an explicit `ok: false` is a refusal. */
	ok: boolean;
	/** The reply as it arrived. Where any of it goes is the step's business, not the body's. */
	body: unknown;
	toast?: UiToast;
	error?: UiActionError;
}

const TOAST_TYPES = ['success', 'error', 'info'];

function readToast(value: unknown): UiToast | undefined {
	if (!isPlainObject(value)) return undefined;

	const { type, message } = value as Record<string, unknown>;
	if (typeof message !== 'string' || !message) return undefined;

	return {
		type:
			typeof type === 'string' && TOAST_TYPES.includes(type) ? (type as UiToast['type']) : 'info',
		message,
	};
}

/**
 * What the body says went wrong. Three shapes, because the two that are not
 * ours are the ones an app meets most: `{ error: { code, message } }` is the
 * envelope, `{ error: 'Bad Request' }` is what n8n answers a failed request
 * schema with, and `{ message }` is what several nodes report a failure as.
 */
function readError(body: Record<string, unknown> | undefined): UiActionError | undefined {
	if (!body) return undefined;

	const { error, message } = body;

	if (isPlainObject(error)) {
		const detail = error as Record<string, unknown>;
		return {
			code: typeof detail.code === 'string' ? detail.code : undefined,
			message:
				typeof detail.message === 'string' && detail.message ? detail.message : 'Action failed',
		};
	}

	if (typeof error === 'string' && error) return { message: error };
	if (typeof message === 'string' && message) return { message };

	return undefined;
}

/**
 * Reads an action's response body for what it says about the outcome — and
 * nothing else. The body is handed back untouched: an array of rows is an array
 * of rows, and the step's `response` binding decides what happens to it.
 *
 * A workflow that wants to refuse an action says so with `ok: false`, optionally
 * with an `error` or a `toast`. Everything else is data, so the ordinary case
 * needs no envelope at all.
 */
export function readResponse(payload: unknown): UiActionResult {
	const body = isPlainObject(payload) ? (payload as Record<string, unknown>) : undefined;
	const ok = body?.ok !== false;

	return {
		ok,
		body: payload,
		toast: readToast(body?.toast),
		// A refusal always carries something to say, so a workflow cannot fail silently.
		error: readError(body) ?? (ok ? undefined : { message: 'Action failed' }),
	};
}
