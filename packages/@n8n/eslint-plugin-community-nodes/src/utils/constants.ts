import type { WebhookSetupMethodNames } from 'n8n-workflow';

export type WebhookLifecycleMethod = WebhookSetupMethodNames;

/**
 * n8n's canonical webhook lifecycle method names (`WebhookSetupMethodNames`) are
 * a type, so they can't be iterated at lint time. This object mirrors them as a
 * runtime value; the `satisfies Record<WebhookSetupMethodNames, true>` ties it to
 * the source of truth — adding, removing, or renaming a method upstream breaks
 * type-checking here until this list is updated.
 */
const LIFECYCLE_METHOD_SET = {
	checkExists: true,
	create: true,
	delete: true,
} as const satisfies Record<WebhookSetupMethodNames, true>;

/** The webhook trigger lifecycle methods, in the order n8n invokes them. */
export const WEBHOOK_LIFECYCLE_METHODS = Object.keys(
	LIFECYCLE_METHOD_SET,
) as readonly WebhookLifecycleMethod[];
