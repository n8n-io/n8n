import type { InjectionKey } from 'vue';

import type { UiHttpMethod } from '../core/types';

/**
 * What the authoring panel needs from whatever is hosting it.
 *
 * The panel is part of this package, but the things it cannot do for itself all
 * belong to the workflow editor: which triggers are on the open canvas, adding
 * nodes to it, listing other workflows, reading an execution. Rather than
 * import the editor's stores, which would tie a self-contained package to one
 * application, the panel takes this interface and the host supplies it.
 *
 * Everything here is deliberately about triggers and executions, not about
 * n8n's data structures: no node, no workflow object, no store. That keeps the
 * seam narrow enough to write a second implementation of, which is what a
 * standalone playground would need.
 */

/**
 * One thing in a workflow that answers an HTTP request: a Webhook trigger, or
 * one endpoint of an API Router. The method is part of it because a router
 * serves several under the same path, and which one a step means is exactly the
 * difference between listing orders and creating one.
 */
export interface HostEndpoint {
	/** Path under the instance's webhook URL, without a leading slash. */
	path: string;
	method: UiHttpMethod;
	/** What the node calls it, when it says. Shown instead of the bare path. */
	name?: string;
}

/** A workflow that has at least one endpoint in it. */
export interface HostWorkflow {
	id: string;
	name: string;
	active: boolean;
	endpoints: HostEndpoint[];
}

/** What an action's last run returned, and which node returned it. */
export interface HostExecutionOutput {
	node?: string;
	json?: unknown;
}

export interface UiBuilderHost {
	/** A trigger path becomes the URL an action posts to. */
	webhookUrlFor: (path: string) => string;

	/**
	 * Everything the workflow being edited answers requests on.
	 *
	 * Read inside a computed, so it must track its own reactive sources: the
	 * panel expects a trigger added a moment ago to appear without a save.
	 */
	localEndpoints: () => HostEndpoint[];

	/** The workflow being edited, if it has been saved. */
	workflowId: () => string | undefined;

	/** Whether the workflow being edited is currently active. A live webhook 404s until it is. */
	workflowActive: () => boolean;

	/**
	 * The production URL of the Webhook trigger that serves this node's page — the
	 * page a browser lands on is whatever that trigger's response chain returns, so
	 * this is "open the real thing", not the NDV's temporary test-webhook URL.
	 *
	 * Undefined whenever that trigger cannot be pinned down unambiguously: no
	 * upstream Webhook node reachable from this one, more than one candidate, or
	 * the candidate isn't configured for GET (a browser tab can only ever do GET).
	 */
	liveWebhookUrl: () => string | undefined;

	/**
	 * Adds a Webhook trigger on this path, wired to a Respond to Webhook, to the
	 * workflow being edited. Resolves false if the host declined.
	 */
	createWebhookPair: (path: string) => Promise<boolean>;

	/** Every other workflow with an endpoint in it. Expected to be slow. */
	listWebhookWorkflows: () => Promise<HostWorkflow[]>;

	/** The output of the last node to run in that workflow's most recent execution. */
	lastExecutionOutput: (workflowId: string) => Promise<HostExecutionOutput | undefined>;

	/**
	 * Where the expression editor parents its autocomplete tooltip. The host owns
	 * both the stacking context that keeps it clear of the panel's scrolling
	 * panes and the styling for what lands in it.
	 */
	tooltipContainer?: () => HTMLElement | undefined;
}

/** The resolved `tooltipContainer`, for the fields that open an editor. */
export const UiTooltipParentKey: InjectionKey<() => HTMLElement | undefined> =
	Symbol('uiTooltipParent');
