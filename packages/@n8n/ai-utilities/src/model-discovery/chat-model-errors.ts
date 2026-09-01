/**
 * Classification of provider errors that mean "the chat model itself is
 * misconfigured" rather than "the workflow logic is wrong". Lives beside model
 * discovery because it is the same provider knowledge: discovery answers which
 * models a credential can call, this answers why a call was rejected.
 *
 * Shared by the workflow builder's verification analysis and the agents
 * builder's test-run handling, so a `404 Not Found` is read as a wrong-model
 * signal in both places instead of a credential fault.
 */
export type ChatModelFailureKind =
	| 'invalid_model'
	| 'unsupported_parameter'
	| 'capability_mismatch';

/**
 * A model term, its optional identifier, and an optional linking verb — the
 * most a real provider puts between "model" and the reason it rejected one
 * (`models/gemini-3.6-flash is not found`, `The model "gpt-6" was not found`).
 *
 * Keeping this gap narrow is the whole point. An unbounded gap matches any
 * message that merely mentions a model somewhere before an unrelated
 * not-found detail — and n8n node errors routinely do, because chat-model
 * nodes are named "... Chat Model" ("Problem in node 'Google Gemini Chat
 * Model': the Notion page does not exist"). Callers act on `invalid_model` by
 * telling the user to replace the model, so a false positive sends them after
 * a model that was never broken instead of the failing tool or resource.
 */
const QUOTE = '[\'"\\x60]';

const MODEL_SUBJECT =
	'\\b(?:models?|deployment|engine)\\b' +
	// its identifier, optionally quoted: /gemini-3.6-flash, "gpt-6"
	`(?:\\s*${QUOTE}?[\\w./:@-]+${QUOTE}?)?` +
	'(?:\\s+(?:is|was|are|were|has been|had been))?' +
	'[\\s,:;\'"\\x60-]*';

const MODEL_REJECTED =
	'(?:not found|does not exist|not available|no longer exists|invalid|unknown)';

const CHAT_MODEL_ERROR_PATTERNS: Array<{
	kind: ChatModelFailureKind;
	pattern: RegExp;
}> = [
	{
		kind: 'unsupported_parameter',
		pattern:
			/\b(?:unsupported_parameter|invalid_parameter)\b|(?:unsupported (?:parameter|value|option)|parameter [^\s]+ is not supported|does not support (?:temperature|top_p|max_tokens|max_completion_tokens|thinking)|(?:temperature|top_p|max_tokens|max_completion_tokens|thinking) (?:is not supported|cannot be set|is not allowed))/i,
	},
	{
		kind: 'invalid_model',
		// Unambiguous provider error codes, or a model the provider says it cannot serve.
		pattern: new RegExp(
			'\\b(?:model_not_found|not_found_error|invalid_model_id|invalid_model|unknown_model)\\b' +
				`|${MODEL_SUBJECT}${MODEL_REJECTED}`,
			'i',
		),
	},
	{
		kind: 'capability_mismatch',
		pattern:
			/\b(?:not a chat model|not supported for (?:generateContent|this operation)|does not support (?:tools|tool use|function calling|functions|vision|multimodal)|only supported (?:via|for) responses api)\b/i,
	},
];

export function classifyChatModelFailure(
	errorMessage: string | undefined,
): ChatModelFailureKind | undefined {
	if (!errorMessage) return undefined;
	for (const { kind, pattern } of CHAT_MODEL_ERROR_PATTERNS) {
		if (pattern.test(errorMessage)) return kind;
	}
	return undefined;
}
