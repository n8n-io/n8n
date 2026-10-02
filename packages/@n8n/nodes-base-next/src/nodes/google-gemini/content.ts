import {
	arr,
	bool,
	int,
	json,
	obj,
	str,
	type Infer,
	type JsonSchema,
	type Loose,
} from '@n8n/node-sdk';

// Gemini adds fields over time, so the schemas check the fields the actions read only.
const open: JsonSchema = { additionalProperties: true };

export const partSchema = obj({
	text: str().optional(),
	thought: bool().optional(),
	functionCall: obj({ id: str().optional(), name: str(), args: json().optional() })
		.with(open)
		.optional(),
}).with(open);

/** The `generateContent` response, as `chatModel` reads it. */
export const generateContentSchema = obj({
	candidates: arr(
		obj({
			content: obj({ parts: arr(partSchema).optional() })
				.with(open)
				.optional(),
			finishReason: str().optional(),
		}).with(open),
	).optional(),
	promptFeedback: obj({ blockReason: str().optional() }).with(open).optional(),
	usageMetadata: obj({
		promptTokenCount: int().optional(),
		candidatesTokenCount: int().optional(),
	})
		.with(open)
		.optional(),
}).with(open);

/** The reply text of the parts. Thought summaries are not part of the reply. */
export const replyTextOf = (parts: ReadonlyArray<Loose<Infer<typeof partSchema>>>) =>
	parts
		.flatMap((part) => (typeof part.text === 'string' && part.thought !== true ? [part.text] : []))
		.join('');
