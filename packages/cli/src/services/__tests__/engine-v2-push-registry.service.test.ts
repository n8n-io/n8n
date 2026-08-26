import { EngineV2PushRegistry } from '@/services/engine-v2-push-registry.service';

const HOUR_MS = 60 * 60 * 1000;

describe('EngineV2PushRegistry', () => {
	let registry: EngineV2PushRegistry;

	beforeEach(() => {
		registry = new EngineV2PushRegistry();
	});

	it('returns nothing for an execution it never saw', () => {
		expect(registry.get('unknown')).toBeUndefined();
	});

	it('starts a session with zeroed counters and no steps', () => {
		registry.register('exec-1', { pushRef: 'push-1', workflowId: 'wf-1' });

		expect(registry.get('exec-1')).toMatchObject({
			pushRef: 'push-1',
			workflowId: 'wf-1',
			sequenceNumber: 0,
			nextExecutionIndex: 0,
		});
		expect(registry.get('exec-1')?.steps.size).toBe(0);
	});

	it('keeps the trigger the run started from', () => {
		const outputs = [[{ json: { x: 1 } }]];
		registry.register('exec-1', {
			pushRef: 'push-1',
			workflowId: 'wf-1',
			trigger: { nodeName: 'When clicking Execute', outputs },
		});

		expect(registry.get('exec-1')?.trigger).toEqual({
			nodeName: 'When clicking Execute',
			outputs,
		});
	});

	it('releases a session, and releasing twice is a no-op', () => {
		registry.register('exec-1', { pushRef: 'push-1', workflowId: 'wf-1' });

		registry.release('exec-1');
		registry.release('exec-1');

		expect(registry.get('exec-1')).toBeUndefined();
	});

	it('keeps sessions apart', () => {
		registry.register('exec-1', { pushRef: 'push-1', workflowId: 'wf-1' });
		registry.register('exec-2', { pushRef: 'push-2', workflowId: 'wf-2' });

		registry.release('exec-1');

		expect(registry.get('exec-2')?.pushRef).toBe('push-2');
	});

	describe('eviction', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('drops a session whose terminal update never arrived', () => {
			// No `cancelled` event exists, so an unreleased session must expire.
			vi.setSystemTime(new Date('2026-08-25T10:00:00.000Z'));
			registry.register('stale', { pushRef: 'push-1', workflowId: 'wf-1' });

			vi.setSystemTime(new Date('2026-08-25T11:00:01.000Z'));
			registry.register('fresh', { pushRef: 'push-2', workflowId: 'wf-2' });

			expect(registry.get('stale')).toBeUndefined();
			expect(registry.get('fresh')).toBeDefined();
		});

		it('keeps a session that is still inside the retention window', () => {
			vi.setSystemTime(new Date('2026-08-25T10:00:00.000Z'));
			registry.register('exec-1', { pushRef: 'push-1', workflowId: 'wf-1' });

			vi.advanceTimersByTime(HOUR_MS - 1000);
			registry.register('exec-2', { pushRef: 'push-2', workflowId: 'wf-2' });

			expect(registry.get('exec-1')).toBeDefined();
		});
	});
});
