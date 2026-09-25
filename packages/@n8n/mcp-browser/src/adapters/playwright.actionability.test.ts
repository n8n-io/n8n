import { adapterWithLocator } from './test-helpers';
import { ElementNotActionableError } from '../errors';
import { configureLogger } from '../logger';

configureLogger({ level: 'silent' });

interface FakeLocator {
	/** `resolveRef` counts matches to detect a stale ref before acting. */
	count: ReturnType<typeof vi.fn>;
	isDisabled: ReturnType<typeof vi.fn>;
	isEditable: ReturnType<typeof vi.fn>;
	click: ReturnType<typeof vi.fn>;
	clear: ReturnType<typeof vi.fn>;
	pressSequentially: ReturnType<typeof vi.fn>;
	selectOption: ReturnType<typeof vi.fn>;
}

/** Each state reports `[n]` on the nth read, holding the last. */
function fakeLocator(state: { disabled?: boolean[]; editable?: boolean[] } = {}): FakeLocator {
	const reader = (reads: boolean[]) => {
		let call = 0;
		return vi.fn(async () => await Promise.resolve(reads[Math.min(call++, reads.length - 1)]));
	};
	return {
		count: vi.fn().mockResolvedValue(1),
		isDisabled: reader(state.disabled ?? [false]),
		isEditable: reader(state.editable ?? [true]),
		click: vi.fn().mockResolvedValue(undefined),
		clear: vi.fn().mockResolvedValue(undefined),
		pressSequentially: vi.fn().mockResolvedValue(undefined),
		selectOption: vi.fn().mockResolvedValue(['a']),
	};
}

describe('PlaywrightAdapter actionability guard', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	type Matcher = RegExp | (new (...args: never[]) => Error);

	/** Lets the grace window elapse without waiting for it. */
	async function expectRefusal(
		action: Promise<unknown>,
		matcher: Matcher = ElementNotActionableError,
	) {
		const assertion = expect(action).rejects.toThrow(matcher);
		await vi.advanceTimersByTimeAsync(30_000);
		await assertion;
	}

	/** Runs an action to completion across the grace window. */
	async function settle(action: Promise<unknown>) {
		await vi.advanceTimersByTimeAsync(30_000);
		return await action;
	}

	describe('click', () => {
		it('refuses a control that stays disabled, after re-reading across the window', async () => {
			// Re-reading is the point: a control the page is about to enable must not
			// lose to one unlucky read.
			const locator = fakeLocator({ disabled: [true] });
			const adapter = adapterWithLocator('p1', locator);

			await expectRefusal(adapter.click('p1', { ref: 'e135' }));

			expect(locator.click).not.toHaveBeenCalled();
			expect(locator.isDisabled.mock.calls.length).toBeGreaterThan(1);
		});

		it('is still waiting part-way through the window', async () => {
			// Pins the lower bound: shrinking the window silently would fail here.
			const locator = fakeLocator({ disabled: [true] });
			const adapter = adapterWithLocator('p1', locator);
			const settled = vi.fn();

			const click = adapter.click('p1', { ref: 'e135' }).catch(settled);
			await vi.advanceTimersByTimeAsync(4_000);
			expect(settled).not.toHaveBeenCalled();

			await vi.advanceTimersByTimeAsync(30_000);
			await click;
			expect(settled).toHaveBeenCalled();
		});

		it('gives up well before the action timeout it exists to pre-empt', async () => {
			// Pins the upper bound: quietly widening the window towards Playwright's
			// 30s default would defeat the point and fail here.
			const locator = fakeLocator({ disabled: [true] });
			const adapter = adapterWithLocator('p1', locator);
			const settled = vi.fn();

			const click = adapter.click('p1', { ref: 'e135' }).catch(settled);
			await vi.advanceTimersByTimeAsync(8_000);

			expect(settled).toHaveBeenCalled();
			await click;
		});

		it('clicks a control that only enables near the end of the window', async () => {
			// Pins the upper bound: the window must be long enough to still be
			// re-reading at ~4.5s, so a slow backend is not refused.
			const reads = Array<boolean>(18).fill(true);
			reads.push(false);
			const locator = fakeLocator({ disabled: reads });
			const adapter = adapterWithLocator('p1', locator);

			await settle(adapter.click('p1', { ref: 'e135' }));

			expect(locator.click).toHaveBeenCalled();
		});

		it('clicks a control that is only briefly disabled', async () => {
			const locator = fakeLocator({ disabled: [true, false] });
			const adapter = adapterWithLocator('p1', locator);

			await settle(adapter.click('p1', { ref: 'e135' }));

			expect(locator.click).toHaveBeenCalled();
		});

		it('ignores read-only, which does not block a click', async () => {
			const locator = fakeLocator({ disabled: [false], editable: [false] });
			const adapter = adapterWithLocator('p1', locator);

			await adapter.click('p1', { ref: 'e135' });

			expect(locator.click).toHaveBeenCalled();
		});

		it('names the offending target', async () => {
			const locator = fakeLocator({ disabled: [true] });
			const adapter = adapterWithLocator('p1', locator);

			await expectRefusal(
				adapter.click('p1', { selector: "button:has-text('Add')" }),
				/button:has-text\('Add'\)/,
			);
		});

		it('clicks as normal when the target is enabled', async () => {
			const locator = fakeLocator();
			const adapter = adapterWithLocator('p1', locator);

			await adapter.click('p1', { ref: 'e135' });

			expect(locator.click).toHaveBeenCalled();
			expect(locator.isDisabled).toHaveBeenCalledTimes(1);
		});

		it('still clicks when the state cannot be read', async () => {
			// Best-effort: an unreadable check must not turn a working click into an error.
			const locator = fakeLocator();
			locator.isDisabled = vi.fn().mockRejectedValue(new Error('execution context destroyed'));
			const adapter = adapterWithLocator('p1', locator);

			await adapter.click('p1', { ref: 'e135' });

			expect(locator.click).toHaveBeenCalled();
		});
	});

	describe('type', () => {
		it('refuses a field that stays uneditable', async () => {
			const locator = fakeLocator({ disabled: [true], editable: [false] });
			const adapter = adapterWithLocator('p1', locator);

			await expectRefusal(adapter.type('p1', { ref: 'e135' }, 'hello'));

			expect(locator.pressSequentially).not.toHaveBeenCalled();
		});

		it('reports read-only separately from disabled, because the fix differs', async () => {
			// A read-only field is ENABLED, so the disabled predicate alone would miss
			// it and the caller would pay the full action timeout.
			const locator = fakeLocator({ disabled: [false], editable: [false] });
			const adapter = adapterWithLocator('p1', locator);

			await expectRefusal(adapter.type('p1', { ref: 'e135' }, 'hello'), /read-only/);
		});

		it('types into an editable field', async () => {
			const locator = fakeLocator();
			const adapter = adapterWithLocator('p1', locator);

			await adapter.type('p1', { ref: 'e135' }, 'hello');

			expect(locator.pressSequentially).toHaveBeenCalledWith('hello', { delay: undefined });
		});
	});

	describe('select', () => {
		it('refuses a disabled select', async () => {
			const locator = fakeLocator({ disabled: [true], editable: [false] });
			const adapter = adapterWithLocator('p1', locator);

			await expectRefusal(adapter.select('p1', { ref: 'e135' }, ['b']));

			expect(locator.selectOption).not.toHaveBeenCalled();
		});

		it('selects on a read-only select, which Playwright allows', async () => {
			// `readonly` is not valid on `<select>` and browsers ignore it, so
			// requiring `editable` here would refuse a select that works.
			const locator = fakeLocator({ disabled: [false], editable: [false] });
			const adapter = adapterWithLocator('p1', locator);

			await adapter.select('p1', { ref: 'e135' }, ['b']);

			expect(locator.selectOption).toHaveBeenCalledWith(['b']);
		});

		it('selects on an enabled select', async () => {
			const locator = fakeLocator();
			const adapter = adapterWithLocator('p1', locator);

			await adapter.select('p1', { ref: 'e135' }, ['b']);

			expect(locator.selectOption).toHaveBeenCalledWith(['b']);
		});
	});
});
