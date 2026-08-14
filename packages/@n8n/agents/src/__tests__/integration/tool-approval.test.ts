import { expect, it } from 'vitest';
import { z } from 'zod';

import { chunksOfType, collectStreamChunks, describeIf, getModel } from './helpers';
import { Agent, Tool, type StreamChunk } from '../../index';

const describe = describeIf('anthropic');

function createApprovalAgent(): {
	agent: Agent;
	handlerCalls: () => number;
} {
	let calls = 0;
	const deleteRecordTool = new Tool('delete_record')
		.description('Delete a record by id. Use this tool for record deletion requests.')
		.input(z.object({ id: z.string().describe('Record id to delete') }))
		.output(z.object({ deleted: z.boolean(), id: z.string() }))
		.requireApproval()
		.handler(async ({ id }) => {
			calls++;
			return { deleted: true, id };
		});

	const agent = new Agent('approval-tool-test')
		.model(getModel('anthropic'))
		.instructions(
			'You are a record manager. When asked to delete a record, call delete_record with the exact id. Be concise.',
		)
		.tool(deleteRecordTool)
		.checkpoint('memory');

	return { agent, handlerCalls: () => calls };
}

function createConditionalApprovalAgent(): {
	agent: Agent;
	handlerCalls: () => number;
} {
	let calls = 0;
	const lookupRecordTool = new Tool('lookup_record')
		.description('Look up a record by id. Use this tool for record lookup requests.')
		.input(z.object({ id: z.string().describe('Record id to look up') }))
		.output(z.object({ found: z.boolean(), id: z.string() }))
		.needsApprovalFn(({ id }) => id.startsWith('secret'))
		.handler(async ({ id }) => {
			calls++;
			return { found: true, id };
		});

	const agent = new Agent('conditional-approval-tool-test')
		.model(getModel('anthropic'))
		.instructions(
			'You are a record lookup assistant. When asked to look up a record, call lookup_record with the exact id. Be concise.',
		)
		.tool(lookupRecordTool)
		.checkpoint('memory');

	return { agent, handlerCalls: () => calls };
}

describe('tool approval integration', () => {
	it('stream() suspends with approval payload before running a requireApproval tool', async () => {
		const { agent, handlerCalls } = createApprovalAgent();

		const { stream } = await agent.stream('Delete record rec-123 using delete_record.');
		const chunks = await collectStreamChunks(stream);

		const suspendedChunks = chunksOfType(chunks, 'tool-call-suspended');
		expect(suspendedChunks).toHaveLength(1);

		const suspended = suspendedChunks[0] as StreamChunk & { type: 'tool-call-suspended' };
		expect(suspended.toolName).toBe('delete_record');
		expect(suspended.runId).toBeTruthy();
		expect(suspended.toolCallId).toBeTruthy();
		expect(suspended.suspendPayload).toEqual(
			expect.objectContaining({
				type: 'approval',
				toolName: 'delete_record',
				args: expect.objectContaining({ id: 'rec-123' }),
			}),
		);
		expect(handlerCalls()).toBe(0);
		expect(chunksOfType(chunks, 'tool-result')).toHaveLength(0);
	});

	it("approve('stream') runs the approved tool and completes", async () => {
		const { agent, handlerCalls } = createApprovalAgent();

		const { stream } = await agent.stream('Delete record rec-123 using delete_record.');
		const chunks = await collectStreamChunks(stream);
		const suspended = chunksOfType(chunks, 'tool-call-suspended')[0] as StreamChunk & {
			type: 'tool-call-suspended';
		};

		const resumed = await agent.approve('stream', {
			runId: suspended.runId,
			toolCallId: suspended.toolCallId,
		});
		const resumedChunks = await collectStreamChunks(resumed.stream);

		expect(handlerCalls()).toBe(1);
		expect(chunksOfType(resumedChunks, 'tool-result')).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					toolName: 'delete_record',
					output: { deleted: true, id: 'rec-123' },
				}),
			]),
		);
		const finishChunks = chunksOfType(resumedChunks, 'finish');
		expect(finishChunks[finishChunks.length - 1]?.finishReason).not.toBe('error');
	});

	it("deny('generate') declines without running the original handler", async () => {
		const { agent, handlerCalls } = createApprovalAgent();

		const first = await agent.generate('Delete record rec-123 using delete_record.');
		expect(first.finishReason).toBe('tool-calls');
		expect(first.pendingSuspend).toHaveLength(1);

		const { runId, toolCallId } = first.pendingSuspend![0];
		const denied = await agent.deny('generate', { runId, toolCallId });

		expect(denied.finishReason).toBe('stop');
		expect(denied.pendingSuspend).toBeUndefined();
		expect(handlerCalls()).toBe(0);
		expect(denied.toolCalls).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					tool: 'delete_record',
					output: expect.objectContaining({
						declined: true,
						message: expect.stringContaining('delete_record'),
					}),
				}),
			]),
		);
	});

	it('needsApprovalFn suspends only matching inputs', async () => {
		const secretCase = createConditionalApprovalAgent();

		const secret = await secretCase.agent.generate(
			'Look up record secret-42 using lookup_record with id exactly secret-42.',
		);
		expect(secret.finishReason).toBe('tool-calls');
		expect(secret.pendingSuspend).toHaveLength(1);
		expect(secret.pendingSuspend![0]).toEqual(
			expect.objectContaining({
				toolName: 'lookup_record',
				suspendPayload: expect.objectContaining({
					type: 'approval',
					toolName: 'lookup_record',
					args: expect.objectContaining({ id: 'secret-42' }),
				}),
			}),
		);
		expect(secretCase.handlerCalls()).toBe(0);

		const publicCase = createConditionalApprovalAgent();
		const publicResult = await publicCase.agent.generate(
			'Look up record public-1 using lookup_record with id exactly public-1.',
		);

		expect(publicResult.finishReason).toBe('stop');
		expect(publicResult.pendingSuspend).toBeUndefined();
		expect(publicCase.handlerCalls()).toBe(1);
		expect(publicResult.toolCalls).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					tool: 'lookup_record',
					output: { found: true, id: 'public-1' },
				}),
			]),
		);
	});
});
