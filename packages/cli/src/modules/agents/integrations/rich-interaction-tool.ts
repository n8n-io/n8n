import { Tool } from '@n8n/agents';
import { Container } from '@n8n/di';
import { z } from 'zod';

import { ChatIntegrationRegistry } from './agent-chat-integration';

// Conservative default — works on every platform that supports buttons.
// Used when the tool is constructed without a platform hint.
const DEFAULT_SUPPORTED_COMPONENTS = ['section', 'button', 'divider', 'fields'];

/**
 * System-prompt directive paired with the tool. Tool descriptions answer
 * "what does this tool do?" but the LLM weights system instructions much
 * more strongly when deciding "should I use this tool over plain text?".
 * The runtime collects every tool's `systemInstruction` and wraps them in a
 * single `<built_in_rules>` block above the user's agent instructions.
 */
const RICH_INTERACTION_INSTRUCTION_FRAGMENT =
	'When you have an image URL, gif, or content that benefits from visual ' +
	'structure (key-value summaries, info cards, choice options), call the ' +
	'rich_interaction tool to render it as a card instead of pasting URLs or ' +
	'text directly. With no buttons or selects, the card simply displays and ' +
	'you continue immediately — no need to wait for a user response.';

/**
 * Compose the tool description from the supported components. The same
 * behavioural wording is used everywhere — only the available component
 * list is platform-specific. This keeps the LLM-facing contract identical
 * regardless of which integration injects the tool.
 */
function buildDescription(supportedComponents: string[]): string {
	const componentList = supportedComponents.join(', ');
	return [
		'Render a card to the user in chat. Use this whenever you want the user to ',
		'SEE rich content rather than read plain text — images and gifs, formatted ',
		'info cards, key-value summaries, or sets of choices.',
		'\n\n',
		`Available components: ${componentList}.`,
		'\n\n',
		'Behavior depends on which components you include:',
		'\n',
		' • Display-only (no button, select, or radio_select): the card renders in chat ',
		'and you continue immediately. Use this for posting gifs, screenshots, summary cards.',
		'\n',
		' • Interactive (any button, select, or radio_select): the card renders and the ',
		"run pauses; the user's click/selection is returned as your tool result.",
		'\n\n',
		'Prefer this tool over plain text whenever you have an image URL, a gif, or ',
		'content that benefits from visual structure.',
	].join('');
}

// ---------------------------------------------------------------------------
// Shared schemas
// ---------------------------------------------------------------------------

const selectOptionSchema = z.object({
	label: z.string().describe('Display text'),
	value: z.string().describe('Value returned on selection'),
	description: z.string().optional().describe('Help text'),
});

const fieldPairSchema = z.object({
	label: z.string().describe('Field label'),
	value: z.string().describe('Field value'),
});

const resumeSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('button'),
		value: z.string().describe('The clicked button value'),
	}),
	z.object({
		type: z.literal('select'),
		id: z.string().describe('The select component ID'),
		value: z.string().describe('The selected option value'),
	}),
]);

// ---------------------------------------------------------------------------
// Tool factory
// ---------------------------------------------------------------------------

function buildComponentSchema(supportedComponents: string[]) {
	const types = supportedComponents as [string, ...string[]];
	const hasSelects =
		supportedComponents.includes('select') || supportedComponents.includes('radio_select');
	const hasImage = supportedComponents.includes('image');

	const shape: Record<string, z.ZodTypeAny> = {
		type: z.enum(types).describe('Component type'),
		text: z.string().optional().describe('Text content (supports markdown)'),
		label: z.string().optional().describe('Display label'),
		value: z.string().optional().describe('Value returned on interaction'),
		style: z.enum(['primary', 'danger']).optional().describe('Button style'),
		fields: z.array(fieldPairSchema).optional().describe('Key-value pairs for fields component'),
	};

	if (hasSelects) {
		shape.id = z.string().optional().describe('Unique ID for select/radio_select');
		shape.placeholder = z.string().optional().describe('Placeholder text');
		shape.options = z
			.array(selectOptionSchema)
			.optional()
			.describe('Options for select/radio_select');
	}

	if (hasImage) {
		shape.url = z.string().optional().describe('Image URL');
		shape.alt = z.string().optional().describe('Image alt text');
	}

	return z.object(shape);
}

export function createRichInteractionTool(platform?: string) {
	const integration = platform ? Container.get(ChatIntegrationRegistry).get(platform) : undefined;
	const supportedComponents = integration?.supportedComponents ?? DEFAULT_SUPPORTED_COMPONENTS;
	const description = buildDescription(supportedComponents);
	const componentSchema = buildComponentSchema(supportedComponents);

	const inputSchema = z.object({
		title: z.string().optional().describe('Card title / header text'),
		message: z.string().optional().describe('Subtitle or description text'),
		components: z.array(componentSchema).describe('Card components to render'),
	});

	// The suspend payload uses the same shape as the input
	const suspendSchema = inputSchema;

	return new Tool('rich_interaction')
		.description(description)
		.systemInstruction(RICH_INTERACTION_INSTRUCTION_FRAGMENT)
		.input(inputSchema)
		.suspend(suspendSchema)
		.resume(
			// z.discriminatedUnion is not a ZodObject, but the runtime accepts any
			// ZodType for schema validation. Cast to satisfy the builder's generic
			// constraint which is limited to ZodObject for type-safety convenience.
			resumeSchema as unknown as z.ZodObject<z.ZodRawShape>,
		)
		.handler(async (input, ctx) => {
			if (ctx.resumeData) {
				return ctx.resumeData;
			}

			const hasActionable = input.components.some(
				(c: z.infer<typeof componentSchema>) =>
					c.type === 'button' || c.type === 'select' || c.type === 'radio_select',
			);

			if (!hasActionable) {
				// Display-only: signal intent to the consumer (the chat bridge)
				// via a marker on the tool result. The bridge inspects
				// tool-call/tool-result chunks and renders the card from this
				// tool's *input*, since we never actually do the chat-SDK work
				// here. `displayOnly: true` is a directive ("show this without
				// awaiting a response"), not a state assertion.
				return { displayOnly: true };
			}

			return await ctx.suspend(input);
		});
}
