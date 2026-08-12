import { isPlainObject } from 'lodash';

import type { UiActionError, UiToast } from './types';

/** What an action's response amounted to, once the shapes are sorted out. */
export interface UiActionResult {
	ok: boolean;
	/** The partial to deep-merge. Present on failures too: a workflow can reject
	 * an action and still correct the client's view of the world. */
	state: unknown;
	toast?: UiToast;
	error?: UiActionError;
}

const TOAST_TYPES = ['success', 'error', 'info'];

function readToast(value: unknown): UiToast | undefined {
	if (!isPlainObject(value)) return undefined;

	const { type, message } = value as Record<string, unknown>;
	if (typeof message !== 'string' || !message) return undefined;

	return {
		type: typeof type === 'string' && TOAST_TYPES.includes(type) ? (type as UiToast['type']) : 'info',
		message,
	};
}

function readError(value: unknown): UiActionError | undefined {
	if (!isPlainObject(value)) return undefined;

	const { code, message } = value as Record<string, unknown>;

	return {
		code: typeof code === 'string' ? code : undefined,
		message: typeof message === 'string' && message ? message : 'Action failed',
	};
}

/**
 * Reads an action's response body.
 *
 * Two shapes are accepted. The envelope carries the outcome alongside the data:
 *
 *     { ok: true, state: {…}, toast?: { type, message }, error?: { code, message } }
 *
 * Anything else is taken to be the state partial itself, which is what the
 * simplest possible Respond to Webhook returns. The `ok` key is the only
 * discriminator, so a workflow opts in by including it.
 */
export function readResponse(payload: unknown): UiActionResult {
	// A Respond to Webhook node often hands back the node's item array rather
	// than a bare object. Take the first item so the author does not have to
	// think about it.
	const body: unknown = Array.isArray(payload) ? payload[0] : payload;

	if (!isPlainObject(body) || !('ok' in (body as object))) {
		return { ok: true, state: body };
	}

	const envelope = body as Record<string, unknown>;
	const ok = envelope.ok !== false;
	const error = ok ? undefined : (readError(envelope.error) ?? { message: 'Action failed' });

	return {
		ok,
		state: envelope.state,
		// An explicit toast wins; a failure with none gets one from the error, so
		// a workflow never fails silently.
		toast: readToast(envelope.toast) ?? (error ? { type: 'error', message: error.message } : undefined),
		error,
	};
}
