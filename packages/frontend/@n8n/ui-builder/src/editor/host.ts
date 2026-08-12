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

/** A workflow that has at least one Webhook trigger in it. */
export interface HostWorkflow {
	id: string;
	name: string;
	active: boolean;
	/** Trigger paths, without a leading slash. */
	paths: string[];
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
	 * Read inside a computed, so it must track its own reactive sources: the
	 * panel expects a trigger added a moment ago to appear without a save.
	 */
	localWebhookPaths: () => string[];

	/** The workflow being edited, if it has been saved. */
	workflowId: () => string | undefined;

	/**
	 * Adds a Webhook trigger on this path, wired to a Respond to Webhook, to the
	 * workflow being edited. Resolves false if the host declined.
	 */
	createWebhookPair: (path: string) => Promise<boolean>;

	/** Every other workflow with a trigger in it. Expected to be slow. */
	listWebhookWorkflows: () => Promise<HostWorkflow[]>;

	/** The output of the last node to run in that workflow's most recent execution. */
	lastExecutionOutput: (workflowId: string) => Promise<HostExecutionOutput | undefined>;
}
