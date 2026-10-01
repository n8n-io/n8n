import {
	arr,
	bool,
	compat,
	defineAction,
	defineNode,
	int,
	isRecord,
	json,
	list,
	matches,
	num,
	obj,
	oneOf,
	str,
} from '@n8n/node-sdk';

export const googleGemini = defineNode({
	id: 'googleGemini',
	displayName: 'Google Gemini',
	credentials: [compat('googlePalmApi')],
	baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
});

/** A candidate as the node emits it with `simplify` and `includeMergedResponse`. */
const candidate = obj({
	mergedResponse: str().hint('The full reply text'),
	content: obj({ parts: arr(json()).optional(), role: str().optional() })
		.with({ additionalProperties: true })
		.optional(),
	finishReason: str().optional(),
	index: int().optional(),
}).with({ additionalProperties: true, 'x-n8n-hint': 'One item per candidate' });

/**
 * Mirrors `includeMergedResponse` in the langchain GoogleGemini text message operation, but
 * leaves out thought summaries: they are not part of the reply.
 */
const mergedText = (entry: unknown) =>
	list(isRecord(entry) && isRecord(entry.content) ? entry.content.parts : undefined)
		.flatMap((part) =>
			isRecord(part) && 'text' in part && part.thought !== true ? [part.text] : [],
		)
		.join('');

export const messageGemini = defineAction({
	node: googleGemini,
	id: 'googleGemini.text.message',
	patch: 2,
	action: 'Message a model',
	summary: 'Send messages to a Gemini model and get its reply as text.',
	flow: { effect: 'read', cardinality: 'per-item', passthrough: 'replace', idempotent: false },
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
	async run({ input, http, emit }) {
		const contents = input.messages
			.filter((message) => message.content.trim() !== '')
			.map((message) => ({ parts: [{ text: message.content }], role: message.role ?? 'user' }));
		if (contents.length === 0) throw new Error('A non-empty prompt is required.');
		const model = input.model.startsWith('models/') ? input.model : `models/${input.model}`;
		const response = await http.request({
			method: 'POST',
			path: `/${model}:generateContent`,
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
		const candidates = list(isRecord(response) ? response.candidates : undefined);
		if (candidates.length === 0) {
			const feedback = isRecord(response) ? response.promptFeedback : undefined;
			const reason = isRecord(feedback) ? feedback.blockReason : undefined;
			throw new Error(`Gemini returned no reply${typeof reason === 'string' ? `: ${reason}` : ''}`);
		}
		// A blocked or cut-off reply has no text. An empty item would look like a success.
		const stopped = candidates.flatMap((entry) =>
			isRecord(entry) &&
			typeof entry.finishReason === 'string' &&
			entry.finishReason !== 'STOP' &&
			mergedText(entry) === ''
				? [entry.finishReason]
				: [],
		);
		if (stopped.length === candidates.length) {
			throw new Error(`Gemini returned no text: ${[...new Set(stopped)].join(', ')}`);
		}
		for (const entry of candidates) {
			const reply = { ...(isRecord(entry) ? entry : {}), mergedResponse: mergedText(entry) };
			if (!matches(candidate, reply)) throw new Error('Gemini returned an invalid candidate');
			emit(reply);
		}
	},
});
