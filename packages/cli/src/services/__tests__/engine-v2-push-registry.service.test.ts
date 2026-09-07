import { EngineV2PushRegistry } from '@/services/engine-v2-push-registry.service';

const HOUR_MS = 60 * 60 * 1000;
const TTL_MS = 12 * HOUR_MS;

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

			vi.advanceTimersByTime(TTL_MS + 1000);
			registry.register('fresh', { pushRef: 'push-2', workflowId: 'wf-2' });

			expect(registry.get('stale')).toBeUndefined();
			expect(registry.get('fresh')).toBeDefined();
		});

		it('keeps a session that is still inside the retention window', () => {
			vi.setSystemTime(new Date('2026-08-25T10:00:00.000Z'));
			registry.register('exec-1', { pushRef: 'push-1', workflowId: 'wf-1' });

			vi.advanceTimersByTime(TTL_MS - 1000);
			registry.register('exec-2', { pushRef: 'push-2', workflowId: 'wf-2' });

			expect(registry.get('exec-1')).toBeDefined();
		});

		it('measures the window from the last event, not from registration', () => {
			vi.setSystemTime(new Date('2026-08-25T10:00:00.000Z'));
			registry.register('long-run', { pushRef: 'push-1', workflowId: 'wf-1' });

			// A run that keeps reporting stays alive past the raw TTL.
			for (let i = 0; i < 3; i++) {
				vi.advanceTimersByTime(TTL_MS - 1000);
				expect(registry.get('long-run')).toBeDefined();
			}

			vi.advanceTimersByTime(TTL_MS + 1000);
			registry.register('other', { pushRef: 'push-2', workflowId: 'wf-2' });

			expect(registry.get('long-run')).toBeUndefined();
		});

		it('caps the number of sessions, dropping the least recently seen', () => {
			vi.setSystemTime(new Date('2026-08-25T10:00:00.000Z'));
			for (let i = 0; i < 1000; i++) {
				registry.register(`exec-${i}`, { pushRef: `push-${i}`, workflowId: 'wf-1' });
			}

			vi.advanceTimersByTime(1000);
			// Touching the oldest session makes the next one the eviction target.
			expect(registry.get('exec-0')).toBeDefined();

			registry.register('exec-1000', { pushRef: 'push-1000', workflowId: 'wf-1' });

			expect(registry.get('exec-1')).toBeUndefined();
			expect(registry.get('exec-0')).toBeDefined();
			expect(registry.get('exec-1000')).toBeDefined();
		});
	});
});
