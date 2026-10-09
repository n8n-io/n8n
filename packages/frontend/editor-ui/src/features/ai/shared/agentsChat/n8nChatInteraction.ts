import {
	lenientResultCardSchema,
	MAX_RESULT_CARDS_PER_MESSAGE,
	richCardComponentSchema,
	richMessageSchema,
	WORKFLOW_WAIT_SUSPEND_TYPE,
} from '@n8n/api-types';
import type {
	ResultCard,
	RichCard,
	RichCardComponent,
	RichCardComponentType,
} from '@n8n/api-types';
import { z } from 'zod';

/**
 * Single-operation integration action tool input — any `<platform>_action`
 * tool's `{ action, input: { message: { text?, card? } } }` shape, with the
 * message validated against the SAME `richMessageSchema` the backend tool
 * boundary uses (`@n8n/api-types/agents/rich-card.schema.ts`). Batch inputs
 * (`actions: [...]`) never suspend and don't match this schema; they fall
 * back to raw JSON rendering.
 */
const actionToolInputSchema = z
	.object({
		action: z.string(),
		input: z
			.object({
				message: richMessageSchema,
			})
			.passthrough(),
	})
	.passthrough();

/** Resume payload shape shared with the platform card path (component-mapper / bridge). */
export const n8nChatResumeValueSchema = z
	.object({ type: z.enum(['button', 'select']), value: z.string(), id: z.string().optional() })
	.passthrough();

export type N8nChatCard = RichCard;
export type N8nChatCardComponent = RichCardComponent;
export type N8nChatResumeValue = z.infer<typeof n8nChatResumeValueSchema>;

export interface N8nChatInteractionInput {
	text?: string;
	card: N8nChatCard;
}

const INTERACTIVE_COMPONENT_TYPES = new Set<RichCardComponent['type']>([
	'button',
	'select',
	'radio_select',
]);

/**
 * Mirrors the backend's shouldAwaitResponse: explicit flag or interactive components.
 *
 * @see shouldAwaitResponse in packages/cli/src/modules/agents/integrations/integration-tool-execution.ts
 */
export function isAwaitingCard(card: N8nChatCard): boolean {
	if (card.awaitResponse === true) return true;
	return card.components.some(
		(component) =>
			INTERACTIVE_COMPONENT_TYPES.has(component.type) ||
			(component.type === 'section' && component.button !== undefined),
	);
}

/**
 * Parse any integration action tool input (slack_action, chat_action, …)
 * into its renderable card, or undefined when it carries none. Used for the
 * live n8n chat cards and for session-log card previews of every integration.
 */
export function parseIntegrationActionCard(input: unknown): N8nChatInteractionInput | undefined {
	const parsed = actionToolInputSchema.safeParse(input);
	if (!parsed.success) return undefined;
	const { message } = parsed.data.input;
	if (!message.card) return undefined;
	return { text: message.text, card: message.card };
}

/** Parse a persisted/live chat_action tool input into a renderable card, or undefined. */
export function parseN8nChatActionInput(input: unknown): N8nChatInteractionInput | undefined {
	return parseIntegrationActionCard(input);
}

/**
 * `chat_action` → `show_card`: a result card (the Chat Hub catalog — metric,
 * records, list, keyValue, email, message) validated with the SAME lenient
 * schema the backend tool boundary uses — the persisted tool-call input is the
 * model's raw payload, so the normalisation has to run here too. Display-only:
 * it never suspends and carries no resume value.
 */
const showCardToolInputSchema = z
	.object({
		action: z.literal('show_card'),
		input: z.object({ card: lenientResultCardSchema }).passthrough(),
	})
	.passthrough();

export interface N8nChatResultCardInput {
	/** One card from `show_card`, or the cards a workflow tool declared in its output (≤ 3). */
	cards: ResultCard[];
}

/** Parse a persisted/live `show_card` tool input into a renderable result card, or undefined. */
export function parseN8nChatResultCardInput(input: unknown): N8nChatResultCardInput | undefined {
	const parsed = showCardToolInputSchema.safeParse(input);
	if (!parsed.success) return undefined;
	return { cards: [parsed.data.input.card] };
}

/**
 * A workflow tool result carrying `cards` the workflow itself declared — lifted
 * by the backend out of the last node's output (see `formatResult` in
 * `workflow-tool-factory.ts`). Any tool can carry them, so this is matched on
 * the output shape rather than the tool name.
 */
const declaredCardsToolOutputSchema = z
	.object({ cards: z.array(lenientResultCardSchema).min(1).max(MAX_RESULT_CARDS_PER_MESSAGE) })
	.passthrough();

/** Parse a settled tool output into the cards it declared, or undefined when it declared none. */
export function parseN8nChatDeclaredCardsOutput(
	output: unknown,
): N8nChatResultCardInput | undefined {
	let value = output;
	if (typeof value === 'string' && value.trimStart().startsWith('{')) {
		try {
			value = JSON.parse(value);
		} catch {
			return undefined;
		}
	}
	const parsed = declaredCardsToolOutputSchema.safeParse(value);
	if (!parsed.success) return undefined;
	return { cards: parsed.data.cards };
}

/**
 * Suspend payload of a workflow tool parked on a Wait node — the same card the
 * chat platforms render, so it goes through the same card renderer here.
 *
 * @see buildWaitCard in packages/cli/src/modules/agents/tools/workflow-tool-factory.ts
 */
const waitSuspendPayloadSchema = z.object({
	type: z.literal(WORKFLOW_WAIT_SUSPEND_TYPE),
	title: z.string(),
	components: z.array(richCardComponentSchema).min(1),
});

/** Parse a Wait-node suspend payload into a renderable card, or undefined. */
export function parseWaitSuspendPayload(payload: unknown): N8nChatInteractionInput | undefined {
	const parsed = waitSuspendPayloadSchema.safeParse(payload);
	if (!parsed.success) return undefined;
	return { card: { title: parsed.data.title, components: parsed.data.components } };
}

/**
 * Human-readable label for a card's resume value: the clicked button's label
 * or the chosen option's label, falling back to the raw value. Used for the
 * tool-step summary once an answered card clears from the chat.
 */
export function cardChoiceLabel(card: N8nChatCard, resume: N8nChatResumeValue): string {
	if (resume.type === 'button') {
		for (const component of card.components) {
			const candidates =
				component.type === 'button'
					? [component]
					: component.type === 'section' && component.button
						? [component.button]
						: [];
			for (const button of candidates) {
				if (button.value === resume.value) {
					// Same precedence the renderer uses for the visible button text.
					return button.label ?? button.text ?? resume.value;
				}
			}
		}
		return resume.value;
	}
	for (const component of card.components) {
		if (component.type !== 'select' && component.type !== 'radio_select') continue;
		if (resume.id !== undefined && component.id !== undefined && component.id !== resume.id) {
			continue;
		}
		const option = component.options.find((candidate) => candidate.value === resume.value);
		if (option) return option.label;
	}
	return resume.value;
}

/**
 * Component types the n8n chat card renderer (`N8nChatActionCard.vue`)
 * implements. Compile-time lockstep with the shared list: when
 * `RICH_CARD_COMPONENT_TYPES` in `@n8n/api-types` gains a member (i.e. a new
 * component type is added for Slack & co), the assignment below fails to
 * compile until the renderer handles the new type and this list is extended.
 */
const RENDERED_CARD_COMPONENT_TYPES = [
	'section',
	'fields',
	'image',
	'divider',
	'button',
	'select',
	'radio_select',
] as const;

type MutuallyAssignable<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
export const renderedCardComponentTypesInSync: MutuallyAssignable<
	(typeof RENDERED_CARD_COMPONENT_TYPES)[number],
	RichCardComponentType
> = true;
