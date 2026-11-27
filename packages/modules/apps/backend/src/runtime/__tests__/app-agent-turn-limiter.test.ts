import { mock } from 'vitest-mock-extended';

import type { AppsConfig } from '../../apps.config';
import { AppRuntimeError } from '../../bindings/app-runtime.error';
import { AppAgentTurnLimiter } from '../app-agent-turn-limiter';

const HOUR_MS = 60 * 60 * 1000;

const visitor = { appId: 'app-1', userId: 'user-1' };

function setup(limits: Partial<AppsConfig> = {}) {
	const config = mock<AppsConfig>({
		agentMaxConcurrentTurns: 20,
		agentMaxConcurrentTurnsPerVisitor: 2,
		agentTurnsPerVisitorPerHour: 100,
		...limits,
	});
	return new AppAgentTurnLimiter(config);
}

function expectTooManyRequests(claim: () => unknown) {
	try {
		claim();
	} catch (error) {
		expect(error).toBeInstanceOf(AppRuntimeError);
		expect(error).toMatchObject({ status: 429, code: 'too_many_requests' });
		return;
	}
	throw new Error('Expected the claim to be refused');
}

describe('AppAgentTurnLimiter', () => {
	afterEach(() => vi.useRealTimers());

	it('limits the turns that run at the same time across all visitors', () => {
		const limiter = setup({ agentMaxConcurrentTurns: 2 });
		limiter.claim({ appId: 'app-1', userId: 'user-1' });
		const { release } = limiter.claim({ appId: 'app-2', userId: 'user-2' });

		expectTooManyRequests(() => limiter.claim({ appId: 'app-3', userId: 'user-3' }));

		release();
		expect(() => limiter.claim({ appId: 'app-3', userId: 'user-3' })).not.toThrow();
	});

	it('limits the turns that one visitor runs at the same time, across sessions', () => {
		const limiter = setup({ agentMaxConcurrentTurnsPerVisitor: 1 });
		const { release } = limiter.claim(visitor);

		expectTooManyRequests(() => limiter.claim(visitor));
		expect(() => limiter.claim({ appId: 'app-1', userId: 'user-2' })).not.toThrow();
		expect(() => limiter.claim({ appId: 'app-2', userId: 'user-1' })).not.toThrow();

		release();
		expect(() => limiter.claim(visitor)).not.toThrow();
	});

	it('frees a slot only once when release is called twice', () => {
		const limiter = setup({ agentMaxConcurrentTurnsPerVisitor: 2 });
		const { release } = limiter.claim(visitor);
		limiter.claim(visitor);

		release();
		release();

		limiter.claim(visitor);
		expectTooManyRequests(() => limiter.claim(visitor));
	});

	it('limits the turns that one visitor starts per hour', () => {
		vi.useFakeTimers();
		const limiter = setup({ agentTurnsPerVisitorPerHour: 2 });
		limiter.claim(visitor).release();
		limiter.claim(visitor).release();

		expectTooManyRequests(() => limiter.claim(visitor));
		expect(() => limiter.claim({ appId: 'app-1', userId: 'user-2' })).not.toThrow();

		vi.advanceTimersByTime(HOUR_MS);
		expect(() => limiter.claim(visitor)).not.toThrow();
	});

	it('does not count a turn that the limiter refuses against the hourly limit', () => {
		const limiter = setup({ agentMaxConcurrentTurnsPerVisitor: 1, agentTurnsPerVisitorPerHour: 2 });
		const { release } = limiter.claim(visitor);
		expectTooManyRequests(() => limiter.claim(visitor));
		release();

		expect(() => limiter.claim(visitor)).not.toThrow();
	});

	it('takes a refunded turn back from the hourly count', () => {
		const limiter = setup({ agentTurnsPerVisitorPerHour: 1 });
		const slot = limiter.claim(visitor);
		slot.refund();
		slot.release();

		expect(() => limiter.claim(visitor)).not.toThrow();
		expectTooManyRequests(() => limiter.claim(visitor));
	});

	it('refunds a turn only once', () => {
		const limiter = setup({ agentTurnsPerVisitorPerHour: 2 });
		limiter.claim(visitor).release();
		const slot = limiter.claim(visitor);
		slot.refund();
		slot.refund();
		slot.release();

		limiter.claim(visitor).release();
		expectTooManyRequests(() => limiter.claim(visitor));
	});

	it('does not change a newer window when an old turn is refunded', () => {
		vi.useFakeTimers();
		const limiter = setup({ agentTurnsPerVisitorPerHour: 1 });
		const old = limiter.claim(visitor);
		old.release();
		vi.advanceTimersByTime(HOUR_MS);
		limiter.claim(visitor).release();

		old.refund();

		expectTooManyRequests(() => limiter.claim(visitor));
	});

	it('applies no limit that is set to 0', () => {
		const limiter = setup({
			agentMaxConcurrentTurns: 0,
			agentMaxConcurrentTurnsPerVisitor: 0,
			agentTurnsPerVisitorPerHour: 0,
		});

		for (let i = 0; i < 200; i++) limiter.claim(visitor);
	});
});
