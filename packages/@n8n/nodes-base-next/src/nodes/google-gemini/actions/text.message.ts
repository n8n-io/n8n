import { arr, bool, int, json, loose, num, obj, oneOf, parse, str } from '@n8n/node-sdk';

import { generateContentSchema, replyTextOf } from '../content';
import { text } from '../google-gemini.node';

/** A candidate as the node emits it with `simplify` and `includeMergedResponse`. */
const candidate = loose(
	obj({
		mergedResponse: str().hint('The full reply text'),
		content: obj({ parts: arr(json()).optional(), role: str().optional() })
			.with({ additionalProperties: true })
			.optional(),
		finishReason: str().optional(),
		index: int().optional(),
	}).with({ additionalProperties: true, 'x-n8n-hint': 'One item per candidate' }),
);

export const messageGemini = text.action('message', {
	patch: 6,
	action: 'Message a model',
	summary: 'Send messages to a Gemini model and get its reply as text.',
	flow: { effect: 'read', cardinality: 'per-item', idempotent: false },
	input: {
		model: str().hint('Model ID such as "models/gemini-2.5-flash"; never invent one'),
		messages: arr(obj({ role: oneOf('user', 'model').default('user'), content: str() })).with({
			minItems: 1,
		}),
		systemMessage: str().optional(),
		jsonOutput: bool().default(false).hint('Reply text is JSON; still a string'),
		temperature: num().optional(),
		maxOutputTokens: int().with({ minimum: 1 }).optional(),
	},
	output: candidate,
	async run({ input, http }) {
		// applyDefaults fills the nested role default, so each message has its role.
		const contents = input.messages
			.filter((message) => message.content.trim() !== '')
			.map((message) => ({ parts: [{ text: message.content }], role: message.role }));
		if (contents.length === 0) throw new Error('A non-empty prompt is required.');
		const id = input.model.replace(/^models\//, '');
		const response = await http.request({
			method: 'POST',
			path: `/models/${encodeURIComponent(id)}:generateContent`,
			body: {
				contents,
				generationConfig: {
					temperature: input.temperature,
					maxOutputTokens: input.maxOutputTokens,
					responseMimeType: input.jsonOutput ? 'application/json' : undefined,
				},
				...(input.systemMessage
					? { systemInstruction: { parts: [{ text: input.systemMessage }] } }
					: {}),
			},
		});
		const { candidates: found, promptFeedback } = parse(generateContentSchema, response);
		const candidates = found ?? [];
		if (candidates.length === 0) {
			const reason = promptFeedback?.blockReason;
			throw new Error(`Gemini returned no reply${reason ? `: ${reason}` : ''}`);
		}
		// Mirrors `includeMergedResponse` of the legacy node, without thought summaries.
		const merged = candidates.map((entry) => replyTextOf(entry.content?.parts ?? []));
		// A blocked or cut-off reply has no text. An empty item would look like a success.
		const stopped = candidates.flatMap(({ finishReason }, index) =>
			finishReason && finishReason !== 'STOP' && merged[index] === '' ? [finishReason] : [],
		);
		if (stopped.length === candidates.length) {
			throw new Error(`Gemini returned no text: ${[...new Set(stopped)].join(', ')}`);
		}
		// The input cannot ask for more than one candidate, so the first one is the reply.
		const [first] = candidates;
		return { ...first, mergedResponse: merged[0] ?? '' };
	},
});
