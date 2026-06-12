// Explicit vitest imports: the renderer tsconfig deliberately has `types: []`,
// so the vitest globals are not ambiently typed here.
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { watchAssistantRun } from './run-watcher';
import type { InstanceAiEvent } from '../../shared/types';

// `watchAssistantRun` subscribes through the singleton thread client; capture
// its listeners so tests can drive the event stream directly.
const clientState = vi.hoisted(() => ({
	listeners: [] as Array<(event: InstanceAiEvent) => void>,
}));

vi.mock('../services/thread-client', () => ({
	getThreadClient: () => ({
		listen: (_threadId: string, listener: (event: InstanceAiEvent) => void) => {
			clientState.listeners.push(listener);
		},
		unlisten: vi.fn(),
	}),
}));

function emit(event: InstanceAiEvent) {
	for (const listener of [...clientState.listeners]) listener(event);
}

function outcomeCall(runId: string, args: Record<string, unknown>): InstanceAiEvent {
	return {
		type: 'tool-call',
		runId,
		agentId: 'root',
		payload: { toolName: 'report-desktop-task-outcome', args },
	} as InstanceAiEvent;
}

function runFinish(runId: string, status = 'completed'): InstanceAiEvent {
	return { type: 'run-finish', runId, agentId: 'root', payload: { status } } as InstanceAiEvent;
}

const VALID_ARGS = {
	success: true,
	title: 'Summarize PDF document',
	summary: 'Read the PDF and summarized it.',
};

describe('watchAssistantRun — outcome parsing', () => {
	beforeEach(() => {
		clientState.listeners.length = 0;
	});

	it('returns the parsed outcome of a completed run', async () => {
		const result = watchAssistantRun('thread-1', 'run-1');
		emit(outcomeCall('run-1', { ...VALID_ARGS, icon: '📄' }));
		emit(runFinish('run-1'));

		await expect(result).resolves.toEqual({
			ok: true,
			status: 'success',
			tookAction: false,
			outcome: { ...VALID_ARGS, icon: '📄', details: undefined, failureReason: undefined },
			error: undefined,
		});
	});

	it('passes details through to the outcome', async () => {
		const result = watchAssistantRun('thread-1', 'run-1');
		emit(outcomeCall('run-1', { ...VALID_ARGS, details: '**Key points**\n\n- Revenue grew' }));
		emit(runFinish('run-1'));

		await expect(result).resolves.toMatchObject({
			outcome: { details: '**Key points**\n\n- Revenue grew' },
		});
	});

	it('drops a malformed or blank details value without invalidating the outcome', async () => {
		const result = watchAssistantRun('thread-1', 'run-1');
		emit(outcomeCall('run-1', { ...VALID_ARGS, details: 42 }));
		emit(runFinish('run-1'));

		const run = await result;
		expect(run.outcome?.title).toBe(VALID_ARGS.title);
		expect(run.outcome?.details).toBeUndefined();

		clientState.listeners.length = 0;
		const blankResult = watchAssistantRun('thread-1', 'run-2');
		emit(outcomeCall('run-2', { ...VALID_ARGS, details: '   ' }));
		emit(runFinish('run-2'));

		const blankRun = await blankResult;
		expect(blankRun.outcome?.title).toBe(VALID_ARGS.title);
		expect(blankRun.outcome?.details).toBeUndefined();
	});

	it('discards an outcome report missing its required fields', async () => {
		const result = watchAssistantRun('thread-1', 'run-1');
		emit(outcomeCall('run-1', { success: true, summary: 'No title given' }));
		emit(runFinish('run-1'));

		await expect(result).resolves.toMatchObject({ ok: true, outcome: undefined });
	});

	it('counts other tool calls as action but not the outcome report itself', async () => {
		const result = watchAssistantRun('thread-1', 'run-1');
		emit({
			type: 'tool-call',
			runId: 'run-1',
			agentId: 'root',
			payload: { toolName: 'read_file', args: {} },
		} as InstanceAiEvent);
		emit(outcomeCall('run-1', VALID_ARGS));
		emit(runFinish('run-1'));

		await expect(result).resolves.toMatchObject({ tookAction: true });
	});

	it('ignores events from other runs', async () => {
		const result = watchAssistantRun('thread-1', 'run-1');
		emit(outcomeCall('other-run', { ...VALID_ARGS, details: 'not ours' }));
		emit(runFinish('other-run'));
		emit(runFinish('run-1', 'failed'));

		await expect(result).resolves.toMatchObject({
			ok: false,
			status: 'error',
			outcome: undefined,
		});
	});
});
