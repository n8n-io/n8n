import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { OciGenAiGenericChat } from '@oracle/langchain-oci';
import type { GenerativeAiInferenceClient } from 'oci-generativeaiinference';

import { normalizeEmptyOciToolCallContent } from '../LmChatOciGenAi.node';

function createChatModel(): OciGenAiGenericChat {
	return new OciGenAiGenericChat({
		client: {} as GenerativeAiInferenceClient,
		compartmentId: 'ocid1.compartment.oc1..test',
		onDemandModelId: 'meta.llama-3.3-70b-instruct',
	});
}

describe('OCI chat message content', () => {
	it('accepts text-only content blocks', () => {
		const chatModel = createChatModel();

		expect(() =>
			chatModel._prepareRequest(
				[new HumanMessage([{ type: 'text', text: 'Hello from a text content block' }])],
				{},
			),
		).not.toThrow();
	});

	it('accepts empty content on AI tool-call messages', () => {
		const chatModel = createChatModel();

		const messages = normalizeEmptyOciToolCallContent([
			new AIMessage({
				content: [],
				tool_calls: [
					{
						id: 'call_1',
						name: 'exampleTool',
						args: {},
						type: 'tool_call',
					},
				],
			}),
		]);

		expect(() => chatModel._prepareRequest(messages, {})).not.toThrow();
	});

	it('rejects unsupported multimodal content instead of serializing it as text', () => {
		const chatModel = createChatModel();

		expect(() =>
			chatModel._prepareRequest(
				[
					new HumanMessage([
						{
							type: 'image_url',
							image_url: { url: 'https://example.com/image.png' },
						},
					]),
				],
				{},
			),
		).toThrow('Unsupported message content');
	});
});
