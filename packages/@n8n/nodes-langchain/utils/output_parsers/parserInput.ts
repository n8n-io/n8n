import type { BaseMessage } from '@langchain/core/messages';

/**
 * LangChain's string-based output parsers stringify array message content (the
 * content-block shape returned by the OpenAI Responses API and by reasoning
 * models) instead of extracting its text, so strict parsers reject otherwise
 * valid replies. Pipe this between a model and a string-based output parser to
 * hand the parser the message text; string outputs pass through unchanged.
 */
export function toParserInputText(output: string | BaseMessage): string {
	return typeof output === 'string' ? output : output.text;
}
