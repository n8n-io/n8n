import { expect, it } from 'vitest';
import { z } from 'zod';

import { describeIf, getModel } from './helpers';
import { Agent, Tool, createCancellation } from '../../index';

const describe = describeIf('anthropic');

describe('tool behavior integration', () => {
	it('uses Tool.systemInstruction to decide to call a tool', async () => {
		const markerTool = new Tool('record_marker')
			.description('Record an audit marker.')
			.systemInstruction(
				'When the user asks you to handle SYS_RULE_ALPHA according to built-in rules, call record_marker with marker exactly "SYS_RULE_ALPHA" before answering.',
			)
			.input(z.object({ marker: z.string().describe('Marker to record') }))
			.output(z.object({ recorded: z.boolean(), marker: z.string() }))
			.handler(async ({ marker }) => ({ recorded: true, marker }));

		const agent = new Agent('tool-system-instruction-test')
			.model(getModel('anthropic'))
			.instructions('You are a concise assistant. Follow built-in tool rules exactly.')
			.tool(markerTool);

		const result = await agent.generate(
			'Please handle SYS_RULE_ALPHA according to your built-in rules, then answer with the marker.',
		);

		expect(result.finishReason).toBe('stop');
		expect(result.toolCalls).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					tool: 'record_marker',
					input: expect.objectContaining({ marker: 'SYS_RULE_ALPHA' }),
					output: { recorded: true, marker: 'SYS_RULE_ALPHA' },
				}),
			]),
		);
	});

	it('handleCancellation routes cancellation into the tool handler', async () => {
		const cancelAwareTool = new Tool('cancel_sensitive_delete')
			.description('Delete a file after confirmation.')
			.input(z.object({ path: z.string().describe('File path to delete') }))
			.output(
				z.object({
					cancelledByHandler: z.boolean(),
					path: z.string(),
					message: z.string().optional(),
					deleted: z.boolean().optional(),
				}),
			)
			.suspend(z.object({ message: z.string() }))
			.resume(z.object({ approved: z.boolean() }))
			.handleCancellation()
			.handler(async ({ path }, ctx) => {
				if (ctx.cancellation) {
					return {
						cancelledByHandler: true,
						path,
						message: ctx.cancellation.message,
					};
				}
				if (!ctx.resumeData) {
					return await ctx.suspend({ message: `Delete "${path}"?` });
				}
				return {
					cancelledByHandler: false,
					path,
					deleted: ctx.resumeData.approved,
				};
			});

		const agent = new Agent('tool-handle-cancellation-test')
			.model(getModel('anthropic'))
			.instructions(
				'You are a file manager. When asked to delete a file, call cancel_sensitive_delete with the exact path.',
			)
			.tool(cancelAwareTool)
			.checkpoint('memory');

		const first = await agent.generate(
			'Call cancel_sensitive_delete exactly once for path="/tmp/cancel-aware.txt".',
		);

		expect(first.finishReason).toBe('tool-calls');
		expect(first.pendingSuspend).toHaveLength(1);

		const resumed = await agent.resume('generate', createCancellation('Keep the file unchanged'), {
			runId: first.pendingSuspend![0].runId,
			toolCallId: first.pendingSuspend![0].toolCallId,
		});

		expect(resumed.finishReason).toBe('stop');
		expect(resumed.toolCalls).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					tool: 'cancel_sensitive_delete',
					output: {
						cancelledByHandler: true,
						path: '/tmp/cancel-aware.txt',
						message: 'Keep the file unchanged',
					},
				}),
			]),
		);
	});
});
