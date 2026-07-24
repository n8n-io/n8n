import { AIMessage } from '@langchain/core/messages';
import { convertMessagesToCompletionsMessageParams } from '@langchain/openai';

/**
 * DeepSeek's "thinking mode" (V3.2+ / V4) requires that any assistant message
 * containing `tool_calls` is re-sent to the API with its original
 * `reasoning_content` field intact, or the API rejects the request with:
 *   "The reasoning_content in the thinking mode must be passed back to the API."
 *
 * `@langchain/openai` captures `reasoning_content` from DeepSeek responses into
 * `additional_kwargs.reasoning_content`, but (as of 1.4.4) never re-emits it when
 * converting messages back into an outgoing request. We patch this in
 * `patches/@langchain__openai@1.4.4.patch` (registered in the root package.json's
 * `pnpm.patchedDependencies`). This test exercises the real, patched package
 * directly, so it fails loudly if that patch is ever lost or stops applying.
 */
describe('@langchain/openai reasoning_content passthrough patch', () => {
	it('re-emits assistant reasoning_content on outbound completions requests', () => {
		const message = new AIMessage({
			content: '',
			tool_calls: [{ id: 'call_abc', name: 'get_weather', args: { location: 'NYC' } }],
			additional_kwargs: {
				reasoning_content: 'The user wants the weather, I should call get_weather.',
			},
		});

		const [result] = convertMessagesToCompletionsMessageParams({ messages: [message] });

		expect(result).toMatchObject({
			role: 'assistant',
			reasoning_content: 'The user wants the weather, I should call get_weather.',
		});
	});

	it('does not add reasoning_content when the AIMessage has none', () => {
		const message = new AIMessage({ content: 'hello' });

		const [result] = convertMessagesToCompletionsMessageParams({ messages: [message] });

		expect(result).not.toHaveProperty('reasoning_content');
	});
});
