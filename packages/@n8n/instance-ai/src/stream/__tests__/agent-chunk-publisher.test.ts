import type { InstanceAiEvent } from '@n8n/api-types';

import type { InstanceAiEventBus } from '../../event-bus';
import { AgentChunkPublisher, type AgentChunkPublisherOptions } from '../agent-chunk-publisher';

const THREAD_ID = 'thread-1';
const RUN_ID = 'run-1';
const AGENT_ID = 'agent-1';

function createPublisher(overrides: Partial<AgentChunkPublisherOptions> = {}) {
	const published: InstanceAiEvent[] = [];
	const eventBus = {
		publish: vi.fn((_threadId: string, event: InstanceAiEvent) => {
			published.push(event);
		}),
	} as unknown as InstanceAiEventBus & { publish: ReturnType<typeof vi.fn> };
	const publisher = new AgentChunkPublisher({
		threadId: THREAD_ID,
		runId: RUN_ID,
		agentId: AGENT_ID,
		eventBus,
		...overrides,
	});
	return { publisher, published, eventBus };
}

const toolCallChunk = {
	type: 'message',
	message: {
		role: 'tool',
		content: [
			{
				type: 'tool-call',
				toolCallId: 'tc-1',
				toolName: 'create-workflow',
				input: { name: 'Workflow' },
			},
		],
	},
};

const toolResultChunk = {
	type: 'message',
	message: {
		role: 'tool',
		content: [
			{
				type: 'tool-result',
				toolCallId: 'tc-1',
				toolName: 'create-workflow',
				result: { workflowId: 'wf-1' },
			},
		],
	},
};

function suspendedChunk(toolCallId: string, requestId: string) {
	return {
		type: 'tool-call-suspended',
		toolCallId,
		toolName: 'workflows',
		suspendPayload: { requestId, message: 'Run it?' },
	};
}

const finishChunk = {
	type: 'finish',
	finishReason: 'stop',
	model: 'anthropic/claude-sonnet-4',
	usage: {
		promptTokens: 100,
		completionTokens: 20,
		totalTokens: 120,
		inputTokenDetails: { noCache: 100, cacheRead: 0, cacheWrite: 0 },
	},
};

describe('AgentChunkPublisher', () => {
	it('maps text and tool chunks to events and publishes them on the thread', () => {
		const { publisher, published, eventBus } = createPublisher();

		publisher.observe({ type: 'start-step' });
		publisher.observe({ type: 'text-delta', delta: 'Hello' });
		publisher.observe(toolCallChunk);
		publisher.observe(toolResultChunk);

		expect(eventBus.publish).toHaveBeenCalledWith(THREAD_ID, expect.anything());
		expect(published.map((event) => event.type)).toEqual([
			'text-delta',
			'tool-call',
			'tool-result',
		]);
		expect(published[0]).toMatchObject({
			runId: RUN_ID,
			agentId: AGENT_ID,
			responseId: `${RUN_ID}:step:1`,
			payload: { text: 'Hello' },
		});
		expect(published[1]).toMatchObject({
			payload: { toolCallId: 'tc-1', toolName: 'create-workflow', args: { name: 'Workflow' } },
		});
		expect(published[2]).toMatchObject({
			payload: { toolCallId: 'tc-1', result: { workflowId: 'wf-1' } },
		});
	});

	it('ignores chunks that are not records', () => {
		const { publisher, published } = createPublisher();

		publisher.observe(null);
		publisher.observe('text');

		expect(published).toEqual([]);
	});

	it('holds back the primary confirmation request until flushConfirmation', () => {
		const { publisher, published } = createPublisher();

		publisher.observe(suspendedChunk('tc-1', 'req-1'));

		expect(published.some((event) => event.type === 'confirmation-request')).toBe(false);
		expect(publisher.result().suspension).toMatchObject({
			toolCallId: 'tc-1',
			requestId: 'req-1',
		});

		const flushed = publisher.flushConfirmation();

		expect(flushed).toMatchObject({
			type: 'confirmation-request',
			payload: { requestId: 'req-1', toolCallId: 'tc-1' },
		});
		expect(published.at(-1)).toBe(flushed);
	});

	it('keeps the first suspension as primary and drops later distinct ones', () => {
		const { publisher, published } = createPublisher();

		publisher.observe(suspendedChunk('tc-1', 'req-1'));
		publisher.observe(suspendedChunk('tc-2', 'req-2'));

		expect(publisher.result().confirmationEvent?.payload.requestId).toBe('req-1');
		publisher.flushConfirmation();
		expect(
			published.filter((event) => event.type === 'confirmation-request').map((e) => e.payload),
		).toEqual([expect.objectContaining({ requestId: 'req-1' })]);
	});

	it('publishes nothing on flushConfirmation when no card is held', () => {
		const { publisher, eventBus } = createPublisher();

		expect(publisher.flushConfirmation()).toBeUndefined();
		expect(eventBus.publish).not.toHaveBeenCalled();
	});

	it('accumulates text, usage and the finish reason', () => {
		const { publisher } = createPublisher();

		publisher.observe({ type: 'text-delta', delta: 'Hello, ' });
		publisher.observe({ type: 'text-delta', delta: 'world' });
		publisher.observe(finishChunk);

		const result = publisher.result();
		expect(result.text).toBe('Hello, world');
		expect(result.finishReason).toBe('stop');
		expect(result.hasError).toBe(false);
		expect(result.stopped).toBe(false);
		expect(result.usage).toMatchObject({
			promptTokens: 100,
			completionTokens: 20,
			totalTokens: 120,
		});
	});

	it('reports no usage when no finish chunk carried any', () => {
		const { publisher } = createPublisher();

		publisher.observe({ type: 'text-delta', delta: 'Hi' });

		expect(publisher.result().usage).toBeUndefined();
	});

	it('records a stream error', () => {
		const { publisher } = createPublisher();
		const error = new Error('boom');

		publisher.observe({ type: 'error', error });

		expect(publisher.result()).toMatchObject({ hasError: true, error });
	});

	it('stops publishing once shouldStop returns true and calls onStop once', () => {
		let stop = false;
		const onStop = vi.fn();
		const { publisher, published } = createPublisher({ shouldStop: () => stop, onStop });

		publisher.observe({ type: 'text-delta', delta: 'first' });
		stop = true;
		publisher.observe({ type: 'text-delta', delta: ' second' });
		publisher.observe({ type: 'text-delta', delta: ' third' });
		publisher.observe(toolCallChunk);

		expect(onStop).toHaveBeenCalledTimes(1);
		// The chunk that tripped the stop is still published; later ones are not.
		expect(published.map((event) => event.type)).toEqual(['text-delta', 'text-delta']);
		const result = publisher.result();
		expect(result.stopped).toBe(true);
		expect(result.text).toBe('first second');
	});

	it('keeps counting usage after a stop', () => {
		const { publisher } = createPublisher({ shouldStop: () => true });

		publisher.observe({ type: 'text-delta', delta: 'x' });
		publisher.observe(finishChunk);

		expect(publisher.result().usage).toMatchObject({ totalTokens: 120 });
	});
});
