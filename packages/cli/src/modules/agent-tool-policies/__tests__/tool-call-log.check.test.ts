import { mockLogger } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import type { PolicedSession, PreToolExecutionContext } from '@n8n/decorators';
import { PolicyCheckMetadata, pointsImplementedBy } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { ToolCallLogCheck } from '../tool-call-log.check';

describe('ToolCallLogCheck', () => {
	const pending = {
		toolCallId: 'call-1',
		toolName: 'send_message',
		input: { text: 'hi' },
		status: 'pending',
	} as const;
	const history: PolicedSession[] = [
		{ threadId: 'thread-1', agentId: 'agent-1', toolCalls: [pending] },
	];
	const call = {
		agentId: 'agent-1',
		projectId: 'project-1',
		threadId: 'thread-1',
		agentExecutionId: 'agent-exec-1',
		runId: 'run-1',
		toolCallId: 'call-1',
		tool: { name: 'send_message', metadata: { kind: 'node', nodeType: 'n8n-nodes-base.slack' } },
		input: { text: 'hi' },
		resumed: false,
	};

	// `mockLogger` returns the same inner mock from each `scoped()` call.
	function setUp(level: GlobalConfig['logging']['level']) {
		const logger = mockLogger();
		const sessionHistory = vi.fn<PreToolExecutionContext['sessionHistory']>();
		sessionHistory.mockResolvedValue(history);
		return {
			logger,
			debug: vi.mocked(logger.scoped('policy').debug),
			check: new ToolCallLogCheck(logger, mock<GlobalConfig>({ logging: { level } })),
			context: { ...call, runToolCalls: () => [pending], sessionHistory },
		};
	}

	it('is registered for the preToolExecution point only', () => {
		expect(Container.get(PolicyCheckMetadata).getClasses()).toContain(ToolCallLogCheck);
		expect(pointsImplementedBy(setUp('info').check)).toEqual(['preToolExecution']);
	});

	it('logs the tool call with the calls of the run in the policy scope, and allows it', async () => {
		const { logger, debug, check, context } = setUp('info');

		const result = await check.onPreToolExecution(context);

		expect(result).toEqual({ violations: [] });
		expect(logger.scoped).toHaveBeenCalledWith('policy');
		expect(debug).toHaveBeenCalledExactlyOnceWith('Agent tool call: send_message', {
			context: { ...call, runToolCalls: [pending] },
		});
	});

	it('does not read the stored history when debug lines are not written', async () => {
		const { check, context } = setUp('info');

		await check.onPreToolExecution(context);

		expect(context.sessionHistory).not.toHaveBeenCalled();
	});

	it('logs the stored history at the debug level', async () => {
		const { debug, check, context } = setUp('debug');

		await check.onPreToolExecution(context);

		await vi.waitFor(() =>
			expect(debug).toHaveBeenCalledWith('Agent tool call history: send_message', {
				toolCallId: 'call-1',
				sessionHistory: history,
			}),
		);
	});

	it('allows the call when the stored history cannot be read', async () => {
		const { debug, check, context } = setUp('debug');
		const error = new Error('database is down');
		context.sessionHistory.mockRejectedValue(error);

		expect(await check.onPreToolExecution(context)).toEqual({ violations: [] });

		await vi.waitFor(() =>
			expect(debug).toHaveBeenCalledWith(
				'Could not read the agent tool call history: send_message',
				{ toolCallId: 'call-1', error },
			),
		);
	});
});
