import { z } from 'zod';

/**
 * Contract for side panel views (the `ui-extensions` module).
 *
 * A view is code that an MCP client writes. It runs in a sandboxed iframe in the
 * editor and gets the page context through `postMessage`. The schemas below are
 * the frame protocol, so the host and the view runtime validate the same shape.
 */

export const UI_EXTENSION_MESSAGE_SOURCE = 'n8n-ui-extension';
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

const uiExtensionWorkflowSchema = z.object({
	id: z.string(),
	name: z.string(),
	active: z.boolean(),
	nodes: z.array(z.object({ name: z.string(), type: z.string() })),
});

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

const envelope = {
	source: z.literal(UI_EXTENSION_MESSAGE_SOURCE),
	version: z.literal(UI_EXTENSION_PROTOCOL_VERSION),
};

/** A message from the editor to a view frame. */
export const uiExtensionHostMessageSchema = z.object({
	...envelope,
	type: z.literal('context'),
	context: uiExtensionPageContextSchema,
	/** Translated strings that the view reads with `n8n.t(key)`. */
	strings: z.record(z.string(), z.string()),
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
]);

export type UiExtensionFrameMessage = z.infer<typeof uiExtensionFrameMessageSchema>;
