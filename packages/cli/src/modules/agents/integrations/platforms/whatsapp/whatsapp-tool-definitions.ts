import { z } from 'zod';

import type {
	IntegrationActionDefinition,
	IntegrationContextQueryDefinition,
} from '../../integration-tool-types';

const listTemplatesInputSchema = z.object({
	query: z.literal('list_templates'),
	input: z
		.object({
			cursor: z
				.string()
				.min(1)
				.optional()
				.describe(
					'Opaque pagination cursor returned as `nextCursor` by a previous call. Pass to fetch the next page of templates.',
				),
		})
		.strict(),
});

const sendTemplateActionInputSchema = z.object({
	action: z.literal('send_template'),
	input: z
		.object({
			userId: z
				.string()
				.min(1)
				.describe('The customer phone number in WhatsApp "wa_id" format, digits only.'),
			templateName: z.string().min(1).describe('Template name returned by list_templates.'),
			language: z
				.string()
				.min(1)
				.describe('Template language code returned by list_templates, for example "en_US".'),
			// Models often send `[]` for a template with no placeholders.
			parameters: z
				.preprocess(
					(value) => (Array.isArray(value) && value.length === 0 ? undefined : value),
					z.record(z.string(), z.string()).optional(),
				)
				.describe(
					'One value for each placeholder that list_templates returns for the template, keyed by the placeholder name, for example { "1": "Ana" }. Omit when the template has no placeholders.',
				),
		})
		.strict(),
});

export const WHATSAPP_CONTEXT_QUERY_TOOL_DEFINITIONS = [
	{
		name: 'list_templates',
		inputSchema: listTemplatesInputSchema,
		description:
			'list_templates: For WhatsApp, returns the approved utility message templates this agent can send with send_template: name, language, body text, and placeholder names. When the response includes nextCursor, pass it back as input.cursor to fetch the next page.',
	},
] satisfies IntegrationContextQueryDefinition[];

export const WHATSAPP_ACTION_TOOL_DEFINITIONS = [
	{
		name: 'send_template',
		inputSchema: sendTemplateActionInputSchema,
		sensitive: true,
		description:
			'send_template: input.userId, input.templateName, and input.language are required. For WhatsApp, sends an approved template message, which works outside the 24-hour customer service window. input.parameters needs one value for each placeholder of the template.',
	},
] satisfies IntegrationActionDefinition[];

export const sendTemplateInputSchema = sendTemplateActionInputSchema.shape.input;

export const listTemplatesQueryInputSchema = listTemplatesInputSchema.shape.input;
