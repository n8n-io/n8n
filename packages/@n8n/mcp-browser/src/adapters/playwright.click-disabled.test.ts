import { adapterWithLocator } from './test-helpers';
import { DisabledElementError } from '../errors';
import { configureLogger } from '../logger';

configureLogger({ level: 'silent' });

interface FakeLocator {
	/** `resolveRef` counts matches to detect a stale ref before acting. */
	count: ReturnType<typeof vi.fn>;
	isDisabled: ReturnType<typeof vi.fn>;
	click: ReturnType<typeof vi.fn>;
}

/** Reports `reads[n]` on the nth read, holding the last. */
function fakeLocator(reads: boolean[]): FakeLocator {
	let call = 0;
	return {
		count: vi.fn().mockResolvedValue(1),
		isDisabled: vi.fn(async () => await Promise.resolve(reads[Math.min(call++, reads.length - 1)])),
		click: vi.fn().mockResolvedValue(undefined),
	};
}

describe('PlaywrightAdapter.click on a disabled control', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	/** Lets the grace window elapse without waiting for it. */
	async function expectRefusal(click: Promise<void>, matcher: unknown = DisabledElementError) {
		const assertion = expect(click).rejects.toThrow(matcher as string);
		await vi.advanceTimersByTimeAsync(30_000);
		await assertion;
	}

	it('refuses a control that is still disabled once the grace window is up', async () => {
		const locator = fakeLocator([true]);
		const adapter = adapterWithLocator('p1', locator);

		await expectRefusal(adapter.click('p1', { ref: 'e135' }));

		expect(locator.click).not.toHaveBeenCalled();
	});

	it('re-reads across the window rather than refusing on the first read', async () => {
		// The whole point of the window: a control the page is about to enable must
		// not be rejected because of one unlucky read.
		const locator = fakeLocator([true]);
		const adapter = adapterWithLocator('p1', locator);

		await expectRefusal(adapter.click('p1', { ref: 'e135' }));

		expect(locator.isDisabled.mock.calls.length).toBeGreaterThan(1);
	});

	it('clicks a control that is only briefly disabled', async () => {
		const locator = fakeLocator([true, false]);
		const adapter = adapterWithLocator('p1', locator);

		const click = adapter.click('p1', { ref: 'e135' });
		await vi.advanceTimersByTimeAsync(30_000);
		await click;

		expect(locator.click).toHaveBeenCalled();
	});

	it('names the offending target', async () => {
		const locator = fakeLocator([true]);
		const adapter = adapterWithLocator('p1', locator);

		await expectRefusal(
			adapter.click('p1', { selector: "button:has-text('Add')" }),
			/button:has-text\('Add'\)/,
		);
	});

	it('clicks as normal when the target is enabled', async () => {
		const locator = fakeLocator([false]);
		const adapter = adapterWithLocator('p1', locator);

		await adapter.click('p1', { ref: 'e135' });

		expect(locator.click).toHaveBeenCalled();
		expect(locator.isDisabled).toHaveBeenCalledTimes(1);
	});

	it('still clicks when the state cannot be read', async () => {
		// Best-effort: an unreadable check must not turn a working click into an error.
		const locator = fakeLocator([false]);
		locator.isDisabled = vi.fn().mockRejectedValue(new Error('execution context destroyed'));
		const adapter = adapterWithLocator('p1', locator);

		await adapter.click('p1', { ref: 'e135' });

		expect(locator.click).toHaveBeenCalled();
	});
});
