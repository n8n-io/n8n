import { z } from 'zod';

import { dataTableFilterSchema } from './data-table-filter.schema';

/**
 * The blocks of an App page (`Page.content`). Editor.js emits this shape
 * (`{ id, type, data }`), the AI writes it, the server renders it.
 */

export const appBlockIdSchema = z
	.string()
	.min(1)
	.max(64)
	.regex(/^[A-Za-z0-9_-]+$/);

export const appActionNameSchema = z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/);

// `http:` only for local development against a plain-HTTP instance.
const httpsUrlSchema = z
	.string()
	.max(2048)
	.url()
	.refine((url) => url.startsWith('https://') || url.startsWith('http://localhost'), {
		message: 'Only https URLs are allowed',
	});

const block = <T extends string, D extends z.ZodTypeAny>(type: T, data: D) =>
	z.object({ id: appBlockIdSchema, type: z.literal(type), data });

export const headerBlockSchema = block(
	'header',
	z.object({ text: z.string().max(500), level: z.number().int().min(1).max(6) }),
);

export const paragraphBlockSchema = block('paragraph', z.object({ text: z.string().max(5000) }));

export const listBlockSchema = block(
	'list',
	z.object({
		style: z.enum(['ordered', 'unordered']),
		items: z.array(z.string().max(1000)).max(200),
	}),
);

export const imageBlockSchema = block(
	'image',
	z.object({
		url: httpsUrlSchema,
		alt: z.string().max(200).optional(),
		caption: z.string().max(500).optional(),
	}),
);

export const dividerBlockSchema = block('divider', z.object({}));

export const tableBlockSchema = block(
	'table',
	z.object({
		source: z.object({ dataTableId: z.string().min(1) }),
		/** Column names to show; absent means all columns. */
		columns: z.array(z.string()).max(50).optional(),
		/** String values may carry `{{ params.x }}` placeholders. */
		filter: dataTableFilterSchema.optional(),
		sortBy: z.tuple([z.string(), z.enum(['ASC', 'DESC'])]).optional(),
		limit: z.number().int().min(1).max(200).default(50),
		editable: z.boolean().optional(),
		deletable: z.boolean().optional(),
	}),
);

export const formBlockSchema = block(
	'form',
	z.object({
		workflowId: z.string().min(1),
		submitLabel: z.string().max(100).optional(),
		successMessage: z.string().max(500).optional(),
	}),
);

export const buttonBlockSchema = block(
	'button',
	z.object({
		label: z.string().max(100),
		style: z.enum(['primary', 'secondary']).default('primary'),
		target: z.discriminatedUnion('kind', [
			z.object({
				kind: z.literal('workflow'),
				workflowId: z.string().min(1),
				input: z.record(z.string().max(1000)).optional(),
			}),
			z.object({
				kind: z.literal('action'),
				blockId: appBlockIdSchema,
				action: appActionNameSchema,
			}),
		]),
	}),
);

export const htmlBlockSchema = block('html', z.object({ template: z.string().max(50_000) }));

export const codeBlockSchema = block('code', z.object({ source: z.string().max(100_000) }));

/** A chat with a published agent of the App's project, rendered on the page. */
export const agentChatBlockSchema = block(
	'agent-chat',
	z.object({
		agentId: z.string().min(1).max(36),
		welcome: z.string().max(500).optional(),
		placeholder: z.string().max(100).optional(),
	}),
);

export const appBlockSchema = z.discriminatedUnion('type', [
	headerBlockSchema,
	paragraphBlockSchema,
	listBlockSchema,
	imageBlockSchema,
	dividerBlockSchema,
	tableBlockSchema,
	formBlockSchema,
	buttonBlockSchema,
	htmlBlockSchema,
	codeBlockSchema,
	agentChatBlockSchema,
]);

const hasUniqueIds = (blocks: Array<{ id: string }>) =>
	new Set(blocks.map((b) => b.id)).size === blocks.length;

export const appContentSchema = z
	.array(appBlockSchema)
	.max(200)
	.refine(hasUniqueIds, { message: 'Block ids must be unique within a page' });

/** Marks where a layout places the page content. Allowed in a layout only. */
export const slotBlockSchema = block('slot', z.object({}));

export const appLayoutBlockSchema = z.discriminatedUnion('type', [
	...appBlockSchema.options,
	slotBlockSchema,
]);

/**
 * The blocks a page renders around its content (`Page.layout`). Inherited by
 * the page's subtree; exactly one `slot` block receives the page content.
 */
export const appLayoutSchema = z
	.array(appLayoutBlockSchema)
	.max(200)
	.refine(hasUniqueIds, { message: 'Block ids must be unique within a layout' })
	.refine((blocks) => blocks.filter((b) => b.type === 'slot').length === 1, {
		message: 'A layout must contain exactly one slot block',
	});

export type AppBlock = z.infer<typeof appBlockSchema>;
export type AppBlockType = AppBlock['type'];
export type AppContent = z.infer<typeof appContentSchema>;
export type SlotBlock = z.infer<typeof slotBlockSchema>;
export type AppLayoutBlock = z.infer<typeof appLayoutBlockSchema>;
export type AppLayout = z.infer<typeof appLayoutSchema>;
export type HeaderBlock = z.infer<typeof headerBlockSchema>;
export type ParagraphBlock = z.infer<typeof paragraphBlockSchema>;
export type ListBlock = z.infer<typeof listBlockSchema>;
export type ImageBlock = z.infer<typeof imageBlockSchema>;
export type DividerBlock = z.infer<typeof dividerBlockSchema>;
export type TableBlock = z.infer<typeof tableBlockSchema>;
export type FormBlock = z.infer<typeof formBlockSchema>;
export type ButtonBlock = z.infer<typeof buttonBlockSchema>;
export type HtmlBlock = z.infer<typeof htmlBlockSchema>;
export type CodeBlock = z.infer<typeof codeBlockSchema>;
export type AgentChatBlock = z.infer<typeof agentChatBlockSchema>;
