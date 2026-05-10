jest.mock('@n8n/instance-ai', () => ({
	releaseTraceClient: jest.fn(),
}));

import { releaseTraceClient, type InstanceAiTraceContext } from '@n8n/instance-ai';

import { InstanceAiTraceService } from '../tracing/instance-ai-trace.service';

function makeTraceContext(overrides: Partial<InstanceAiTraceContext> = {}): InstanceAiTraceContext {
	const rootRun = { id: 'root-run-1', traceId: 'trace-1', metadata: { thread_id: 'thread-a' } };
	return {
		rootRun,
		actorRun: { id: 'actor-run-1', traceId: 'trace-1', metadata: { thread_id: 'thread-a' } },
		finishRun: jest.fn(async () => {}),
		traceWriter: { getEvents: jest.fn(() => [{ kind: 'tool-call' }]) },
		...overrides,
	} as unknown as InstanceAiTraceContext;
}

describe('InstanceAiTraceService', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('stores trace context metadata and exposes LangSmith anchors', () => {
		const service = new InstanceAiTraceService({ warn: jest.fn() });
		const tracing = makeTraceContext();

		service.storeTraceContext('run-1', 'thread-a', tracing, 'group-1');

		expect(service.getTraceContext('run-1')).toBe(tracing);
		expect(service.getMessageGroupId('run-1')).toBe('group-1');
		expect(service.getLangsmithAnchor('run-1')).toEqual({
			langsmithRunId: 'root-run-1',
			langsmithTraceId: 'trace-1',
		});
	});

	it('preserves active trace-writer events when deleting contexts for a thread', () => {
		const service = new InstanceAiTraceService({ warn: jest.fn() });
		service.activateTraceSlug('slug-a');
		const tracing = makeTraceContext();
		service.storeTraceContext('run-1', 'thread-a', tracing);

		service.deleteTraceContextsForThread('thread-a');

		expect(releaseTraceClient).toHaveBeenCalledWith('trace-1');
		expect(service.getTraceContext('run-1')).toBeUndefined();
		expect(service.getTraceEvents('slug-a')).toEqual([{ kind: 'tool-call' }]);
	});

	it('finalizes a message trace root once and releases the client', async () => {
		const service = new InstanceAiTraceService({ warn: jest.fn() });
		const tracing = makeTraceContext();

		await service.finalizeMessageTraceRoot('run-1', tracing, {
			status: 'completed',
			outputText: 'done',
		});

		expect(tracing.finishRun).toHaveBeenCalledWith(
			tracing.rootRun,
			expect.objectContaining({
				outputs: expect.objectContaining({ status: 'completed', response: 'done' }),
				metadata: expect.objectContaining({ final_status: 'completed' }),
			}),
		);
		expect(releaseTraceClient).toHaveBeenCalledWith('trace-1');
	});
});
