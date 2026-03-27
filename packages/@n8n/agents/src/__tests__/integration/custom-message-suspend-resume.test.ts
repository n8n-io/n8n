import { expect, it } from 'vitest';
import { z } from 'zod';

import { describeIf, getModel } from './helpers';
import { Agent, Memory, Tool } from '../../index';

const describe = describeIf('anthropic');

describe('custom message survives suspend/resume', () => {
	it('preserves custom tool message in stream after resume + complete', async () => {
		const memory = new Memory().storage('memory').lastMessages(20);

		const deleteTool = new Tool('delete_file')
			.description('Delete a file at the given path')
			.input(
				z.object({
					path: z.string().describe('File path to delete'),
				}),
			)
			.output(z.object({ deleted: z.boolean(), path: z.string() }))
			.suspend(z.object({ message: z.string() }))
			.resume(z.object({ approved: z.boolean() }))
			.handler(async ({ path }, ctx) => {
				if (!ctx.resumeData) {
					return await ctx.suspend({ message: `Delete "${path}"?` });
				}
				if (!ctx.resumeData.approved) return { deleted: false, path };
				return { deleted: true, path };
			})
			.toMessage((output) => ({
				type: 'custom' as const,
				data: {
					dummy: `deleted:${(output as { path: string }).path}`,
				},
			}));

		const agent = new Agent('custom-msg-suspend-resume-stream-test')
			.model(getModel('anthropic'))
			.instructions(
				'You are a file manager. When asked to delete files, use the delete_file tool. Be concise.',
			)
			.tool(deleteTool)
			.memory(memory)
			.checkpoint('memory');

		const threadId = `test-custom-msg-stream-${Date.now()}`;
		const options = { persistence: { threadId, resourceId: 'test-user' } };

		// Turn 1: stream, agent suspends
		const result1 = await agent.stream('Delete the file /tmp/stream-test.txt', options);
		const reader1 = result1.stream.getReader();
		const chunks1: Array<{ type: string; [key: string]: unknown }> = [];
		while (true) {
			const { done, value } = await reader1.read();
			if (done) break;
			chunks1.push(value as { type: string; [key: string]: unknown });
		}

		const suspendedChunk = chunks1.find((c) => c.type === 'tool-call-suspended') as
			| { type: 'tool-call-suspended'; runId: string; toolCallId: string }
			| undefined;
		expect(suspendedChunk).toBeDefined();

		// Resume with approval and get the resumed stream
		const result2 = await agent.resume(
			'stream',
			{ approved: true },
			{ runId: suspendedChunk!.runId, toolCallId: suspendedChunk!.toolCallId },
		);

		const reader2 = result2.stream.getReader();
		const chunks2: Array<{ type: string; [key: string]: unknown }> = [];
		while (true) {
			const { done, value } = await reader2.read();
			if (done) break;
			chunks2.push(value as { type: string; [key: string]: unknown });
		}

		// The custom message must appear in the resumed stream
		const customChunk = chunks2.find(
			(c) =>
				c.type === 'message' &&
				(c.message as { type?: string }).type === 'custom' &&
				'data' in (c.message as object) &&
				'dummy' in (c.message as { data: { dummy: string } }).data,
		) as { type: 'message'; message: { type: 'custom'; data: { dummy: string } } } | undefined;

		expect(customChunk).toBeDefined();
		expect(customChunk!.message.data.dummy).toContain('deleted:');
		expect(customChunk!.message.data.dummy).toContain('/tmp/stream-test.txt');
	});
});
