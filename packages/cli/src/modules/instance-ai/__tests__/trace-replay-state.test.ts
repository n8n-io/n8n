import { z } from 'zod';

jest.mock('@n8n/instance-ai', () => ({
	createMemory: jest.fn(),
	workflowLoopStateSchema: z.string(),
	attemptRecordSchema: z.object({}),
	workflowBuildOutcomeSchema: z.string(),
	buildAgentTreeFromEvents: jest.fn(),
	TraceIndex: jest.fn().mockImplementation(() => ({
		next: jest.fn(),
	})),
	IdRemapper: jest.fn().mockImplementation(() => ({
		learn: jest.fn(),
		remapInput: jest.fn(),
		remapOutput: jest.fn(),
	})),
	TraceWriter: jest.fn().mockImplementation(() => ({
		recordToolCall: jest.fn(),
		getEvents: jest.fn().mockReturnValue([]),
		toJsonl: jest.fn().mockReturnValue(''),
	})),
}));

import type { InstanceAiTraceContext } from '@n8n/instance-ai';

import { TraceReplayState } from '../trace-replay-state';

describe('TraceReplayState', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
		jest.clearAllMocks();
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	describe('loadEvents / getEvents', () => {
		it('should store and retrieve events by slug', () => {
			const state = new TraceReplayState();
			const events = [{ kind: 'header' }, { kind: 'tool-call' }];

			state.loadEvents('test-slug', events);

			expect(state.getEvents('test-slug')).toEqual(events);
		});

		it('should return empty array for unknown slug', () => {
			const state = new TraceReplayState();

			expect(state.getEvents('unknown')).toEqual([]);
		});

		it('should set active slug when loading', () => {
			const state = new TraceReplayState();

			state.loadEvents('test-slug', []);

			expect(state.getActiveSlug()).toBe('test-slug');
		});
	});

	describe('activateSlug / getActiveSlug', () => {
		it('should set and get the active slug', () => {
			const state = new TraceReplayState();

			state.activateSlug('my-test');

			expect(state.getActiveSlug()).toBe('my-test');
		});

		it('should return undefined initially', () => {
			const state = new TraceReplayState();

			expect(state.getActiveSlug()).toBeUndefined();
		});
	});

	describe('clearEvents', () => {
		it('should remove events for the slug', () => {
			const state = new TraceReplayState();
			state.loadEvents('test-slug', [{ kind: 'header' }]);

			state.clearEvents('test-slug');

			expect(state.getEvents('test-slug')).toEqual([]);
		});

		it('should clear active slug if it matches', () => {
			const state = new TraceReplayState();
			state.loadEvents('test-slug', []);

			state.clearEvents('test-slug');

			expect(state.getActiveSlug()).toBeUndefined();
		});

		it('should not clear active slug if different', () => {
			const state = new TraceReplayState();
			state.loadEvents('slug-a', []);
			state.activateSlug('slug-b');

			state.clearEvents('slug-a');

			expect(state.getActiveSlug()).toBe('slug-b');
		});
	});

	describe('preserveWriterEvents', () => {
		it('should append events to existing slug store', () => {
			const state = new TraceReplayState();
			state.loadEvents('slug', [{ kind: 'header' }]);

			state.preserveWriterEvents('slug', [{ kind: 'tool-call' }]);

			expect(state.getEvents('slug')).toHaveLength(2);
		});

		it('should create new entry if slug has no events', () => {
			const state = new TraceReplayState();

			state.preserveWriterEvents('new-slug', [{ kind: 'tool-call' }]);

			expect(state.getEvents('new-slug')).toHaveLength(1);
		});
	});

	describe('getEventsWithWriterFallback', () => {
		it('should return events from active writers if available', () => {
			const state = new TraceReplayState();
			const writerEvents = [{ kind: 'tool-call', stepId: 1 }];
			const entries = [
				{
					traceSlug: 'my-slug',
					tracing: { traceWriter: { getEvents: () => writerEvents } },
				},
			];

			const result = state.getEventsWithWriterFallback(
				'my-slug',
				entries as Iterable<{ traceSlug?: string; tracing: InstanceAiTraceContext }>,
			);

			expect(result).toEqual(writerEvents);
		});

		it('should fall back to preserved events when no writers match', () => {
			const state = new TraceReplayState();
			state.loadEvents('my-slug', [{ kind: 'header' }]);

			const result = state.getEventsWithWriterFallback('my-slug', []);

			expect(result).toEqual([{ kind: 'header' }]);
		});

		it('should skip entries with non-matching slug', () => {
			const state = new TraceReplayState();
			state.loadEvents('my-slug', [{ kind: 'header' }]);
			const entries = [
				{
					traceSlug: 'other-slug',
					tracing: { traceWriter: { getEvents: () => [{ kind: 'tool-call' }] } },
				},
			];

			const result = state.getEventsWithWriterFallback(
				'my-slug',
				entries as Iterable<{ traceSlug?: string; tracing: InstanceAiTraceContext }>,
			);

			expect(result).toEqual([{ kind: 'header' }]);
		});

		it('should skip entries without traceWriter', () => {
			const state = new TraceReplayState();
			state.loadEvents('my-slug', [{ kind: 'header' }]);
			const entries = [{ traceSlug: 'my-slug', tracing: {} }];

			const result = state.getEventsWithWriterFallback(
				'my-slug',
				entries as Iterable<{ traceSlug?: string; tracing: InstanceAiTraceContext }>,
			);

			expect(result).toEqual([{ kind: 'header' }]);
		});
	});

	describe('configureReplayMode', () => {
		it('should do nothing when env var is not set', async () => {
			delete process.env.E2E_TESTS;
			const state = new TraceReplayState();
			const tracing = {} as Record<string, unknown>;

			await state.configureReplayMode(tracing as unknown as InstanceAiTraceContext);

			expect(tracing.replayMode).toBeUndefined();
		});

		it('should set replay mode when events are loaded', async () => {
			process.env.E2E_TESTS = 'true';
			const state = new TraceReplayState();
			state.loadEvents('test', [{ kind: 'header' }, { kind: 'tool-call' }]);
			const tracing = {} as Record<string, unknown>;

			await state.configureReplayMode(tracing as unknown as InstanceAiTraceContext);

			expect(tracing.replayMode).toBe('replay');
			expect(tracing.traceIndex).toBeDefined();
			expect(tracing.idRemapper).toBeDefined();
		});

		it('should set record mode when no events are loaded', async () => {
			process.env.E2E_TESTS = 'true';
			const state = new TraceReplayState();
			state.activateSlug('test');
			const tracing = {} as Record<string, unknown>;

			await state.configureReplayMode(tracing as unknown as InstanceAiTraceContext);

			expect(tracing.replayMode).toBe('record');
			expect(tracing.traceWriter).toBeDefined();
		});

		it('should reuse shared TraceIndex/IdRemapper for same slug', async () => {
			process.env.E2E_TESTS = 'true';
			const state = new TraceReplayState();
			state.loadEvents('test', [{ kind: 'header' }]);

			const tracing1 = {} as Record<string, unknown>;
			const tracing2 = {} as Record<string, unknown>;

			await state.configureReplayMode(tracing1 as unknown as InstanceAiTraceContext);
			await state.configureReplayMode(tracing2 as unknown as InstanceAiTraceContext);

			expect(tracing1.traceIndex).toBe(tracing2.traceIndex);
			expect(tracing1.idRemapper).toBe(tracing2.idRemapper);
		});

		it('should clear shared state when slug changes via clearEvents', async () => {
			process.env.E2E_TESTS = 'true';
			const state = new TraceReplayState();
			state.loadEvents('test-a', [{ kind: 'header' }]);

			const tracing1 = {} as Record<string, unknown>;
			await state.configureReplayMode(tracing1 as unknown as InstanceAiTraceContext);
			const firstIndex = tracing1.traceIndex;

			state.clearEvents('test-a');
			state.loadEvents('test-b', [{ kind: 'header' }]);

			const tracing2 = {} as Record<string, unknown>;
			await state.configureReplayMode(tracing2 as unknown as InstanceAiTraceContext);

			expect(tracing2.traceIndex).not.toBe(firstIndex);
		});
	});
});
