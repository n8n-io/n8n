import type { AiAssistantSDK, SchemaType } from '@n8n_io/ai-assistant-sdk';
import { z } from 'zod';
import { Z } from 'zod-class';

// Note: This is copied from the sdk, since this type is not exported
type Schema = {
	type: SchemaType;
	key?: string;
	value: string | Schema[];
	path: string;
};

// Create a lazy validator to handle the recursive type
const schemaValidator: z.ZodType<Schema> = z.lazy(() =>
	z.object({
		type: z.enum([
			'string',
			'number',
			'boolean',
			'bigint',
			'symbol',
			'array',
			'object',
			'function',
			'null',
			'undefined',
		]),
		key: z.string().optional(),
		value: z.union([z.string(), z.lazy(() => schemaValidator.array())]),
		path: z.string(),
	}),
);

export class AiAskRequestDto
	extends Z.class({
		question: z.string(),
		context: z.object({
			schema: z.array(
				z.object({
					nodeName: z.string(),
					schema: schemaValidator,
				}),
			),
			inputSchema: z.object({
				nodeName: z.string(),
				schema: schemaValidator,
			}),
			pushRef: z.string(),
			ndvPushRef: z.string(),
		}),
		forNode: z.string(),
	})
	implements AiAssistantSDK.AskAiRequestPayload {}
