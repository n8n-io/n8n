import type { ModelMessage } from 'ai';
import { describe, expect, it, vi } from 'vitest';

import { InMemoryFilesystem } from '../../__tests__/workspace/test-utils';
import type { AgentRuntimeConfig } from '../../types/runtime/agent-runtime';
import type { BuiltTool } from '../../types/sdk/tool';
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
