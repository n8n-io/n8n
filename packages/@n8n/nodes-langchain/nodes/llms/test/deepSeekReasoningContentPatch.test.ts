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
 *
 * The patch is scoped narrowly: only assistant messages with `tool_calls`
 * (DeepSeek's actual requirement), and only when `model` looks like a DeepSeek
 * model, so other `ChatOpenAI`-compatible providers (OpenRouter, xAI, custom
 * base URLs) are unaffected even if their API happens to return a
 * `reasoning_content` field too.
 */
describe('@langchain/openai reasoning_content passthrough patch', () => {
	const toolCallMessage = () =>
		new AIMessage({
			content: '',
			tool_calls: [{ id: 'call_abc', name: 'get_weather', args: { location: 'NYC' } }],
			additional_kwargs: {
				reasoning_content: 'The user wants the weather, I should call get_weather.',
			},
		});

	it('re-emits assistant reasoning_content on outbound completions requests for a DeepSeek model', () => {
		const [result] = convertMessagesToCompletionsMessageParams({
			messages: [toolCallMessage()],
			model: 'deepseek-reasoner',
		});

		expect(result).toMatchObject({
			role: 'assistant',
			reasoning_content: 'The user wants the weather, I should call get_weather.',
		});
	});

	it('does not add reasoning_content when the model is not DeepSeek', () => {
		const [result] = convertMessagesToCompletionsMessageParams({
			messages: [toolCallMessage()],
			model: 'gpt-4o',
		});

		expect(result).not.toHaveProperty('reasoning_content');
	});

	it('does not add reasoning_content when the model is undefined', () => {
		const [result] = convertMessagesToCompletionsMessageParams({ messages: [toolCallMessage()] });

		expect(result).not.toHaveProperty('reasoning_content');
	});

	it('does not add reasoning_content on a DeepSeek message with no tool_calls', () => {
		const message = new AIMessage({
			content: 'The weather in NYC is sunny.',
			additional_kwargs: {
				reasoning_content: 'The user wants the weather, I already have the answer.',
			},
		});

		const [result] = convertMessagesToCompletionsMessageParams({
			messages: [message],
			model: 'deepseek-reasoner',
		});

		expect(result).not.toHaveProperty('reasoning_content');
	});

	it('does not add reasoning_content when the AIMessage has none', () => {
		const message = new AIMessage({
			content: '',
			tool_calls: [{ id: 'call_abc', name: 'get_weather', args: { location: 'NYC' } }],
		});

		const [result] = convertMessagesToCompletionsMessageParams({
			messages: [message],
			model: 'deepseek-reasoner',
		});

		expect(result).not.toHaveProperty('reasoning_content');
	});
});
