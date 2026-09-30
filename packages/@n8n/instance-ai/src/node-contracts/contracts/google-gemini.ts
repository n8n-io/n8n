import {
	bool,
	compact,
	num,
	obj,
	openObj,
	record,
	resourceLocator,
	str,
	tagOf,
	variant,
} from '../helpers';
import type { ActionContract } from '../types';

const textPart = obj({ text: str() });

const candidate = obj({
	content: obj({ parts: { type: 'array', items: textPart }, role: str() }),
	finishReason: str(),
	index: num(),
	safetyRatings: { type: 'array' },
	citationMetadata: openObj(),
	groundingMetadata: openObj(),
	avgLogprobs: num(),
});

export const geminiMessage: ActionContract = {
	id: 'googleGemini.text.message',
	node: 'googleGemini',
	action: 'Message a model',
	summary: 'Send messages to a Gemini model and get its reply as text.',
	flow: { effect: 'read', cardinality: 'per-item', passthrough: 'replace', idempotent: false },
	credentials: ['googlePalmApi'],
	input: obj(
		{
			model: str('Model ID such as "models/gemini-2.5-flash"; never invent one'),
			messages: {
				type: 'array',
				minItems: 1,
				items: obj({ role: { enum: ['user', 'model'], default: 'user' }, content: str() }, [
					'content',
				]),
			},
			systemMessage: str(),
			jsonOutput: bool({ default: false, 'x-n8n-hint': 'Reply text is JSON; still a string' }),
			temperature: num(),
			maxOutputTokens: num(),
			output: variant(
				'mode',
				{
					text: {
						hint: 'One item per candidate; reply text in $json.mergedResponse',
						output: {
							...candidate,
							properties: { mergedResponse: str('The full reply text'), ...candidate.properties },
						},
					},
					raw: {
						hint: 'Full API response: $json.candidates[0].content.parts[0].text',
						output: obj({
							candidates: { type: 'array', items: candidate },
							usageMetadata: openObj(),
							modelVersion: str(),
						}),
					},
				},
				{ default: { mode: 'text' } },
			),
		},
		['model', 'messages', 'output'],
	),
	output: candidate,
	example: {
		model: 'models/gemini-2.5-flash',
		messages: [{ content: '=Summarize in one line: {{ $json.text }}' }],
		output: { mode: 'text' },
	},
	compile: {
		type: '@n8n/n8n-nodes-langchain.googleGemini',
		typeVersion: 1.2,
		discriminators: { resource: 'text', operation: 'message' },
		parameters: (input) => {
			const raw = tagOf(input.output, 'mode') === 'raw';
			return {
				resource: 'text',
				operation: 'message',
				modelId: resourceLocator('id', input.model),
				messages: {
					values: (Array.isArray(input.messages) ? input.messages : []).map((message) => ({
						role: 'user',
						...record(message),
					})),
				},
				simplify: !raw,
				jsonOutput: input.jsonOutput === true,
				options: compact({
					includeMergedResponse: raw ? undefined : true,
					systemMessage: input.systemMessage,
					temperature: input.temperature,
					maxOutputTokens: input.maxOutputTokens,
				}),
			};
		},
	},
};
