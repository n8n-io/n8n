import type { BuiltTool } from '@n8n/agents';
import { mock } from 'vitest-mock-extended';
import type { ZodType } from 'zod';

import type { InstanceAiEventBus } from '../../event-bus';
import type { Logger } from '../../logger';
import {
	executeResumableStream,
	type ExecuteResumableStreamResult,
} from '../../runtime/resumable-stream-executor';
import { buildResumeData } from '../../runtime/confirmation-payload';
import type { LocalMcpServer } from '../../types';
import {
	buildTaskMessage,
	runCloudBrowserAgent,
	type CloudBrowserUserActionHost,
	type RunCloudBrowserAgentOptions,
} from '../cloud-browser-agent';

const { agents, mcpTools } = vi.hoisted(() => ({
	agents: [] as Array<{ tools: BuiltTool[]; stream: ReturnType<typeof vi.fn> }>,
	/** The tools the fake MCP server offers. */
	mcpTools: new Map<string, BuiltTool>(),
}));

vi.mock('@n8n/agents', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@n8n/agents')>();
	/** Records the tools and the task message, instead of calling a model. */
	class FakeAgent {
		tools: BuiltTool[] = [];

		stream = vi.fn(async () => ({}));

		constructor() {
			agents.push(this);
		}

		model() {
			return this;
		}

		instructions() {
			return this;
		}

		tool(tools: BuiltTool[]) {
			this.tools = tools;
			return this;
		}

		checkpoint() {
			return this;
		}

		telemetry() {
			return this;
		}
	}
	return { ...actual, Agent: FakeAgent };
});

vi.mock('../../runtime/resumable-stream-executor', async (importOriginal) => ({
	...(await importOriginal<typeof import('../../runtime/resumable-stream-executor')>()),
	executeResumableStream: vi.fn(),
	normalizeStreamSource: (stream: unknown) => stream,
}));

vi.mock('../../tools/create-tools-from-mcp-server', () => ({
	createToolsFromLocalMcpServer: () => new Map(mcpTools),
}));

const usage = [{ model: 'claude-sonnet-4-5' }];

function streamResult(
	overrides: Partial<ExecuteResumableStreamResult> = {},
): ExecuteResumableStreamResult {
	return {
		status: 'completed',
		agentRunId: 'agent-run-1',
		text: Promise.resolve(''),
		workSummary: { totalToolCalls: 0, totalToolErrors: 0, toolCalls: [] },
		usage: { usage },
		...overrides,
	} as ExecuteResumableStreamResult;
}

/** Makes the agent call `report_result` while the stream runs, as the model would. */
function reportWhileStreaming(
	report: { outcome: string; summary: string },
	result = streamResult(),
) {
	vi.mocked(executeResumableStream).mockImplementation(async () => {
		const reportTool = agents.at(-1)?.tools.find((tool) => tool.name === 'report_result');
		await reportTool?.handler?.(report, {} as never);
		return result;
	});
}

function makeOptions(): RunCloudBrowserAgentOptions {
	return {
		agentId: 'agent-1',
		brief: { goal: 'Find the price of the Pro plan', startUrl: 'https://example.com/pricing' },
		mcpServer: mock<LocalMcpServer>(),
		userActionHost: mock<CloudBrowserUserActionHost>(),
		modelId: 'anthropic/claude-sonnet-4-5',
		threadId: 'thread-1',
		runId: 'run-1',
		eventBus: mock<InstanceAiEventBus>(),
		logger: mock<Logger>(),
		abortSignal: new AbortController().signal,
		waitForConfirmation: vi.fn(),
	};
}

describe('runCloudBrowserAgent', () => {
	beforeEach(() => {
		agents.length = 0;
		mcpTools.clear();
		vi.mocked(executeResumableStream).mockReset();
	});

	it('gives the agent the goal and the start URL', async () => {
		reportWhileStreaming({ outcome: 'succeeded', summary: '$20 a month' });

		await runCloudBrowserAgent(makeOptions());

		expect(agents[0].stream).toHaveBeenCalledWith(
			'Goal: Find the price of the Pro plan\nStart URL: https://example.com/pricing',
			expect.anything(),
		);
	});

	it("returns the agent's report with the run's usage", async () => {
		reportWhileStreaming({ outcome: 'blocked', summary: 'The site needs a sign-in' });

		const result = await runCloudBrowserAgent(makeOptions());

		expect(result).toEqual({
			outcome: 'blocked',
			summary: 'The site needs a sign-in',
			status: 'completed',
			agentRunId: 'agent-run-1',
			usage,
		});
	});

	it('reports a stopped task as cancelled, even after a report', async () => {
		reportWhileStreaming(
			{ outcome: 'succeeded', summary: '$20 a month' },
			streamResult({ status: 'cancelled' }),
		);

		const result = await runCloudBrowserAgent(makeOptions());

		expect(result).toMatchObject({ outcome: 'cancelled', summary: 'The task was stopped.' });
	});

	it('reports a stream error as failed, with the error', async () => {
		vi.mocked(executeResumableStream).mockResolvedValue(
			streamResult({ status: 'errored', error: new Error('Model unavailable') }),
		);

		const result = await runCloudBrowserAgent(makeOptions());

		expect(result).toMatchObject({
			outcome: 'failed',
			summary: 'The browser agent stopped with an error: Model unavailable',
		});
	});

	it("marks a task that ends with text but no report as unreported, with the agent's last message", async () => {
		vi.mocked(executeResumableStream).mockResolvedValue(
			streamResult({ text: Promise.resolve(' I could not find a price. ') }),
		);

		const result = await runCloudBrowserAgent(makeOptions());

		expect(result).toMatchObject({
			outcome: 'unreported',
			summary: 'I could not find a price.',
		});
	});

	it('says when the agent ran out of steps before it reported', async () => {
		vi.mocked(executeResumableStream).mockResolvedValue(
			streamResult({ finishReason: 'max-iterations', text: Promise.resolve('Still looking.') }),
		);

		const result = await runCloudBrowserAgent(makeOptions());

		expect(result).toMatchObject({
			outcome: 'failed',
			summary:
				'The browser agent ran out of steps before it reported a result. Its last message: Still looking.',
		});
	});

	it('gives the agent the MCP tools plus report_result', async () => {
		mcpTools.set('browser_navigate', { name: 'browser_navigate' } as BuiltTool);
		mcpTools.set('browser_click', { name: 'browser_click' } as BuiltTool);
		vi.mocked(executeResumableStream).mockResolvedValue(streamResult());

		await runCloudBrowserAgent(makeOptions());

		expect(agents[0].tools.map((tool) => tool.name)).toEqual([
			'browser_navigate',
			'browser_click',
			'browser_request_user_action',
			'report_result',
		]);
	});

	describe('browser_request_user_action', () => {
		/** Runs the agent, then calls the tool as the model would. */
		async function requestUserAction(
			result: Awaited<ReturnType<CloudBrowserUserActionHost['requestUserAction']>>,
		) {
			vi.mocked(executeResumableStream).mockResolvedValue(streamResult());
			const options = makeOptions();
			vi.mocked(options.userActionHost.requestUserAction).mockResolvedValue(result);
			await runCloudBrowserAgent(options);
			const tool = agents[0].tools.find((t) => t.name === 'browser_request_user_action');
			const output = await tool?.handler?.({ reason: 'Sign in to Acme.' }, {} as never);
			expect(options.userActionHost.requestUserAction).toHaveBeenCalledTimes(1);
			return output;
		}

		it("returns the user's note and what to do next when the user returns control", async () => {
			expect(await requestUserAction({ returned: true, note: 'Signed in' })).toEqual({
				controlReturned: true,
				userNote: 'Signed in',
				next: 'Call browser_snapshot to see the page, then continue.',
			});
		});

		it('leaves out the note when the user gives none', async () => {
			expect(await requestUserAction({ returned: true })).toEqual({
				controlReturned: true,
				next: 'Call browser_snapshot to see the page, then continue.',
			});
		});

		it('returns the error when control does not come back', async () => {
			expect(
				await requestUserAction({ returned: false, error: 'The browser task has ended.' }),
			).toEqual({ controlReturned: false, error: 'The browser task has ended.' });
		});
	});

	it.each([
		['an unknown outcome', { outcome: 'done', summary: '$20 a month' }],
		['an empty summary', { outcome: 'succeeded', summary: '' }],
	])('rejects a report with %s, so the run ends without a report', async (_case, report) => {
		vi.mocked(executeResumableStream).mockImplementation(async () => {
			// Like the agent runtime: the handler runs only for input that matches the schema.
			const reportTool = agents.at(-1)?.tools.find((tool) => tool.name === 'report_result');
			if (!reportTool) throw new Error('report_result tool not found');
			const parsed = (reportTool.inputSchema as ZodType).safeParse(report);
			if (parsed.success) await reportTool.handler?.(parsed.data, {} as never);
			return streamResult();
		});

		const result = await runCloudBrowserAgent(makeOptions());

		expect(result).toMatchObject({
			outcome: 'failed',
			summary: 'The browser agent ended without reporting a result.',
		});
	});

	it('flags every event the agent publishes as detached from its turn', async () => {
		vi.mocked(executeResumableStream).mockResolvedValue(streamResult());
		const options = makeOptions();

		await runCloudBrowserAgent(options);

		const { eventBus } = vi.mocked(executeResumableStream).mock.calls[0][0].context;
		const event = {
			type: 'tool-call',
			runId: 'run-1',
			agentId: 'agent-1',
			payload: { toolCallId: 'call-1', toolName: 'browser_click', args: {} },
		} as const;
		eventBus.publish('thread-1', event);

		expect(options.eventBus.publish).toHaveBeenCalledWith('thread-1', {
			...event,
			detachedFromTurn: true,
		});
	});

	it("passes the user's answer to the resume as resume data", async () => {
		vi.mocked(executeResumableStream).mockResolvedValue(streamResult());
		const options = makeOptions();
		vi.mocked(options.waitForConfirmation).mockResolvedValue({ approved: true });

		await runCloudBrowserAgent(options);

		const { control } = vi.mocked(executeResumableStream).mock.calls[0][0];
		if (control.mode !== 'auto') throw new Error('expected auto resume control');
		await expect(control.waitForConfirmation('request-1')).resolves.toEqual(
			buildResumeData({ approved: true }),
		);
		expect(options.waitForConfirmation).toHaveBeenCalledWith('request-1');
	});

	it('resumes after a card with the same options as the first stream', async () => {
		vi.mocked(executeResumableStream).mockResolvedValue(streamResult());
		const onStepStart = vi.fn();
		const options = makeOptions();

		await runCloudBrowserAgent({
			...options,
			streamOptions: { modelStreamIdleTimeoutMs: 1000, onStepStart },
		});

		const expected = {
			abortSignal: options.abortSignal,
			recoverUsageOnAbort: true,
			// The conversation is cached on every call, also after a card.
			providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } },
			modelStreamIdleTimeoutMs: 1000,
			onStepStart,
		};
		expect(agents[0].stream).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining(expected),
		);
		const { control } = vi.mocked(executeResumableStream).mock.calls[0][0];
		if (control.mode !== 'auto') throw new Error('expected auto resume control');
		expect(
			control.buildResumeOptions?.({
				agentRunId: 'agent-run-2',
				suspension: { toolCallId: 'call-1' } as never,
			}),
		).toEqual({ runId: 'agent-run-2', toolCallId: 'call-1', ...expected });
	});
});

describe('buildTaskMessage', () => {
	it('lists each credential to create with its fields', () => {
		const message = buildTaskMessage({
			goal: 'Save the test login',
			credentialsToCreate: [
				{
					type: 'httpBasicAuth',
					name: 'The Internet test login',
					fields: [
						{ name: 'user', displayName: 'User', type: 'string', required: true },
						{ name: 'password', displayName: 'Password', type: 'string', required: false },
					],
				},
			],
		});

		expect(message).toBe(
			[
				'Goal: Save the test login',
				'',
				'Credentials to create:',
				'- Name: "The Internet test login", type: httpBasicAuth',
				'  Fields: user (User, required), password (Password)',
			].join('\n'),
		);
	});
});
