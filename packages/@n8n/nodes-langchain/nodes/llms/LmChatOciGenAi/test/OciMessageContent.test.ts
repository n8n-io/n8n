import { AIMessage, HumanMessage } from '@langchain/core/messages';
import type { GenerativeAiInferenceClient } from 'oci-generativeaiinference';

import { createN8nOciGenAiGenericChat } from '../LmChatOciGenAi.node';

async function createChatModel() {
	const N8nOciGenAiGenericChat = await createN8nOciGenAiGenericChat();
	return new N8nOciGenAiGenericChat({
		client: {} as GenerativeAiInferenceClient,
		compartmentId: 'ocid1.compartment.oc1..test',
		onDemandModelId: 'meta.llama-3.3-70b-instruct',
	});
}

describe('OCI chat message content', () => {
	it('accepts text-only content blocks', async () => {
		const chatModel = await createChatModel();

		expect(() =>
			chatModel._prepareRequest(
				[new HumanMessage([{ type: 'text', text: 'Hello from a text content block' }])],
				{},
			),
		).not.toThrow();
	});

	it('accepts empty content on AI tool-call messages', async () => {
		const chatModel = await createChatModel();

		expect(() =>
			chatModel._prepareRequest(
				[
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
				],
				{},
			),
		).not.toThrow();
	});

	it('rejects unsupported multimodal content instead of serializing it as text', async () => {
		const chatModel = await createChatModel();

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
