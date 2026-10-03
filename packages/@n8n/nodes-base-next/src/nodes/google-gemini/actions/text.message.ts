import { parse, path, t, UserError } from '@n8n/node-sdk';

import { generateContentSchema, replyTextOf } from '../content';
import { text } from '../google-gemini.node';

/** A candidate as the node emits it with `simplify` and `includeMergedResponse`. */
const candidate = t.loose(
	t
		.obj({
			mergedResponse: t.str().hint('The full reply text'),
			content: t
				.obj({ parts: t.arr(t.json()).optional(), role: t.str().optional() })
				.with({ additionalProperties: true })
				.optional(),
			finishReason: t.str().optional(),
			index: t.int().optional(),
		})
		.with({ additionalProperties: true, 'x-n8n-hint': 'One item per candidate' }),
);

export const messageGemini = text.action('message', {
	patch: 6,
	action: 'Message a model',
	summary: 'Send messages to a Gemini model and get its reply as text.',
	flow: { effect: 'read', cardinality: 'per-item', idempotent: false },
	input: {
		model: t.str().hint('Model ID such as "models/gemini-2.5-flash"; never invent one'),
		messages: t
			.arr(t.obj({ role: t.oneOf('user', 'model').default('user'), content: t.str() }))
			.with({
				minItems: 1,
			}),
		systemMessage: t.str().optional(),
		jsonOutput: t.bool().default(false).hint('Reply text is JSON; still a string'),
		temperature: t.num().optional(),
		maxOutputTokens: t.int().with({ minimum: 1 }).optional(),
	},
	output: candidate,
	async run({ input, http }) {
		// applyDefaults fills the nested role default, so each message has its role.
		const contents = input.messages
			.filter((message) => message.content.trim() !== '')
			.map((message) => ({ parts: [{ text: message.content }], role: message.role }));
		if (contents.length === 0) throw new UserError('A non-empty prompt is required.');
		const id = input.model.replace(/^models\//, '');
		const response = await http.request({
			method: 'POST',
			path: path`/models/${id}:generateContent`,
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
			throw new UserError(`Gemini returned no reply${reason ? `: ${reason}` : ''}`);
		}
		// Mirrors `includeMergedResponse` of the legacy node, without thought summaries.
		const merged = candidates.map((entry) => replyTextOf(entry.content?.parts ?? []));
		// A blocked or cut-off reply has no text. An empty item would look like a success.
		const stopped = candidates.flatMap(({ finishReason }, index) =>
			finishReason && finishReason !== 'STOP' && merged[index] === '' ? [finishReason] : [],
		);
		if (stopped.length === candidates.length) {
			throw new UserError(`Gemini returned no text: ${[...new Set(stopped)].join(', ')}`);
		}
		// The input cannot ask for more than one candidate, so the first one is the reply.
		const [first] = candidates;
		return { ...first, mergedResponse: merged[0] ?? '' };
	},
});
