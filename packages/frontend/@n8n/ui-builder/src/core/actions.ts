import { isPlainObject } from 'lodash';

import { actionKey } from './loading';
import type { UiAction, UiActionStep, UiWebhookStep } from './types';

/**
 * What an action prop holds, and how to read the shapes that came before it.
 *
 * An action used to be one webhook call. It is now a chain of steps, because
 * the useful things an interaction does rarely stop at the call: it saves, then
 * says so, then moves the user on. Every component's action prop takes the same
 * list, so a chain composed for a button works unchanged on a table's `onMount`
 * or a page's `onEnter`.
 */
export const ACTION_KINDS = [
	{ kind: 'webhook', label: 'Call a webhook', short: 'Webhook' },
	{ kind: 'notify', label: 'Show a notification', short: 'Notify' },
	{ kind: 'navigate', label: 'Go to a page', short: 'Go to page' },
] as const;

export type UiActionKind = (typeof ACTION_KINDS)[number]['kind'];

export function createStep(kind: UiActionKind): UiActionStep {
	if (kind === 'notify') return { kind, message: '', type: 'success' };
	if (kind === 'navigate') return { kind, to: '' };
	return { kind: 'webhook', url: '', method: 'POST' };
}

function readStep(value: unknown): UiActionStep | undefined {
	if (!isPlainObject(value)) return undefined;

	const step = value as Record<string, unknown>;

	// A step written before kinds existed is a webhook, since that is all there
	// was. `url` alone identifies it, so a hand-written `{ url }` still works.
	const kind = typeof step.kind === 'string' ? step.kind : step.url ? 'webhook' : undefined;

	if (kind === 'webhook') {
		return typeof step.url === 'string' && step.url
			? { kind, url: step.url, method: step.method === 'GET' ? 'GET' : 'POST' }
			: undefined;
	}

	if (kind === 'notify') {
		return { kind, message: String(step.message ?? ''), type: readToastType(step.type) };
	}

	if (kind === 'navigate') {
		return { kind, to: String(step.to ?? '') };
	}

	return undefined;
}

function readToastType(value: unknown): 'success' | 'error' | 'info' {
	return value === 'error' || value === 'info' ? value : 'success';
}

/**
 * Reads an action prop into the chain to run. Three shapes arrive here:
 * the list itself, the older single `{ url, method }`, and the empty `{}` that
 * an unset action prop defaults to.
 */
export function normaliseAction(value: unknown): UiActionStep[] {
	if (Array.isArray(value)) {
		return value.map(readStep).filter((step): step is UiActionStep => step !== undefined);
	}

	// The single-webhook shape. Anything else, including `{}`, is no action.
	const legacy = value as UiAction | undefined;
	if (isPlainObject(value) && typeof legacy?.url === 'string' && legacy.url) {
		// Through the same reader as a step in a list, so the two paths cannot
		// disagree about the same input: a hand-written `PUT` was surviving here
		// and being coerced there, against a type that allows neither.
		return [{ kind: 'webhook', url: legacy.url, method: legacy.method === 'GET' ? 'GET' : 'POST' }];
	}

	return [];
}

/** The webhook URLs a chain calls, in the order it calls them. */
export function webhookUrls(steps: UiActionStep[]): string[] {
	return steps
		.filter((step): step is UiWebhookStep => step.kind === 'webhook')
		.map((step) => step.url);
}

/**
 * Whether any webhook the named action props hold is in flight, given the
 * tracker's flags. It reads the props itself rather than taking chains, so
 * knowing what an action prop can hold stays in this one file.
 *
 * A node with no action props therefore cannot be in flight, which is the
 * answer a heading or a stack wants.
 */
export function isActionInFlight(
	nodeProps: Record<string, unknown>,
	actionProps: string[],
	loading: Record<string, boolean> | undefined,
): boolean {
	if (!loading) return false;

	return actionProps.some((name) =>
		webhookUrls(normaliseAction(nodeProps[name])).some((url) => loading[actionKey(url)]),
	);
}

