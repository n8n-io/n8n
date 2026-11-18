import type { ModelMessage } from 'ai';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { InMemoryFilesystem } from '../../__tests__/workspace/test-utils';
import type { AgentRuntimeConfig } from '../../types/runtime/agent-runtime';
import type { PreToolExecution, PreToolExecutionContext } from '../../types/sdk/pre-tool-execution';
import type { BuiltTool } from '../../types/sdk/tool';
import type { JSONValue } from '../../types/utils/json';
import { MemoryOrchestrator } from '../memory/memory-orchestrator';
import { InMemoryMemory } from '../memory/memory-store';
import { AgentMessageList } from '../model/message-list';
import { fromAiMessages } from '../model/messages';
import { estimateObservationTokens } from '../model/model-token-counter';
import { BackgroundTaskTracker } from '../state/background-task-tracker';
import { AgentEventBus } from '../state/event-bus';
import { RuntimeTelemetry } from '../telemetry/runtime-telemetry';
import { ToolCallRunner } from '../tools/tool-call-runner';
import { MAX_MODEL_TOOL_RESULT_TOKENS } from '../tools/tool-result-guard';

describe('ToolCallRunner large results', () => {
	it.each(['writable', 'missing', 'read-only', 'failed'] as const)(
		'guards an uninterrupted custom tool result with %s storage',
		async (storageMode) => {
			const filesystem = Object.assign(new InMemoryFilesystem(), {
				readOnly: storageMode === 'read-only',
			});
			const writeFile = vi.spyOn(filesystem, 'writeFile');
			if (storageMode === 'failed') writeFile.mockRejectedValue(new Error('Storage unavailable'));
			const output = 'x'.repeat(400_000);
			const tool: BuiltTool = {
				name: 'large_result',
				description: 'Return a large result',
				handler: vi.fn().mockResolvedValue(output),
			};
			const list = new AgentMessageList();
			list.addResponse(
				fromAiMessages([
					{
						role: 'assistant',
						content: [{ type: 'tool-call', toolCallId: 'tc-1', toolName: tool.name, input: {} }],
					},
				]),
			);
			const tokenCounter = (text: string) => Math.ceil(text.length / 5);
			const runner = new ToolCallRunner({
				eventBus: new AgentEventBus(),
				telemetry: new RuntimeTelemetry({
					name: 'test-agent',
					model: 'openai/gpt-5',
					instructions: '',
				}),
				concurrency: 1,
				onCancelled: vi.fn(),
				tokenCounter,
				workspaceFilesystem: storageMode === 'missing' ? undefined : filesystem,
			});

			const result = await runner.processToolCall({
				toolName: tool.name,
				toolCallId: 'tc-1',
				input: {},
				toolMap: new Map([[tool.name, tool]]),
				list,
				runId: 'run-1',
			});

			if (result.outcome !== 'success') throw new Error('Expected a successful tool call');
			expect(result.toolEntry.output).toBe(output);
			expect(result.modelOutput).toMatchObject({
				originalCharCount: JSON.stringify(output).length,
				...(storageMode === 'writable'
					? { _offloaded: true }
					: {
							_truncated: true,
							head: expect.stringMatching(/^"x+$/),
							tail: expect.stringMatching(/^x+"$/),
						}),
			});
			expect(list.responseDelta()).toMatchObject([
				{ content: [{ type: 'tool-call', state: 'resolved', output: result.modelOutput }] },
			]);
			expect(tokenCounter(JSON.stringify(result.modelOutput))).toBeLessThanOrEqual(
				MAX_MODEL_TOOL_RESULT_TOKENS,
			);
			if (storageMode !== 'writable') {
				const envelope = result.modelOutput as { head: string; tail: string };
				expect(envelope.head.length + envelope.tail.length).toBeGreaterThan(200_000);
			}
			expect(runner.hasOffloadedToolResults).toBe(storageMode === 'writable');
			expect(writeFile).toHaveBeenCalledTimes(
				storageMode === 'writable' || storageMode === 'failed' ? 1 : 0,
			);
			if (storageMode === 'writable') {
				expect(writeFile).toHaveBeenCalledExactlyOnceWith(
					expect.any(String),
					JSON.stringify(output),
					expect.objectContaining({ recursive: true, overwrite: true }),
				);
			}
		},
	);

	it.each([false, true])(
		'preserves a large result within the token limit with storage available: %s',
		async (storageAvailable) => {
			const filesystem = new InMemoryFilesystem();
			const writeFile = vi.spyOn(filesystem, 'writeFile');
			const output = ' '.repeat(5_200_000);
			const tool: BuiltTool = {
				name: 'large_result',
				description: 'Return a large result',
				handler: vi.fn().mockResolvedValue(output),
			};
			const list = new AgentMessageList();
			list.addResponse(
				fromAiMessages([
					{
						role: 'assistant',
						content: [{ type: 'tool-call', toolCallId: 'tc-1', toolName: tool.name, input: {} }],
					},
				]),
			);
			const runner = new ToolCallRunner({
				eventBus: new AgentEventBus(),
				telemetry: new RuntimeTelemetry({
					name: 'test-agent',
					model: 'openai/gpt-5',
					instructions: '',
				}),
				concurrency: 1,
				onCancelled: vi.fn(),
				tokenCounter: estimateObservationTokens,
				workspaceFilesystem: storageAvailable ? filesystem : undefined,
			});

			const result = await runner.processToolCall({
				toolName: tool.name,
				toolCallId: 'tc-1',
				input: {},
				toolMap: new Map([[tool.name, tool]]),
				list,
				runId: 'run-1',
			});

			if (result.outcome !== 'success') throw new Error('Expected a successful tool call');
			expect(runner.hasOffloadedToolResults).toBe(false);
			expect(typeof result.modelOutput).toBe('string');
			expect(result.modelOutput).toBe(output);
			expect(result.toolEntry.output).toBe(output);
			expect(list.responseDelta()).toMatchObject([
				{ content: [{ type: 'tool-call', state: 'resolved', output }] },
			]);
			expect(writeFile).not.toHaveBeenCalled();
		},
		35_000,
	);
});

describe('ToolCallRunner error budgeting', () => {
	it.each(['local handler', 'SDK error-text'] as const)(
		'guards an oversized error from %s before memory-budget counting',
		async (source) => {
			// AGENT-1442: SDK-rejected local calls need the ordinary error-size guard.
			const error = 'Synthetic parser error: ' + ' \t'.repeat(32_000);
			const toolName = 'synthetic_tool';
			const toolCallId = 'synthetic_call';
			const sdkMessages: ModelMessage[] = [
				{
					role: 'assistant',
					content: [{ type: 'tool-call', toolCallId, toolName, input: {} }],
				},
			];
			if (source === 'SDK error-text') {
				sdkMessages.push({
					role: 'tool',
					content: [
						{
							type: 'tool-result',
							toolCallId,
							toolName,
							output: { type: 'error-text', value: error },
						},
					],
				});
			}
			const list = new AgentMessageList();
			list.addResponse(fromAiMessages(sdkMessages));
			const handler = vi
				.fn<NonNullable<BuiltTool['handler']>>()
				.mockRejectedValue(new Error(error));
			const tool: BuiltTool = { name: toolName, description: 'Synthetic tool', handler };
			const observe = vi.fn(async () => await Promise.resolve('No observation expected'));
			const config: AgentRuntimeConfig = {
				name: 'test-agent',
				model: 'openai/gpt-5',
				instructions: '',
				memory: new InMemoryMemory(),
				observationalMemory: {
					observerThresholdTokens: 100_000,
					observationLogTailLimit: 20,
					observe,
				},
			};
			const eventBus = new AgentEventBus();
			const telemetry = new RuntimeTelemetry(config);
			// A character-based estimate forces the size guard without a real tokenizer.
			const guardCounter = vi.fn((text: string) => text.length);
			const runner = new ToolCallRunner({
				eventBus,
				telemetry,
				concurrency: 1,
				onCancelled: vi.fn(),
				tokenCounter: guardCounter,
			});

			await runner.processToolCall({
				toolName,
				toolCallId,
				input: {},
				toolMap: new Map([[toolName, tool]]),
				list,
				runId: 'synthetic_run',
			});

			const budgetCounter = vi.fn<(text: string) => number>().mockReturnValue(1);
			const tracker = new BackgroundTaskTracker();
			const memory = new MemoryOrchestrator(config, tracker, eventBus, telemetry, budgetCounter);
			const options = {
				persistence: { threadId: 'synthetic_thread', resourceId: 'synthetic_user' },
			};
			await memory.maybeObserveMidRun(list, options);
			await memory.maybeObserveMidRun(list, options);

			expect(handler).toHaveBeenCalledTimes(source === 'local handler' ? 1 : 0);
			expect(observe).not.toHaveBeenCalled();
			expect(tracker.pendingCount).toBe(0);
			// The second budget estimate must use the per-message cache.
			expect(budgetCounter).toHaveBeenCalledTimes(1);
			const budgetText = budgetCounter.mock.calls[0][0];
			expect.soft(guardCounter.mock.calls.length).toBeGreaterThan(0);
			expect.soft(budgetText.includes(error)).toBe(false);
			expect(budgetText.includes('\t')).toBe(false);
		},
	);
});

describe('ToolCallRunner guardrail after-stage stop', () => {
	function makeRunner() {
		const config: AgentRuntimeConfig = {
			name: 'test-agent',
			model: 'openai/gpt-5',
			instructions: '',
			memory: new InMemoryMemory(),
		};
		return {
			config,
			runner: new ToolCallRunner({
				eventBus: new AgentEventBus(),
				telemetry: new RuntimeTelemetry(config),
				concurrency: 1,
				onCancelled: vi.fn(),
				tokenCounter: vi.fn((text: string) => text.length),
			}),
		};
	}

	function makeCall(tool: BuiltTool) {
		const toolName = tool.name;
		const sdkMessages: ModelMessage[] = [
			{
				role: 'assistant',
				content: [{ type: 'tool-call', toolCallId: 'call-1', toolName, input: {} }],
			},
		];
		const list = new AgentMessageList();
		list.addResponse(fromAiMessages(sdkMessages));
		return {
			toolName,
			list,
			params: {
				toolName,
				toolCallId: 'call-1',
				input: {},
				toolMap: new Map([[toolName, tool]]),
				list,
				runId: 'run-1',
			},
		};
	}

	it('turns an afterTool stop into a tool-error outcome', async () => {
		const handler = vi
			.fn<NonNullable<BuiltTool['handler']>>()
			.mockResolvedValue('a result with a http://evil.example link');
		const tool: BuiltTool = { name: 'fetch_page', description: 'Synthetic tool', handler };
		const { runner } = makeRunner();
		const { params } = makeCall(tool);

		const outcome = await runner.processToolCall({
			...params,
			guardrails: {
				hooks: [
					{
						afterTool: async () => ({ action: 'stop' as const, code: 'guardrail.urls.g1' }),
					},
				],
			},
		});

		expect(outcome).toMatchObject({
			outcome: 'error',
			error: expect.stringContaining('Tool result blocked by guardrail: guardrail.urls.g1'),
		});
		// The tool ran; only its result is refused.
		expect(handler).toHaveBeenCalledTimes(1);
	});

	it('keeps the success outcome when the after-stage hook only observes', async () => {
		const handler = vi.fn<NonNullable<BuiltTool['handler']>>().mockResolvedValue('clean result');
		const tool: BuiltTool = { name: 'fetch_page', description: 'Synthetic tool', handler };
		const { runner } = makeRunner();
		const { params } = makeCall(tool);

		const outcome = await runner.processToolCall({
			...params,
			guardrails: {
				hooks: [{ afterTool: async () => await Promise.resolve(undefined) }],
			},
		});

		expect(outcome).toMatchObject({ outcome: 'success' });
		expect(handler).toHaveBeenCalledTimes(1);
	});
});

describe('ToolCallRunner preToolExecution', () => {
	const refusal = { isPolicyRefusal: true, message: 'Not allowed' };
	const allow: PreToolExecution = async () => await Promise.resolve({ allow: true });
	const deny: PreToolExecution = async () =>
		await Promise.resolve({ allow: false, result: refusal });

	function makeRunner(preToolExecution: PreToolExecution) {
		return new ToolCallRunner({
			eventBus: new AgentEventBus(),
			telemetry: new RuntimeTelemetry({
				name: 'test-agent',
				model: 'openai/gpt-5',
				instructions: '',
			}),
			concurrency: 1,
			onCancelled: vi.fn(),
			tokenCounter: vi.fn((text: string) => text.length),
			preToolExecution,
		});
	}

	function makeCall(tools: BuiltTool[], call: { toolName: string; input?: JSONValue }) {
		const input = call.input ?? {};
		const list = new AgentMessageList();
		list.addResponse(
			fromAiMessages([
				{
					role: 'assistant',
					content: [{ type: 'tool-call', toolCallId: 'call-1', toolName: call.toolName, input }],
				},
			]),
		);
		return {
			toolName: call.toolName,
			toolCallId: 'call-1',
			input,
			toolMap: new Map(tools.map((tool) => [tool.name, tool])),
			list,
			runId: 'run-1',
		};
	}

	const makeHandler = () => vi.fn<NonNullable<BuiltTool['handler']>>().mockResolvedValue('done');

	it.each<{ kind: string; identity: Partial<BuiltTool> }>([
		{ kind: 'node', identity: { metadata: { kind: 'node', nodeType: 'n8n-nodes-base.slack' } } },
		{
			kind: 'MCP',
			identity: { mcpTool: true, mcpServerName: 'crm', mcpToolName: 'send' },
		},
	])(
		'gives the hook the $kind tool, the validated input and the run identity',
		async ({ identity }) => {
			const handler = makeHandler();
			const tool: BuiltTool = {
				name: 'send_message',
				description: 'Send a message',
				inputSchema: z.object({ channel: z.string().default('general') }),
				handler,
				...identity,
			};
			const hook = vi.fn(allow);
			const persistence = { threadId: 'thread-1', resourceId: 'user-1' };

			const outcome = await makeRunner(hook).processToolCall({
				...makeCall([tool], { toolName: tool.name }),
				persistence,
			});

			expect(outcome).toMatchObject({ outcome: 'success' });
			expect(handler).toHaveBeenCalledTimes(1);
			expect(hook).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					toolCallId: 'call-1',
					runId: 'run-1',
					input: { channel: 'general' },
					resumed: false,
					persistence,
				}),
			);
			const { tool: target } = hook.mock.calls[0][0];
			const { mcpTool: _, ...expectedIdentity } = identity;
			expect(target).toEqual({ name: tool.name, ...expectedIdentity });
		},
	);

	it('gives the hook the target of a dispatched call', async () => {
		const handler = makeHandler();
		const target: BuiltTool = { name: 'send_message', description: 'Send a message', handler };
		const dispatcher: BuiltTool = {
			name: 'call_tool',
			description: 'Run a tool from the tool catalog',
			handler: makeHandler(),
			dispatch: {
				resolve: (input) => ({ tool: target, input: (input as { arguments: unknown }).arguments }),
				wrap: () => undefined,
			},
		};
		let runToolCalls: ReturnType<PreToolExecutionContext['runToolCalls']> = [];
		const hook = vi.fn<PreToolExecution>(async (ctx) => {
			runToolCalls = ctx.runToolCalls();
			return await allow(ctx);
		});

		await makeRunner(hook).processToolCall(
			makeCall([dispatcher], {
				toolName: dispatcher.name,
				input: { tool: target.name, arguments: { text: 'hi' } },
			}),
		);

		// The history names the tool that runs, the same as `tool` does.
		expect(runToolCalls).toMatchObject([
			{ toolCallId: 'call-1', toolName: 'send_message', input: { text: 'hi' } },
		]);

		expect(hook).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				tool: { name: 'send_message', dispatchedBy: 'call_tool' },
				input: { text: 'hi' },
			}),
		);
		expect(handler).toHaveBeenCalledExactlyOnceWith({ text: 'hi' }, expect.anything());
	});

	it('returns the result of a denial and does not run the handler', async () => {
		const handler = makeHandler();
		const onCancellation = vi.fn();
		const tool: BuiltTool = { name: 'send_message', description: '', handler, onCancellation };
		const call = makeCall([tool], { toolName: tool.name });

		const outcome = await makeRunner(deny).processToolCall(call);

		expect(outcome).toMatchObject({
			outcome: 'success',
			modelOutput: refusal,
			toolEntry: { tool: tool.name, output: refusal },
		});
		expect(handler).not.toHaveBeenCalled();
		// The call never started, so there is nothing to clean up.
		expect(onCancellation).not.toHaveBeenCalled();
		expect(call.list.responseDelta()).toMatchObject([
			{ content: [{ type: 'tool-call', state: 'resolved', output: refusal }] },
		]);
	});

	it('does not run the handler when the hook throws', async () => {
		const handler = makeHandler();
		const tool: BuiltTool = { name: 'send_message', description: '', handler };
		const hook: PreToolExecution = async () =>
			await Promise.reject(new Error('policy store is down'));

		const outcome = await makeRunner(hook).processToolCall(
			makeCall([tool], { toolName: tool.name }),
		);

		expect(outcome).toMatchObject({ outcome: 'error' });
		expect(handler).not.toHaveBeenCalled();
	});

	describe('for a call that resumes', () => {
		function makeSuspendedTool(overrides: Partial<BuiltTool> = {}): BuiltTool {
			return {
				name: 'send_message',
				description: '',
				suspendSchema: z.object({ reason: z.string() }),
				resumeSchema: z.object({ approved: z.boolean() }),
				handler: makeHandler(),
				...overrides,
			};
		}

		const resumeParams = {
			previouslySuspended: true,
			resumeData: { approved: true },
			suspendPayload: { reason: 'needs approval' },
		};

		it('runs the hook again', async () => {
			const tool = makeSuspendedTool();
			const hook = vi.fn(allow);

			await makeRunner(hook).processToolCall({
				...makeCall([tool], { toolName: tool.name }),
				...resumeParams,
			});

			expect(hook).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ resumed: true }));
			expect(tool.handler).toHaveBeenCalledTimes(1);
		});

		it('cleans up a call that is denied', async () => {
			const onCancellation = vi.fn();
			const tool = makeSuspendedTool({ onCancellation });

			const outcome = await makeRunner(deny).processToolCall({
				...makeCall([tool], { toolName: tool.name }),
				...resumeParams,
			});

			expect(outcome).toMatchObject({ outcome: 'success', modelOutput: refusal });
			expect(tool.handler).not.toHaveBeenCalled();
			expect(onCancellation).toHaveBeenCalledExactlyOnceWith(
				{},
				expect.objectContaining({ suspendPayload: resumeParams.suspendPayload }),
			);
		});

		it('keeps the call pending when the hook throws', async () => {
			const onCancellation = vi.fn();
			const tool = makeSuspendedTool({ onCancellation });
			const hook: PreToolExecution = async () =>
				await Promise.reject(new Error('policy store is down'));

			const outcome = await makeRunner(hook).processToolCall({
				...makeCall([tool], { toolName: tool.name }),
				...resumeParams,
			});

			expect(outcome).toEqual({ outcome: 'retryable-error' });
			expect(tool.handler).not.toHaveBeenCalled();
			expect(onCancellation).not.toHaveBeenCalled();
		});

		it('keeps the call pending when the cleanup of a denied call fails', async () => {
			const tool = makeSuspendedTool({
				onCancellation: vi.fn().mockRejectedValue(new Error('cleanup failed')),
			});

			const outcome = await makeRunner(deny).processToolCall({
				...makeCall([tool], { toolName: tool.name }),
				...resumeParams,
			});

			expect(outcome).toEqual({ outcome: 'retryable-error' });
			expect(tool.handler).not.toHaveBeenCalled();
		});
	});

	it('lists the tool calls of the run so far', async () => {
		const tool: BuiltTool = { name: 'send_message', description: '', handler: makeHandler() };
		const call = makeCall([tool], { toolName: tool.name });
		const toolCallMessage = (toolCallId: string, toolName: string) =>
			fromAiMessages([
				{ role: 'assistant', content: [{ type: 'tool-call', toolCallId, toolName, input: {} }] },
			]);
		const list = new AgentMessageList();
		list.addResponse(toolCallMessage('call-0', 'lookup'));
		list.setToolCallResult('call-0', { found: true });
		list.addResponse(toolCallMessage('call-1', tool.name));
		let runToolCalls: ReturnType<PreToolExecutionContext['runToolCalls']> = [];
		const hook: PreToolExecution = async (ctx) => {
			runToolCalls = ctx.runToolCalls();
			return await allow(ctx);
		};

		await makeRunner(hook).processToolCall({ ...call, list });

		expect(runToolCalls).toMatchObject([
			{ toolCallId: 'call-0', toolName: 'lookup', state: 'resolved', output: { found: true } },
			{ toolCallId: 'call-1', toolName: 'send_message', state: 'pending' },
		]);
	});
});
