import { t, type Infer, type JsonSchema, type Loose } from '@n8n/node-sdk';

// Gemini adds fields over time, so the schemas check the fields the actions read only.
const open: JsonSchema = { additionalProperties: true };

export const partSchema = t
	.obj({
		text: t.str().optional(),
		thought: t.bool().optional(),
		functionCall: t
			.obj({ id: t.str().optional(), name: t.str(), args: t.json().optional() })
			.with(open)
			.optional(),
	})
	.with(open);

/** The `generateContent` response, as `chatModel` reads it. */
export const generateContentSchema = t
	.obj({
		candidates: t
			.arr(
				t
					.obj({
						content: t
							.obj({ parts: t.arr(partSchema).optional() })
							.with(open)
							.optional(),
						finishReason: t.str().optional(),
					})
					.with(open),
			)
			.optional(),
		promptFeedback: t.obj({ blockReason: t.str().optional() }).with(open).optional(),
		usageMetadata: t
			.obj({
				promptTokenCount: t.int().optional(),
				candidatesTokenCount: t.int().optional(),
			})
			.with(open)
			.optional(),
	})
	.with(open);

/** The reply text of the parts. Thought summaries are not part of the reply. */
export const replyTextOf = (parts: ReadonlyArray<Loose<Infer<typeof partSchema>>>) =>
	parts
		.flatMap((part) => (typeof part.text === 'string' && part.thought !== true ? [part.text] : []))
		.join('');
