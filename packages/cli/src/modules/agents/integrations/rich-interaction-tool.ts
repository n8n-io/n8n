import { Tool } from '@n8n/agents';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Platform capabilities
// ---------------------------------------------------------------------------

interface PlatformCapabilities {
	supportedComponents: string[];
	description: string;
}

const PLATFORM_CAPABILITIES: Record<string, PlatformCapabilities> = {
	slack: {
		supportedComponents: [
			'section',
			'button',
			'select',
			'radio_select',
			'divider',
			'image',
			'fields',
		],
		description:
			'Present rich interactive UI to the user in Slack. Use buttons, ' +
			'dropdown selects, radio buttons, images, or formatted content cards. ' +
			"The user's response (button click or selection) is returned to you.",
	},
	telegram: {
		supportedComponents: ['section', 'button', 'divider', 'fields'],
		description:
			'Present rich interactive UI in Telegram. Available: buttons, text sections, ' +
			'dividers, key-value fields. For multiple choices, use one button per option. ' +
			"The user's response (button click) is returned to you.",
	},
	whatsapp: {
		supportedComponents: ['section', 'button'],
		description:
			'Present interactive UI in WhatsApp. Available: up to 3 buttons (max 20 chars each) ' +
			'and text sections (max 1024 chars). For choices, use one button per option (max 3). ' +
			"The user's response (button click) is returned to you.",
	},
	teams: {
		supportedComponents: ['section', 'button', 'divider', 'image', 'fields'],
		description:
			'Present rich interactive UI in Microsoft Teams via Adaptive Cards. ' +
			'Available: buttons, text sections, images, dividers, key-value fields. ' +
			"The user's response (button click) is returned to you.",
	},
	linear: {
		supportedComponents: ['section', 'divider', 'fields'],
		description:
			'Present formatted content in Linear. Available: text sections, dividers, ' +
			'key-value fields. Linear does NOT support interactive buttons or selections. ' +
			'Use this for displaying information only.',
	},
};

// Conservative default — works on all platforms that support buttons
const DEFAULT_CAPABILITIES: PlatformCapabilities = {
	supportedComponents: ['section', 'button', 'divider', 'fields'],
	description:
		'Present rich interactive UI to the user in chat. Available: buttons, ' +
		'text sections, dividers, key-value fields. For choices, use one button per option. ' +
		"The user's response (button click) is returned to you.",
};

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
	const caps = PLATFORM_CAPABILITIES[platform ?? ''] ?? DEFAULT_CAPABILITIES;
	const componentSchema = buildComponentSchema(caps.supportedComponents);

	const inputSchema = z.object({
		title: z.string().optional().describe('Card title / header text'),
		message: z.string().optional().describe('Subtitle or description text'),
		components: z.array(componentSchema).describe('Card components to render'),
	});

	// The suspend payload uses the same shape as the input
	const suspendSchema = inputSchema;

	return new Tool('rich_interaction')
		.description(caps.description)
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
