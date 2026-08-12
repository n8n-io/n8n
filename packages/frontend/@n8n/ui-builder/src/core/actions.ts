import { isPlainObject } from 'lodash';

import { actionKey } from './loading';
import { HTTP_METHODS } from './types';
import type {
	UiAction,
	UiActionStep,
	UiHttpMethod,
	UiResponseBinding,
	UiWebhookStep,
} from './types';

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
	{ kind: 'webhook', label: 'Call the workflow', short: 'Workflow', icon: 'workflow' },
	{ kind: 'notify', label: 'Show a notification', short: 'Notify', icon: 'bell' },
	{ kind: 'navigate', label: 'Go to a page', short: 'Go to page', icon: 'arrow-right' },
	{ kind: 'set', label: 'Set app state', short: 'Set state', icon: 'equal' },
] as const;

export type UiActionKind = (typeof ACTION_KINDS)[number]['kind'];

export function createStep(kind: UiActionKind): UiActionStep {
	if (kind === 'notify') return { kind, message: '', type: 'success' };
	if (kind === 'navigate') return { kind, to: '' };
	if (kind === 'set') return { kind, path: '', value: '' };
	return { kind: 'webhook', url: '', method: 'POST' };
}

/**
 * The request body is an expression. A step saved when it was a state path —
 * `form` — means the same thing written the way everything else in a document
 * is: `={{ $state.form }}`.
 */
function readRequest(value: unknown): string | undefined {
	if (typeof value !== 'string' || !value) return undefined;

	return value.startsWith('=') ? value : `={{ $state.${value} }}`;
}

/** POST unless the step names a method this app can actually send. */
function readMethod(value: unknown): UiHttpMethod {
	const method = typeof value === 'string' ? value.toUpperCase() : '';
	return HTTP_METHODS.find((known) => known === method) ?? 'POST';
}

/** A path per state key, or one path for the whole body. Anything else is no binding. */
function readResponseBinding(value: unknown): UiResponseBinding | undefined {
	if (typeof value === 'string') return value || undefined;
	if (!isPlainObject(value)) return undefined;

	const pairs = Object.entries(value as Record<string, unknown>).filter(
		(pair): pair is [string, string] => typeof pair[1] === 'string',
	);

	return pairs.length ? Object.fromEntries(pairs) : undefined;
}

/**
 * A webhook step used to place its own reply. It now hands the chain
 * `$response` and a `set` step does the placing, so the binding reads as the
 * steps it always stood for — and an author can see and edit them.
 */
function expandResponseBinding(binding: UiResponseBinding | undefined): UiActionStep[] {
	if (!binding) return [];

	const pairs: Array<[string, string]> =
		typeof binding === 'string' ? [[binding, '']] : Object.entries(binding);

	return pairs.map(([path, from]) => ({
		kind: 'set',
		path,
		value: from ? `={{ $response.${from} }}` : '={{ $response }}',
	}));
}

function readStep(value: unknown): UiActionStep[] {
	if (!isPlainObject(value)) return [];

	const step = value as Record<string, unknown>;

	// A step written before kinds existed is a webhook, since that is all there
	// was. `url` alone identifies it, so a hand-written `{ url }` still works.
	const kind = typeof step.kind === 'string' ? step.kind : step.url ? 'webhook' : undefined;

	if (kind === 'webhook') {
		// Unlike notify/navigate, an empty url can arrive here two ways: a step
		// the editor just appended and one not yet pointed at a trigger, and a
		// legacy `{}` with no kind and no url, which never reaches this branch
		// (its kind comes out undefined above). So an explicit 'webhook' kind
		// with an empty url is a real, still-unconfigured step, not "no action".
		return [
			{
				kind,
				url: typeof step.url === 'string' ? step.url : '',
				method: readMethod(step.method),
				request: readRequest(step.request),
				key: typeof step.key === 'string' && step.key ? step.key : undefined,
			},
			...expandResponseBinding(readResponseBinding(step.response)),
		];
	}

	if (kind === 'notify') {
		return [{ kind, message: String(step.message ?? ''), type: readToastType(step.type) }];
	}

	if (kind === 'navigate') {
		return [{ kind, to: String(step.to ?? '') }];
	}

	if (kind === 'set') {
		return [{ kind, path: String(step.path ?? ''), value: step.value }];
	}

	return [];
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
		return value.flatMap(readStep);
	}

	// The single-webhook shape. Anything else, including `{}`, is no action.
	const legacy = value as UiAction | undefined;
	if (isPlainObject(value) && typeof legacy?.url === 'string' && legacy.url) {
		// Through the same reader as a step in a list, so the two paths cannot
		// disagree about the same input.
		return [{ kind: 'webhook', url: legacy.url, method: readMethod(legacy.method) }];
	}

	return [];
}

/**
 * A name for a call's reply, from what it calls: `…/webhook/orders-app/orders`
 * gives `orders`. Identifier-safe and unique within the chain, because the way
 * it is read is `$responses.orders`.
 */
export function replyKeyFor(url: string, taken: readonly string[]): string {
	const segment = url.split('?')[0].split('/').filter(Boolean).pop() ?? '';
	const cleaned = segment.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
	const base = /^[A-Za-z_]/.test(cleaned) ? cleaned : `reply${cleaned ? `_${cleaned}` : ''}`;

	if (!taken.includes(base)) return base;

	let n = 2;
	while (taken.includes(`${base}${n}`)) n++;
	return `${base}${n}`;
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
