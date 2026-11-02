import type { ModelMessage } from 'ai';
import { describe, expect, it, vi } from 'vitest';

import type { AgentRuntimeConfig } from '../../types/runtime/agent-runtime';
import type { BuiltTool } from '../../types/sdk/tool';
import { MemoryOrchestrator } from '../memory/memory-orchestrator';
import { InMemoryMemory } from '../memory/memory-store';
import { AgentMessageList } from '../model/message-list';
import { fromAiMessages } from '../model/messages';
import { BackgroundTaskTracker } from '../state/background-task-tracker';
import { AgentEventBus } from '../state/event-bus';
import { RuntimeTelemetry } from '../telemetry/runtime-telemetry';
import { ToolCallRunner } from '../tools/tool-call-runner';

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
