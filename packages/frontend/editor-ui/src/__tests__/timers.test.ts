import { onScopeDispose } from 'vue';
import { assertNoLeakedTimers, expectScopeDisposalCancelsTimers } from '@/__tests__/timers';

describe('assertNoLeakedTimers', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('is a no-op under real timers', () => {
		expect(() => assertNoLeakedTimers()).not.toThrow();
	});

	it('passes when no fake timer is pending', () => {
		vi.useFakeTimers();
		expect(() => assertNoLeakedTimers()).not.toThrow();
	});

	it('throws when a fake timer is left pending', () => {
		vi.useFakeTimers();
		setTimeout(() => {}, 1000);
		expect(() => assertNoLeakedTimers()).toThrow(/pending/);
	});

	it('passes once pending timers are drained', () => {
		vi.useFakeTimers();
		setTimeout(() => {}, 1000);
		vi.runAllTimers();
		expect(() => assertNoLeakedTimers()).not.toThrow();
	});
});

describe('expectScopeDisposalCancelsTimers', () => {
	// A composable that cancels its timer when its scope is disposed.
	const useCleanComposable = () => {
		let id: ReturnType<typeof setTimeout> | undefined;
		const run = () => {
			id = setTimeout(() => {}, 300);
		};
		onScopeDispose(() => {
			if (id !== undefined) clearTimeout(id);
		});
		return { run };
	};

	// A composable that leaks: schedules a timer but never cancels it. This is the
	// exact pattern the lint rule below flags — disabled here because leaking is the
	// point of this fixture.
	const useLeakyComposable = () => {
		const run = () => {
			// eslint-disable-next-line n8n-local-rules/no-uncleaned-composable-timers
			setTimeout(() => {}, 300);
		};
		return { run };
	};

	it('passes when the composable cancels its timer on scope disposal', () => {
		expect(() =>
			expectScopeDisposalCancelsTimers(useCleanComposable, ({ run }) => {
				run();
			}),
		).not.toThrow();
	});

	it('fails when the composable leaks a timer past scope disposal', () => {
		expect(() =>
			expectScopeDisposalCancelsTimers(useLeakyComposable, ({ run }) => {
				run();
			}),
		).toThrow();
	});

	it('restores real timers even after a failure', () => {
		try {
			expectScopeDisposalCancelsTimers(useLeakyComposable, ({ run }) => {
				run();
			});
		} catch {
			// expected
		}
		expect(vi.isFakeTimers()).toBe(false);
	});
});
