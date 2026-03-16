import { describe, it, expect, vi } from 'vitest';
import { Registry } from 'prom-client';

import { EngineEventBus } from '../event-bus.service';
import { BroadcasterService } from '../broadcaster.service';
import { MetricsService } from '../metrics.service';

describe('Metrics instrumentation', () => {
	it('EngineEventBus should increment events_published_total on emit', async () => {
		const registry = new Registry();
		const metrics = new MetricsService(registry);
		const bus = new EngineEventBus(undefined, metrics);

		bus.emit({ type: 'step:started', executionId: 'e1', stepId: 's1', attempt: 1 });
		bus.emit({
			type: 'step:completed',
			executionId: 'e1',
			stepId: 's1',
			output: {},
			durationMs: 10,
		});

		const result = await registry.getSingleMetricAsString('events_published_total');
		expect(result).toContain('type="step:started"');
		expect(result).toContain('type="step:completed"');
	});

	it('EngineEventBus without metrics should not throw', () => {
		const bus = new EngineEventBus();

		expect(() => {
			bus.emit({ type: 'step:started', executionId: 'e1', stepId: 's1', attempt: 1 });
		}).not.toThrow();
	});

	it('BroadcasterService should track SSE client count', async () => {
		const registry = new Registry();
		const metrics = new MetricsService(registry);
		const bus = new EngineEventBus();
		const broadcaster = new BroadcasterService(bus, undefined, metrics);

		let closeHandler: () => void;
		const mockRes = {
			set: vi.fn(),
			status: vi.fn().mockReturnThis(),
			flushHeaders: vi.fn(),
			write: vi.fn(),
			on: vi.fn().mockImplementation((_e: string, h: () => void) => {
				closeHandler = h;
			}),
		};

		broadcaster.subscribe('exec-1', mockRes as never);
		let result = await registry.getSingleMetricAsString('sse_connected_clients');
		expect(result).toMatch(/sse_connected_clients\{.*\} 1/);

		closeHandler!();
		result = await registry.getSingleMetricAsString('sse_connected_clients');
		expect(result).toMatch(/sse_connected_clients\{.*\} 0/);
	});

	it('BroadcasterService should track multiple SSE clients', async () => {
		const registry = new Registry();
		const metrics = new MetricsService(registry);
		const bus = new EngineEventBus();
		const broadcaster = new BroadcasterService(bus, undefined, metrics);

		const closeHandlers: Array<() => void> = [];
		const createMockRes = () => ({
			set: vi.fn(),
			status: vi.fn().mockReturnThis(),
			flushHeaders: vi.fn(),
			write: vi.fn(),
			on: vi.fn().mockImplementation((_e: string, h: () => void) => {
				closeHandlers.push(h);
			}),
		});

		broadcaster.subscribe('exec-1', createMockRes() as never);
		broadcaster.subscribe('exec-2', createMockRes() as never);

		let result = await registry.getSingleMetricAsString('sse_connected_clients');
		expect(result).toMatch(/sse_connected_clients\{.*\} 2/);

		closeHandlers[0]();
		result = await registry.getSingleMetricAsString('sse_connected_clients');
		expect(result).toMatch(/sse_connected_clients\{.*\} 1/);

		closeHandlers[1]();
		result = await registry.getSingleMetricAsString('sse_connected_clients');
		expect(result).toMatch(/sse_connected_clients\{.*\} 0/);
	});

	it('EngineEventBus should count different event types separately', async () => {
		const registry = new Registry();
		const metrics = new MetricsService(registry);
		const bus = new EngineEventBus(undefined, metrics);

		bus.emit({ type: 'step:started', executionId: 'e1', stepId: 's1', attempt: 1 });
		bus.emit({ type: 'step:started', executionId: 'e1', stepId: 's2', attempt: 1 });
		bus.emit({ type: 'execution:started', executionId: 'e1' });

		const result = await registry.getSingleMetricAsString('events_published_total');
		expect(result).toContain('type="step:started"');
		expect(result).toContain('type="execution:started"');
	});
});
