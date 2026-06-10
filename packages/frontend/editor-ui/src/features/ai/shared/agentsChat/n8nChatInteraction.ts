import { z } from 'zod';

const selectOptionSchema = z
	.object({ label: z.string(), value: z.string(), description: z.string().optional() })
	.passthrough();

const fieldPairSchema = z.object({ label: z.string(), value: z.string() }).passthrough();

const cardComponentSchema = z
	.object({
		type: z.string(),
		text: z.string().optional(),
		label: z.string().optional(),
		value: z.string().optional(),
		style: z.string().optional(),
		url: z.string().optional(),
		alt: z.string().optional(),
		id: z.string().optional(),
		options: z.array(selectOptionSchema).optional(),
		fields: z.array(fieldPairSchema).optional(),
		/** Section button accessory (counted as interactive, like the backend). */
		button: z.object({ label: z.string().optional(), value: z.string().optional() }).optional(),
	})
	.passthrough();

const cardSchema = z
	.object({
		awaitResponse: z.boolean().optional(),
		title: z.string().optional(),
		message: z.string().optional(),
		components: z.array(cardComponentSchema).min(1),
	})
	.passthrough();

/**
 * Single-operation `n8n_chat_action` tool input — the `{ action, input }`
 * branch of the backend's buildActionInputSchema with respond's
 * `{ message: { text?, card? } }` input. Batch inputs never suspend, so the
 * interactive path only ever sees this shape.
 *
 * @see buildActionInputSchema in packages/cli/src/modules/agents/integrations/integration-tools.ts
 */
const actionToolInputSchema = z
	.object({
		action: z.literal('respond'),
		input: z
			.object({
				message: z
					.object({ text: z.string().optional(), card: cardSchema.optional() })
					.passthrough(),
			})
			.passthrough(),
	})
	.passthrough();

/** Resume payload shape shared with the platform card path (component-mapper / bridge). */
export const n8nChatResumeValueSchema = z
	.object({ type: z.enum(['button', 'select']), value: z.string(), id: z.string().optional() })
	.passthrough();

export type N8nChatCard = z.infer<typeof cardSchema>;
export type N8nChatCardComponent = z.infer<typeof cardComponentSchema>;
export type N8nChatResumeValue = z.infer<typeof n8nChatResumeValueSchema>;

export interface N8nChatInteractionInput {
	text?: string;
	card: N8nChatCard;
}

const INTERACTIVE_COMPONENT_TYPES = new Set(['button', 'select', 'radio_select']);

/**
 * Mirrors the backend's shouldAwaitResponse: explicit flag or interactive components.
 *
 * @see shouldAwaitResponse in packages/cli/src/modules/agents/integrations/integration-tools.ts
 */
export function isAwaitingCard(card: N8nChatCard): boolean {
	if (card.awaitResponse === true) return true;
	return card.components.some(
		(component) =>
			INTERACTIVE_COMPONENT_TYPES.has(component.type) ||
			(component.type === 'section' && component.button !== undefined),
	);
}

/** Parse a persisted/live n8n_chat_action tool input into a renderable card, or undefined. */
export function parseN8nChatActionInput(input: unknown): N8nChatInteractionInput | undefined {
	const parsed = actionToolInputSchema.safeParse(input);
	if (!parsed.success) return undefined;
	const { message } = parsed.data.input;
	if (!message.card) return undefined;
	return { text: message.text, card: message.card };
}
