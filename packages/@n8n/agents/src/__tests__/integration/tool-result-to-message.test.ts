import { expect, it } from 'vitest';

import {
	chunksOfType,
	collectStreamChunks,
	createAgentWithToContentTool,
	describeIf,
} from './helpers';
import { filterLlmMessages } from '../../index';
import type { AgentMessage, StreamChunk } from '../../index';

const describe = describeIf('anthropic');

describe('tool-result to message integration', () => {
	it('adds a custom message to generate result that is visible to user but not to the LLM', async () => {
		const agent = createAgentWithToContentTool('anthropic');
		const result = await agent.generate('What is 3 + 4?');

		// The custom message must appear in result.messages
		const customMessages = result.messages.filter((m) => m.type === 'custom');
		expect(customMessages.length).toBeGreaterThan(0);

		const toolResultMsg = customMessages.find((m) => m.type === 'custom' && 'dummy' in m.data) as
			| { type: 'custom'; data: { dummy: string } }
			| undefined;

		expect(toolResultMsg).toBeDefined();
		expect(toolResultMsg!.data.dummy).toContain('dummy message. Tool output');

		// filterLlmMessages must strip the custom message — the LLM never sees it.
		// The filtered count must be less than total because custom messages were removed.
		const llmMessages = filterLlmMessages(result.messages);
		expect(llmMessages.length).toBeLessThan(result.messages.length);
	});

	it('emits toContent result as a content chunk in the stream', async () => {
		const agent = createAgentWithToContentTool('anthropic');
		const { stream } = await agent.stream('What is 5 + 6?');

		const chunks = await collectStreamChunks(stream);
		// Must contain at least one content chunk with the custom text from toContent
		const messageChunks = chunksOfType(chunks, 'message') as Array<
			StreamChunk & { type: 'message'; message: AgentMessage }
		>;

		const toContentChunk = messageChunks.find(
			(c) => c.message.type === 'custom' && 'dummy' in c.message.data,
		);

		expect(toContentChunk).toBeDefined();
		expect(
			(toContentChunk!.message as { type: 'custom'; data: { dummy: string } }).data.dummy,
		).toContain('dummy message. Tool output');
	});
});
