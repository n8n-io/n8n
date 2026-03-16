import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';

import { BroadcasterService } from '../broadcaster.service';
import { EngineEventBus } from '../event-bus.service';
import { LocalEventRelay } from '../event-relay';
import type { EngineEvent } from '../event-bus.types';

/**
 * Creates a mock Express Response object that behaves like an SSE connection.
 * Tracks written data and supports close event simulation.
 */
function createMockResponse() {
	const emitter = new EventEmitter();
	const written: string[] = [];

	const res = {
		writeHead: vi.fn(),
		set: vi.fn(),
		status: vi.fn(),
		flushHeaders: vi.fn(),
		write: vi.fn((data: string) => {
			written.push(data);
			return true;
		}),
		on: vi.fn((event: string, handler: () => void) => {
			emitter.on(event, handler);
		}),
		// Helper to simulate client disconnect
		simulateClose: () => {
			emitter.emit('close');
		},
		// Helper to read what was written
		getWritten: () => written,
	};

	return res;
}

describe('BroadcasterService', () => {
	let eventBus: EngineEventBus;
	let broadcaster: BroadcasterService;

	beforeEach(() => {
		eventBus = new EngineEventBus();
		broadcaster = new BroadcasterService(eventBus);
	});

	// -----------------------------------------------------------------------
	// subscribe
	// -----------------------------------------------------------------------

	describe('subscribe', () => {
		it('sets SSE headers on the response', () => {
			const res = createMockResponse();
			broadcaster.subscribe('exec-1', res as never);

			expect(res.set).toHaveBeenCalledWith({
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
				'Access-Control-Allow-Origin': '*',
			});
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.flushHeaders).toHaveBeenCalledOnce();
		});

		it('tracks the subscriber count', () => {
			const res1 = createMockResponse();
			const res2 = createMockResponse();

			expect(broadcaster.getSubscriberCount('exec-1')).toBe(0);

			broadcaster.subscribe('exec-1', res1 as never);
			expect(broadcaster.getSubscriberCount('exec-1')).toBe(1);

			broadcaster.subscribe('exec-1', res2 as never);
			expect(broadcaster.getSubscriberCount('exec-1')).toBe(2);
		});

		it('tracks subscribers per execution', () => {
			const res1 = createMockResponse();
			const res2 = createMockResponse();

			broadcaster.subscribe('exec-1', res1 as never);
			broadcaster.subscribe('exec-2', res2 as never);

			expect(broadcaster.getSubscriberCount('exec-1')).toBe(1);
			expect(broadcaster.getSubscriberCount('exec-2')).toBe(1);
		});
	});

	// -----------------------------------------------------------------------
	// send
	// -----------------------------------------------------------------------

	describe('send', () => {
		it('writes SSE-formatted data to subscribed clients', () => {
			const res = createMockResponse();
			broadcaster.subscribe('exec-1', res as never);

			const event = {
				type: 'step:started',
				executionId: 'exec-1',
				stepId: 'step-1',
				attempt: 1,
			} as EngineEvent;
			broadcaster.send('exec-1', event);

			expect(res.write).toHaveBeenCalledWith(`data: ${JSON.stringify(event)}\n\n`);
		});

		it('sends to multiple subscribers of the same execution', () => {
			const res1 = createMockResponse();
			const res2 = createMockResponse();

			broadcaster.subscribe('exec-1', res1 as never);
			broadcaster.subscribe('exec-1', res2 as never);

			const event = {
				type: 'execution:started',
				executionId: 'exec-1',
			} as EngineEvent;
			broadcaster.send('exec-1', event);

			const expectedData = `data: ${JSON.stringify(event)}\n\n`;
			expect(res1.write).toHaveBeenCalledWith(expectedData);
			expect(res2.write).toHaveBeenCalledWith(expectedData);
		});

		it('does not send to subscribers of other executions', () => {
			const res1 = createMockResponse();
			const res2 = createMockResponse();

			broadcaster.subscribe('exec-1', res1 as never);
			broadcaster.subscribe('exec-2', res2 as never);

			// Reset write call counts after subscribe (which sends ': connected\n\n')
			res1.write.mockClear();
			res2.write.mockClear();

			const event = {
				type: 'execution:started',
				executionId: 'exec-1',
			} as EngineEvent;
			broadcaster.send('exec-1', event);

			expect(res1.write).toHaveBeenCalled();
			expect(res2.write).not.toHaveBeenCalled();
		});

		it('does nothing when no subscribers exist', () => {
			// Should not throw
			broadcaster.send('exec-nonexistent', {
				type: 'execution:started',
				executionId: 'exec-nonexistent',
			} as EngineEvent);
		});
	});

	// -----------------------------------------------------------------------
	// disconnect / cleanup
	// -----------------------------------------------------------------------

	describe('disconnect cleanup', () => {
		it('removes subscriber on close event', () => {
			const res = createMockResponse();
			broadcaster.subscribe('exec-1', res as never);
			expect(broadcaster.getSubscriberCount('exec-1')).toBe(1);

			res.simulateClose();
			expect(broadcaster.getSubscriberCount('exec-1')).toBe(0);
		});

		it('cleans up execution entry when last subscriber disconnects', () => {
			const res1 = createMockResponse();
			const res2 = createMockResponse();

			broadcaster.subscribe('exec-1', res1 as never);
			broadcaster.subscribe('exec-1', res2 as never);
			expect(broadcaster.getSubscriberCount('exec-1')).toBe(2);

			res1.simulateClose();
			expect(broadcaster.getSubscriberCount('exec-1')).toBe(1);

			res2.simulateClose();
			expect(broadcaster.getSubscriberCount('exec-1')).toBe(0);
		});

		it('does not write to disconnected clients', () => {
			const res = createMockResponse();
			broadcaster.subscribe('exec-1', res as never);

			res.simulateClose();

			broadcaster.send('exec-1', {
				type: 'execution:started',
				executionId: 'exec-1',
			} as EngineEvent);

			// write was called once during subscribe's flushHeaders, but not after
			// The only write call should be from before disconnect, if any
			const writeCalls = res.write.mock.calls.filter((call) =>
				(call[0] as string).includes('execution:started'),
			);
			expect(writeCalls).toHaveLength(0);
		});
	});

	// -----------------------------------------------------------------------
	// Event bus integration
	// -----------------------------------------------------------------------

	describe('event bus integration', () => {
		it('automatically forwards engine events to SSE clients', () => {
			const res = createMockResponse();
			broadcaster.subscribe('exec-1', res as never);

			// Emit via event bus -- broadcaster should forward to SSE client
			eventBus.emit({
				type: 'step:completed',
				executionId: 'exec-1',
				stepId: 'step-1',
				output: { result: 42 },
				durationMs: 100,
			});

			// writeHead + flushHeaders from subscribe, then write from event
			const writeCallData = res.write.mock.calls.map((call) => call[0] as string);
			const eventData = writeCallData.find((d) => d.includes('step:completed'));
			expect(eventData).toBeDefined();

			const parsed = JSON.parse(eventData!.replace('data: ', '').trim()) as EngineEvent;
			expect(parsed.type).toBe('step:completed');
			expect((parsed as { executionId: string }).executionId).toBe('exec-1');
		});

		it('does not forward events for executions without subscribers', () => {
			const res = createMockResponse();
			broadcaster.subscribe('exec-1', res as never);

			// Emit event for a different execution
			eventBus.emit({
				type: 'execution:started',
				executionId: 'exec-2',
			});

			const writeCallData = res.write.mock.calls.map((call) => call[0] as string);
			const eventData = writeCallData.find((d) => d.includes('execution:started'));
			expect(eventData).toBeUndefined();
		});

		it('forwards execution events', () => {
			const res = createMockResponse();
			broadcaster.subscribe('exec-1', res as never);

			eventBus.emit({
				type: 'execution:completed',
				executionId: 'exec-1',
				result: { done: true },
			});

			const writeCallData = res.write.mock.calls.map((call) => call[0] as string);
			const eventData = writeCallData.find((d) => d.includes('execution:completed'));
			expect(eventData).toBeDefined();
		});

		it('forwards webhook events', () => {
			const res = createMockResponse();
			broadcaster.subscribe('exec-1', res as never);

			eventBus.emit({
				type: 'webhook:respond',
				executionId: 'exec-1',
				statusCode: 200,
				body: { ok: true },
			});

			const writeCallData = res.write.mock.calls.map((call) => call[0] as string);
			const eventData = writeCallData.find((d) => d.includes('webhook:respond'));
			expect(eventData).toBeDefined();
		});
	});

	// -----------------------------------------------------------------------
	// getTotalSubscriberCount
	// -----------------------------------------------------------------------

	describe('getTotalSubscriberCount', () => {
		it('returns 0 when no subscribers exist', () => {
			expect(broadcaster.getTotalSubscriberCount()).toBe(0);
		});

		it('returns total across all executions', () => {
			const res1 = createMockResponse();
			const res2 = createMockResponse();
			const res3 = createMockResponse();

			broadcaster.subscribe('exec-1', res1 as never);
			broadcaster.subscribe('exec-1', res2 as never);
			broadcaster.subscribe('exec-2', res3 as never);

			expect(broadcaster.getTotalSubscriberCount()).toBe(3);
		});

		it('decreases when subscribers disconnect', () => {
			const res1 = createMockResponse();
			const res2 = createMockResponse();

			broadcaster.subscribe('exec-1', res1 as never);
			broadcaster.subscribe('exec-1', res2 as never);

			expect(broadcaster.getTotalSubscriberCount()).toBe(2);

			res1.simulateClose();
			expect(broadcaster.getTotalSubscriberCount()).toBe(1);
		});
	});

	// -----------------------------------------------------------------------
	// Relay integration
	// -----------------------------------------------------------------------

	describe('relay integration', () => {
		it('should deliver local events to SSE clients with relay wired in', () => {
			const relay = new LocalEventRelay();
			const busWithRelay = new EngineEventBus(relay);
			const broadcasterWithRelay = new BroadcasterService(busWithRelay, relay);

			const res = createMockResponse();
			broadcasterWithRelay.subscribe('exec-1', res as never);

			busWithRelay.emit({
				type: 'step:started',
				executionId: 'exec-1',
				stepId: 's1',
				attempt: 1,
			});

			const eventWrites = res
				.getWritten()
				.filter((data) => data.startsWith('data:') && data.includes('step:started'));
			expect(eventWrites.length).toBe(1);
		});

		it('should not double-deliver with LocalEventRelay (no-op relay)', () => {
			const relay = new LocalEventRelay();
			const busWithRelay = new EngineEventBus(relay);
			const broadcasterWithRelay = new BroadcasterService(busWithRelay, relay);

			const res = createMockResponse();
			broadcasterWithRelay.subscribe('exec-1', res as never);

			busWithRelay.emit({
				type: 'step:started',
				executionId: 'exec-1',
				stepId: 's1',
				attempt: 1,
			});

			const eventWrites = res
				.getWritten()
				.filter((data) => data.startsWith('data:') && data.includes('step:started'));
			// Exactly 1: local bus delivers, relay is no-op
			expect(eventWrites.length).toBe(1);
		});

		it('should track SSE client count with relay', () => {
			const relay = new LocalEventRelay();
			const busWithRelay = new EngineEventBus(relay);
			const broadcasterWithRelay = new BroadcasterService(busWithRelay, relay);

			expect(broadcasterWithRelay.getTotalSubscriberCount()).toBe(0);

			const res = createMockResponse();
			broadcasterWithRelay.subscribe('exec-1', res as never);
			expect(broadcasterWithRelay.getTotalSubscriberCount()).toBe(1);

			// Simulate disconnect
			res.simulateClose();
			expect(broadcasterWithRelay.getTotalSubscriberCount()).toBe(0);
		});
	});
});
