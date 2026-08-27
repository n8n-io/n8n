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
		pattern:
			/\b(?:model_not_found|not_found_error|invalid_model_id|invalid_model|unknown_model)\b|(?:(?:model|models\/|deployment|engine)[\s\S]*?(?:not found|does not exist|is not found|was not found|invalid|unknown|not available)|(?:resource ['"]?models\/[^\s'"]+['"]? was not found))/i,
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
