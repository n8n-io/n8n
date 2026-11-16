import { z } from 'zod';

/**
 * Contract for side panel views (the `ui-extensions` module).
 *
 * A view is code that an MCP client writes. It runs in a sandboxed iframe in the
 * editor and gets the page context through `postMessage`. The schemas below are
 * the frame protocol, so the host and the view runtime validate the same shape.
 */

export const UI_EXTENSION_MESSAGE_SOURCE = 'n8n-ui-extension';
/**
 * The frame global that the view script sets to the view factory,
 * `(Vue, n8n) => component`. The view runtime reads it.
 */
export const UI_EXTENSION_VIEW_FACTORY_GLOBAL = '__n8nUiExtensionView';
export const UI_EXTENSION_PROTOCOL_VERSION = 1;

/** The most views that one user can have. */
export const UI_EXTENSION_MAX_VIEWS_PER_USER = 20;
export const UI_EXTENSION_VIEW_TITLE_MAX_LENGTH = 40;
export const UI_EXTENSION_VIEW_SOURCE_MAX_LENGTH = 100_000;
export const UI_EXTENSION_ERROR_MESSAGE_MAX_LENGTH = 1_000;

export const uiExtensionViewTitleSchema = z
	.string()
	.trim()
	.min(1)
	.max(UI_EXTENSION_VIEW_TITLE_MAX_LENGTH);

export const uiExtensionViewSourceSchema = z
	.string()
	.min(1)
	.max(UI_EXTENSION_VIEW_SOURCE_MAX_LENGTH);

/** A design-system icon name, such as `chart-column`. Unknown names show no icon. */
export const uiExtensionViewIconSchema = z
	.string()
	.max(64)
	.regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use a kebab-case icon name, such as "chart-column"');

const uiExtensionNodeSchema = z.object({
	name: z.string(),
	type: z.string(),
	/** The name of the node type, such as "Slack". Missing when the type is unknown. */
	displayName: z.string().optional(),
	/** The name that n8n gives a new node of this type, such as "Edit Fields". */
	defaultName: z.string().optional(),
	isTrigger: z.boolean().optional(),
	/**
	 * Whether the node connects to an outside service, such as Slack. n8n's own
	 * logic and utility nodes, such as If or Edit Fields, are not services.
	 */
	isService: z.boolean().optional(),
	disabled: z.boolean().optional(),
});

const uiExtensionWorkflowSchema = z.object({
	id: z.string(),
	name: z.string(),
	active: z.boolean(),
	nodes: z.array(uiExtensionNodeSchema),
	/** Whether the workflow settings name an error workflow. */
	hasErrorWorkflow: z.boolean().optional(),
});

export type UiExtensionNode = z.infer<typeof uiExtensionNodeSchema>;

export const uiExtensionPageContextSchema = z.discriminatedUnion('page', [
	z.object({
		page: z.literal('workflow'),
		routeName: z.string(),
		/** `null` when the view may not see the open workflow. */
		workflow: uiExtensionWorkflowSchema.nullable(),
	}),
	z.object({
		page: z.literal('workflows'),
		routeName: z.string(),
		projectId: z.string().nullable(),
		/** `null` when the view may not see the count. */
		totalWorkflows: z.number().int().nonnegative().nullable(),
	}),
	z.object({
		page: z.literal('other'),
		routeName: z.string().nullable(),
	}),
]);

export type UiExtensionPageContext = z.infer<typeof uiExtensionPageContextSchema>;
export type UiExtensionPage = UiExtensionPageContext['page'];

export const uiExtensionViewSchema = z.object({
	id: z.string(),
	title: uiExtensionViewTitleSchema,
	icon: uiExtensionViewIconSchema.optional(),
	source: uiExtensionViewSourceSchema,
	updatedAt: z.string(),
});

export type UiExtensionView = z.infer<typeof uiExtensionViewSchema>;

/** Whether a URL is one that a view may ask the editor to open. */
export function isUiExtensionOpenableUrl(url: string): boolean {
	try {
		const { protocol } = new URL(url);
		return protocol === 'http:' || protocol === 'https:';
	} catch {
		return false;
	}
}

/** Caps on the run and service data that the editor sends to a built-in view. */
export const UI_EXTENSION_DATA_LIMITS = {
	runs: 10,
	serviceNodes: 30,
	itemsPerNode: 3,
	keysPerItem: 20,
	valueLength: 200,
	errorLength: 500,
	targetsPerNode: 10,
} as const;

const limitedText = (max: number) => z.string().max(max);

export const uiExtensionRunStatusSchema = z.enum([
	'success',
	'error',
	'crashed',
	'canceled',
	'running',
	'waiting',
	'new',
	'unknown',
]);

export const uiExtensionRunSchema = z.object({
	id: z.string(),
	workflowId: z.string(),
	workflowName: z.string(),
	status: uiExtensionRunStatusSchema,
	/** How the run started, such as `manual`, `trigger` or `webhook`. */
	mode: z.string(),
	startedAt: z.string().nullable(),
	stoppedAt: z.string().nullable(),
});

export type UiExtensionRun = z.infer<typeof uiExtensionRunSchema>;

const uiExtensionItemSchema = z
	.record(z.string(), limitedText(UI_EXTENSION_DATA_LIMITS.valueLength))
	.refine((item) => Object.keys(item).length <= UI_EXTENSION_DATA_LIMITS.keysPerItem);

export const uiExtensionServiceNodeDataSchema = z.object({
	nodeName: z.string(),
	nodeType: z.string(),
	displayName: z.string(),
	/** Display names of the selected resource and operation, such as "Message" and "Send". */
	resource: z.string().optional(),
	operation: z.string().optional(),
	/** What the node works on, such as a channel or a sheet. `url` is http(s) only. */
	targets: z
		.array(
			z.object({
				label: z.string(),
				name: z.string(),
				url: z.string().refine(isUiExtensionOpenableUrl).optional(),
			}),
		)
		.max(UI_EXTENSION_DATA_LIMITS.targetsPerNode),
	credentialName: z.string().optional(),
	/** What the node read or wrote in the latest finished run. `null` with no run. */
	lastRun: z
		.object({
			executionId: z.string(),
			status: uiExtensionRunStatusSchema,
			finishedAt: z.string().nullable(),
			itemCount: z.number().int().nonnegative(),
			items: z.array(uiExtensionItemSchema).max(UI_EXTENSION_DATA_LIMITS.itemsPerNode),
			/** How long the node ran, in milliseconds. */
			durationMs: z.number().int().nonnegative().optional(),
			/** How many fields the first item has. `items` keeps at most `keysPerItem` of them. */
			fieldCount: z.number().int().nonnegative().optional(),
			error: limitedText(UI_EXTENSION_DATA_LIMITS.errorLength).optional(),
		})
		.nullable(),
});

export type UiExtensionServiceNodeData = z.infer<typeof uiExtensionServiceNodeDataSchema>;

/** Run and service data. The editor sends it to built-in views only. */
export const uiExtensionPanelDataSchema = z.object({
	state: z.enum(['loading', 'ready', 'error']),
	runs: z
		.object({
			scope: z.enum(['workflow', 'all']),
			items: z.array(uiExtensionRunSchema).max(UI_EXTENSION_DATA_LIMITS.runs),
			/** The failure of the newest run, when it failed. */
			lastError: z
				.object({
					nodeName: z.string().optional(),
					message: limitedText(UI_EXTENSION_DATA_LIMITS.errorLength),
				})
				.optional(),
		})
		.nullable(),
	/** `null` off the workflow page. */
	services: z
		.array(uiExtensionServiceNodeDataSchema)
		.max(UI_EXTENSION_DATA_LIMITS.serviceNodes)
		.nullable(),
});

export type UiExtensionPanelData = z.infer<typeof uiExtensionPanelDataSchema>;

const envelope = {
	source: z.literal(UI_EXTENSION_MESSAGE_SOURCE),
	version: z.literal(UI_EXTENSION_PROTOCOL_VERSION),
};

/**
 * The editor's answer to the first `ready`. It carries a `MessagePort`, and all
 * later messages in both directions go over that port. The port belongs to the
 * document that sent `ready`, so a page that the view opens later gets nothing.
 */
export const uiExtensionConnectMessageSchema = z.object({
	...envelope,
	type: z.literal('connect'),
});

export type UiExtensionConnectMessage = z.infer<typeof uiExtensionConnectMessageSchema>;

/** A message from the editor to a view frame, over the port. */
export const uiExtensionHostMessageSchema = z.object({
	...envelope,
	type: z.literal('context'),
	context: uiExtensionPageContextSchema,
	/** Translated strings that the view reads with `n8n.t(key)`. */
	strings: z.record(z.string(), z.string()),
	/** The editor's locale, such as "en", for date and number formatting. */
	locale: z.string(),
	/** Run and service data. Only built-in views get it. */
	data: uiExtensionPanelDataSchema.optional(),
});

export type UiExtensionHostMessage = z.infer<typeof uiExtensionHostMessageSchema>;

/** A message from a view frame to the editor. */
export const uiExtensionFrameMessageSchema = z.discriminatedUnion('type', [
	z.object({ ...envelope, type: z.literal('ready') }),
	z.object({
		...envelope,
		type: z.literal('error'),
		message: z.string().max(UI_EXTENSION_ERROR_MESSAGE_MAX_LENGTH),
	}),
	/** Asks the editor to fetch the data again. The editor acts on it for built-in views only. */
	z.object({ ...envelope, type: z.literal('refresh') }),
	/** Asks the editor to open a run or an http(s) URL. The editor acts on it for built-in views only. */
	z.object({
		...envelope,
		type: z.literal('open'),
		target: z.discriminatedUnion('kind', [
			z.object({ kind: z.literal('execution'), workflowId: z.string(), executionId: z.string() }),
			z.object({ kind: z.literal('url'), url: z.string().refine(isUiExtensionOpenableUrl) }),
		]),
	}),
]);

export type UiExtensionFrameMessage = z.infer<typeof uiExtensionFrameMessageSchema>;
