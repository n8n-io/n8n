import type { OnStepFinishEvent, OnStepStartEvent } from 'ai';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { Logger } from '../../logger';
import {
	RunDebugBuffer,
	buildRunDebugLabel,
	createRunDebugStepHooks,
	sanitizeStepFinish,
	sanitizeStepStart,
} from '../run-debug-buffer';
import { sanitizeDebugSnapshotValue } from '../sanitize-debug-snapshot';

function makeFinishEvent(text: string): OnStepFinishEvent {
	return {
		stepNumber: 0,
		text,
		toolCalls: [],
		finishReason: 'tool-calls',
		usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3 },
		response: {
			modelId: 'test-model',
			timestamp: new Date('2026-01-01T00:00:00.000Z'),
			messages: [{ role: 'assistant', content: text }],
		},
	} as unknown as OnStepFinishEvent;
}

function makeStartEvent(): OnStepStartEvent {
	return {
		stepNumber: 0,
		system: 'You are helpful',
		messages: [{ role: 'user', content: 'hello' }],
		tools: { search: { description: 'search', inputSchema: { type: 'object' } } },
		toolChoice: 'auto',
		activeTools: ['search'],
		abortSignal: new AbortController().signal,
	} as unknown as OnStepStartEvent;
}

describe('RunDebugBuffer', () => {
	it('pairs step start and finish by run-scoped step index', () => {
		const buffer = new RunDebugBuffer();
		buffer.ensure('run-1', 'thread-1');

		buffer.recordStepStart('run-1', 0, makeStartEvent());
		buffer.recordStepFinish('run-1', 0, makeFinishEvent('done'));

		const record = buffer.get('run-1');
		expect(record?.steps).toHaveLength(1);
		expect(record?.steps[0]?.stepNumber).toBe(0);
		expect(record?.steps[0]?.input?.messages).toBeDefined();
		expect(record?.steps[0]?.output?.text).toBe('done');
	});

	it('records multiple orchestrator iterations even when SDK stepNumber stays 0', () => {
		const buffer = new RunDebugBuffer();
		buffer.ensure('run-1', 'thread-1');
		const hooks = createRunDebugStepHooks(buffer, { runId: 'run-1', threadId: 'thread-1' });

		for (const label of ['first', 'second', 'third']) {
			hooks.onStepStart(makeStartEvent());
			hooks.onStepFinish(makeFinishEvent(label));
		}

		const record = buffer.get('run-1');
		expect(record?.steps).toHaveLength(3);
		expect(record?.steps.map((step) => step.stepNumber)).toEqual([0, 1, 2]);
		expect(record?.steps.map((step) => step.output?.text)).toEqual(['first', 'second', 'third']);
	});

	it('continues step numbering after resume hooks are recreated', () => {
		const buffer = new RunDebugBuffer();
		buffer.ensure('run-1', 'thread-1');

		const firstPass = createRunDebugStepHooks(buffer, { runId: 'run-1', threadId: 'thread-1' });
		firstPass.onStepStart(makeStartEvent());
		firstPass.onStepFinish(makeFinishEvent('before suspend'));

		const resumePass = createRunDebugStepHooks(buffer, { runId: 'run-1', threadId: 'thread-1' });
		resumePass.onStepStart(makeStartEvent());
		resumePass.onStepFinish(makeFinishEvent('after resume'));

		const record = buffer.get('run-1');
		expect(record?.steps).toHaveLength(2);
		expect(record?.steps[1]?.stepNumber).toBe(1);
		expect(record?.steps[1]?.output?.text).toBe('after resume');
	});

	it('keeps full tool definitions and strips abortSignal from step start', () => {
		const sanitized = sanitizeStepStart(
			{
				stepNumber: 1,
				system: 'system prompt',
				messages: [{ role: 'user', content: 'hello' }],
				tools: {
					search: { description: 'search', inputSchema: { type: 'object', properties: { q: {} } } },
				},
				toolChoice: 'auto',
				activeTools: ['search'],
				abortSignal: new AbortController().signal,
			} as unknown as OnStepStartEvent,
			4,
		);

		expect(sanitized.stepNumber).toBe(4);
		expect(sanitized.sdkStepNumber).toBe(1);
		expect(sanitized.activeTools).toEqual(['search']);
		expect(sanitized.tools).toEqual({
			search: { description: 'search', inputSchema: { type: 'object', properties: { q: {} } } },
		});
		expect(sanitized).not.toHaveProperty('abortSignal');
	});

	it('does not truncate long captured strings', () => {
		const longSystem = 'x'.repeat(5_000);
		const sanitized = sanitizeDebugSnapshotValue(longSystem);
		expect(sanitized).toHaveLength(5_000);
	});

	it('captures full tool call inputs and outputs on step finish', () => {
		const sanitized = sanitizeStepFinish(
			{
				stepNumber: 0,
				text: '',
				toolCalls: [
					{
						toolCallId: 'tc-1',
						toolName: 'build-workflow',
						input: { code: 'full workflow code payload' },
					},
				],
				toolResults: [
					{
						toolCallId: 'tc-1',
						toolName: 'build-workflow',
						output: { success: true, workflowId: 'wf-1' },
					},
				],
				finishReason: 'tool-calls',
				usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3 },
				response: {
					modelId: 'test-model',
					timestamp: new Date('2026-01-01T00:00:00.000Z'),
					messages: [{ role: 'assistant', content: '' }],
					body: { secret: 'raw-provider-body' },
				},
			} as unknown as OnStepFinishEvent,
			0,
		);

		expect(sanitized.toolCalls).toEqual([
			{
				toolCallId: 'tc-1',
				toolName: 'build-workflow',
				input: { code: 'full workflow code payload' },
			},
		]);
		expect(sanitized.toolResults).toEqual([
			{
				toolCallId: 'tc-1',
				toolName: 'build-workflow',
				output: { success: true, workflowId: 'wf-1' },
			},
		]);
		expect(sanitized.response).not.toHaveProperty('body');
	});

	it('evicts oldest run when cap is exceeded', () => {
		const logger = mock<Logger>();
		const buffer = new RunDebugBuffer(logger);

		for (let index = 0; index < 51; index++) {
			const runId = `run-${index}`;
			buffer.ensure(runId, 'thread-1');
			buffer.recordStepStart(runId, 0, {
				stepNumber: 0,
				messages: [],
			} as unknown as OnStepStartEvent);
		}

		expect(buffer.get('run-0')).toBeUndefined();
		expect(buffer.get('run-50')).toBeDefined();
		expect(logger.warn).toHaveBeenCalled();
	});

	it('createRunDebugStepHooks writes into the buffer', () => {
		const buffer = new RunDebugBuffer();
		buffer.ensure('run-1', 'thread-1');
		const hooks = createRunDebugStepHooks(buffer, { runId: 'run-1', threadId: 'thread-1' });

		hooks.onStepStart({
			stepNumber: 2,
			messages: [{ role: 'user', content: 'ping' }],
		} as unknown as OnStepStartEvent);

		expect(buffer.get('run-1')?.steps[0]?.stepNumber).toBe(0);
		expect(buffer.get('run-1')?.steps[0]?.input?.sdkStepNumber).toBe(2);
	});

	it('stores a run label on first ensure', () => {
		const buffer = new RunDebugBuffer();
		buffer.ensure('run-1', 'thread-1', 'build a weather workflow');
		expect(buffer.get('run-1')?.label).toBe('build a weather workflow');
		buffer.ensure('run-1', 'thread-1', 'ignored');
		expect(buffer.get('run-1')?.label).toBe('build a weather workflow');
	});
});

describe('buildRunDebugLabel', () => {
	it('uses the user message when no resume reason is provided', () => {
		expect(buildRunDebugLabel({ message: 'build a simple workflow' })).toBe(
			'build a simple workflow',
		);
	});

	it('maps resume reasons to action labels', () => {
		expect(buildRunDebugLabel({ resumeReason: 'approval' })).toBe('Resume · approval');
		expect(buildRunDebugLabel({ resumeReason: 'replan' })).toBe('Follow-up · replan');
	});
});
