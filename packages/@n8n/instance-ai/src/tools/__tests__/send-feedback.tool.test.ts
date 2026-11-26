import { mock } from 'vitest-mock-extended';

import { executeTool, parseToolInput } from '../../__tests__/tool-test-utils';
import type { Logger } from '../../logger';
import type { InstanceAiAgentFeedbackService, InstanceAiContext } from '../../types';
import { createSendFeedbackTool } from '../send-feedback.tool';

const input = {
	category: 'unsure',
	severity: 'workaround',
	summary: 'The docs and the node definition disagree on the pagination parameter.',
	toolName: 'get-node-types',
};

function makeContext(overrides: Partial<InstanceAiContext> = {}) {
	const service = mock<InstanceAiAgentFeedbackService>();
	const context = mock<InstanceAiContext>();
	context.agentFeedbackService = service;
	context.logger = mock<Logger>();
	context.threadId = 'thread-1';
	context.runId = 'run-1';
	Object.assign(context, overrides);
	return { context, service };
}

describe('send_feedback tool', () => {
	it('is named send_feedback', () => {
		expect(createSendFeedbackTool(makeContext().context).name).toBe('send_feedback');
	});

	it('sends the feedback with the thread and run ids', async () => {
		const { context, service } = makeContext();

		await executeTool(createSendFeedbackTool(context), input);

		expect(service.send).toHaveBeenCalledTimes(1);
		expect(service.send).toHaveBeenCalledWith({
			...input,
			threadId: 'thread-1',
			runId: 'run-1',
		});
	});

	it('tells the agent that no reply comes and to continue', async () => {
		const { context } = makeContext();

		const result = await executeTool<{ ok: boolean; message: string }>(
			createSendFeedbackTool(context),
			input,
		);

		expect(result.ok).toBe(true);
		expect(result.message).toMatch(/no reply/i);
	});

	it('stops sending after three reports in one run, but still acknowledges', async () => {
		const { context, service } = makeContext();
		const tool = createSendFeedbackTool(context);

		for (let i = 0; i < 3; i++) await executeTool(tool, input);
		const fourth = await executeTool<{ ok: boolean }>(tool, input);

		expect(service.send).toHaveBeenCalledTimes(3);
		expect(fourth.ok).toBe(true);
	});

	it('still acknowledges when sending fails', async () => {
		const { context, service } = makeContext();
		service.send.mockImplementation(() => {
			throw new Error('telemetry down');
		});

		const result = await executeTool<{ ok: boolean }>(createSendFeedbackTool(context), input);

		expect(result.ok).toBe(true);
	});

	it('accepts a long summary and sends it in full, so the host redacts it before it cuts it', async () => {
		const { context, service } = makeContext();
		const tool = createSendFeedbackTool(context);
		const long = { ...input, summary: 'x'.repeat(5000) };

		expect(parseToolInput(tool, long).success).toBe(true);
		await executeTool(tool, long);

		expect(service.send.mock.calls[0][0].summary).toHaveLength(5000);
	});

	it('rejects an unknown category', () => {
		const tool = createSendFeedbackTool(makeContext().context);

		expect(parseToolInput(tool, { ...input, category: 'angry' }).success).toBe(false);
	});
});
