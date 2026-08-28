import { z } from 'zod';

/**
 * Single source of truth for the rich-card contract spoken by every
 * integration action tool (`slack_action`, `telegram_action`, `chat_action`,
 * …). The CLI validates tool inputs against these schemas and the editor-ui
 * parses recorded/live tool inputs with the very same definitions, so the
 * wire format cannot drift between backend and frontend.
 *
 * To add a component type: extend `RICH_CARD_COMPONENT_TYPES` first — the
 * lockstep checks (here, and the renderer list in
 * `editor-ui/src/features/ai/shared/agentsChat/n8nChatInteraction.ts`) then
 * point at every place that must implement it.
 */
export const RICH_CARD_COMPONENT_TYPES = [
	'section',
	'fields',
	'image',
	'divider',
	'button',
	'select',
	'radio_select',
] as const;
export type RichCardComponentType = (typeof RICH_CARD_COMPONENT_TYPES)[number];

/**
 * Button styles shared across platforms. The CLI asserts these stay valid
 * Chat SDK `ButtonStyle` values (api-types cannot depend on the chat package).
 */
export const RICH_CARD_BUTTON_STYLES = ['primary', 'danger', 'default'] as const;
export type RichCardButtonStyle = (typeof RICH_CARD_BUTTON_STYLES)[number];

const richCardButtonStyleSchema = z.enum(RICH_CARD_BUTTON_STYLES);

const richCardFieldPairSchema = z
	.object({
		label: z.string(),
		value: z.string(),
	})
	.strict();

const richCardSelectOptionSchema = z
	.object({
		label: z.string(),
		value: z.string(),
		description: z.string().optional(),
	})
	.strict();

const richCardButtonSchema = z
	.object({
		label: z.string().optional(),
		text: z.string().optional(),
		value: z.string(),
		style: richCardButtonStyleSchema.optional(),
	})
	.strict();

export const richCardComponentSchema = z.union([
	z
		.object({
			type: z.literal('section'),
			text: z.string(),
			button: richCardButtonSchema.optional(),
		})
		.strict(),
	z
		.object({
			type: z.literal('fields'),
			fields: z.array(richCardFieldPairSchema).min(1).optional(),
			items: z.array(richCardFieldPairSchema).min(1).optional(),
		})
		.strict()
		.refine((component) => component.fields !== undefined || component.items !== undefined, {
			message: 'Provide fields or items.',
		}),
	z
		.object({
			type: z.literal('image'),
			url: z.string(),
			alt: z.string().optional(),
			altText: z.string().optional(),
		})
		.strict(),
	z
		.object({
			type: z.literal('divider'),
		})
		.strict(),
	z
		.object({
			type: z.literal('button'),
			label: z.string().optional(),
			text: z.string().optional(),
			value: z.string(),
			style: richCardButtonStyleSchema.optional(),
		})
		.strict(),
	z
		.object({
			type: z.literal('select'),
			id: z.string().optional(),
			label: z.string().optional(),
			placeholder: z.string().optional(),
			options: z.array(richCardSelectOptionSchema).min(1),
		})
		.strict(),
	z
		.object({
			type: z.literal('radio_select'),
			id: z.string().optional(),
			label: z.string().optional(),
			placeholder: z.string().optional(),
			options: z.array(richCardSelectOptionSchema).min(1),
		})
		.strict(),
]);

export const richCardSchema = z
	.object({
		awaitResponse: z.boolean().optional(),
		title: z.string().optional(),
		message: z.string().optional(),
		components: z.array(richCardComponentSchema).min(1),
	})
	.strict()
	.describe(
		'Generic card payload rendered by the integration. Use generic components only, not platform-native message payloads.',
	);

export const richMessageSchema = z
	.object({
		text: z.string().optional().describe('Plain-text fallback or summary for the message.'),
		card: richCardSchema.optional(),
	})
	.strict()
	.refine((message) => message.text !== undefined || message.card !== undefined, {
		message: 'Provide message.text or message.card.',
	})
	.describe('Generic message payload. Use message.text plus optional message.card only.');

export type RichCardComponent = z.infer<typeof richCardComponentSchema>;
export type RichCardButton = z.infer<typeof richCardButtonSchema>;
export type RichCardSelectOption = z.infer<typeof richCardSelectOptionSchema>;
export type RichCard = z.infer<typeof richCardSchema>;
export type RichMessage = z.infer<typeof richMessageSchema>;

type MutuallyAssignable<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
/**
 * Compile-time lockstep: the component schema union above and
 * `RICH_CARD_COMPONENT_TYPES` must declare exactly the same component types.
 * This assignment fails to compile when they drift.
 */
export const richCardComponentTypesInSync: MutuallyAssignable<
	RichCardComponent['type'],
	RichCardComponentType
> = true;
