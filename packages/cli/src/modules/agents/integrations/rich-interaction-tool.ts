import { Tool } from '@n8n/agents';
import { z } from 'zod';

const selectOptionSchema = z.object({
	label: z.string().describe('Display text'),
	value: z.string().describe('Value returned on selection'),
	description: z.string().optional().describe('Help text'),
});

const fieldPairSchema = z.object({
	label: z.string().describe('Field label'),
	value: z.string().describe('Field value'),
});

const componentSchema = z.object({
	type: z
		.enum(['section', 'button', 'select', 'radio_select', 'divider', 'image', 'fields'])
		.describe('Component type'),
	text: z.string().optional().describe('Text content (supports markdown)'),
	label: z.string().optional().describe('Display label'),
	value: z.string().optional().describe('Value returned on interaction'),
	style: z.enum(['primary', 'danger']).optional().describe('Button style'),
	url: z.string().optional().describe('Image URL'),
	alt: z.string().optional().describe('Image alt text'),
	id: z.string().optional().describe('Unique ID for select/radio_select'),
	placeholder: z.string().optional().describe('Placeholder text'),
	options: z.array(selectOptionSchema).optional().describe('Options for select/radio_select'),
	fields: z.array(fieldPairSchema).optional().describe('Key-value pairs for fields component'),
});

const inputSchema = z.object({
	title: z.string().optional().describe('Card title / header text'),
	message: z.string().optional().describe('Subtitle or description text'),
	components: z.array(componentSchema).describe('Card components to render'),
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

// The suspend payload uses the same shape as the input — the full card
// definition is forwarded to the chat integration so it can render it.
const suspendSchema = inputSchema;

export function createRichInteractionTool() {
	return new Tool('rich_interaction')
		.description(
			'Present rich interactive UI to the user in chat. Use this to show ' +
				'buttons for choices, dropdown selects, radio buttons, or information ' +
				"cards with formatted content. The user's response (button click or " +
				'selection) is returned to you. Only works in chat integrations ' +
				'(Slack, Discord, Teams, etc.).',
		)
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
				const text = [input.title, input.message].filter(Boolean).join('\n');
				return { type: 'button' as const, value: text || 'No interactive content' };
			}

			return await ctx.suspend(input);
		});
}
