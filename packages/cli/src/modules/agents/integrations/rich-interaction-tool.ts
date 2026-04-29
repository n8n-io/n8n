import { Tool } from '@n8n/agents';
import { Container } from '@n8n/di';
import { z } from 'zod';

import { ChatIntegrationRegistry } from './agent-chat-integration';

// Conservative default — works on every platform that supports buttons.
// Used when the tool is constructed without a platform hint.
const DEFAULT_SUPPORTED_COMPONENTS = ['section', 'button', 'divider', 'fields'];
const DEFAULT_DESCRIPTION =
	'Present rich interactive UI to the user in chat. Available: buttons, ' +
	'text sections, dividers, key-value fields. For choices, use one button per option. ' +
	"The user's response (button click) is returned to you.";

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
	const description = integration?.description ?? DEFAULT_DESCRIPTION;
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
				// Display-only: surface the card to the chat without halting the
				// agent run. The handler returns a synthetic ack so the LLM can
				// continue in the same turn.
				ctx.display(input);
				return { type: 'button' as const, value: 'displayed' };
			}

			return await ctx.suspend(input);
		});
}
