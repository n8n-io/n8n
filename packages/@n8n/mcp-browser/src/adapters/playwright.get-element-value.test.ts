import { adapterWithLocator } from './test-helpers';
import { configureLogger } from '../logger';

configureLogger({ level: 'silent' });

interface FakeLocator {
	count: ReturnType<typeof vi.fn>;
	inputValue: ReturnType<typeof vi.fn>;
	innerText: ReturnType<typeof vi.fn>;
}

describe('PlaywrightAdapter.getElementValue', () => {
	it('returns the live input value for a ref target', async () => {
		const locator: FakeLocator = {
			count: vi.fn().mockResolvedValue(1),
			inputValue: vi.fn().mockResolvedValue('xoxb-signing-secret'),
			innerText: vi.fn(),
		};
		const adapter = adapterWithLocator('p1', locator);

		const value = await adapter.getElementValue('p1', { ref: 'e5' });

		expect(value).toBe('xoxb-signing-secret');
		expect(locator.inputValue).toHaveBeenCalled();
	});

	it('falls back to inner text when the element is not an input', async () => {
		const locator: FakeLocator = {
			count: vi.fn().mockResolvedValue(1),
			inputValue: vi.fn().mockRejectedValue(new Error('Node is not an <input>')),
			innerText: vi.fn().mockResolvedValue('secret-in-code-block'),
		};
		const adapter = adapterWithLocator('p1', locator);

		const value = await adapter.getElementValue('p1', { ref: 'e5' });

		expect(value).toBe('secret-in-code-block');
		expect(locator.innerText).toHaveBeenCalled();
	});

	it('returns an empty form value without falling back to text', async () => {
		const locator: FakeLocator = {
			count: vi.fn().mockResolvedValue(1),
			inputValue: vi.fn().mockResolvedValue(''),
			innerText: vi.fn().mockResolvedValue('text-content'),
		};
		const adapter = adapterWithLocator('p1', locator);

		const value = await adapter.getElementValue('p1', { ref: 'e5' });

		expect(value).toBe('');
		expect(locator.innerText).not.toHaveBeenCalled();
	});

	it('surfaces the original error promptly when the element is unreachable', async () => {
		// An unreachable element makes inputValue() time out. The current code
		// then swallows that error and tries innerText(), which also times out —
		// so the caller waits ~2x the implicit timeout and only ever sees the
		// second ("not an input") error, masking the real cause on the secret path.
		const timeoutError = new Error('locator.inputValue: Timeout 30000ms exceeded.');
		timeoutError.name = 'TimeoutError';
		const locator: FakeLocator = {
			count: vi.fn().mockResolvedValue(1),
			inputValue: vi.fn().mockRejectedValue(timeoutError),
			innerText: vi
				.fn()
				.mockRejectedValue(new Error('locator.innerText: Timeout 30000ms exceeded.')),
		};
		const adapter = adapterWithLocator('p1', locator);

		// The unreachable element should fail once, surfacing the original error,
		// without a second attempt via innerText().
		await expect(adapter.getElementValue('p1', { ref: 'e5' })).rejects.toThrow(timeoutError);
		expect(locator.innerText).not.toHaveBeenCalled();
	});

	it('rethrows when the element is detached instead of falling back to text', async () => {
		const detachedError = new Error('locator.inputValue: Element is not attached to the DOM');
		const locator: FakeLocator = {
			count: vi.fn().mockResolvedValue(1),
			inputValue: vi.fn().mockRejectedValue(detachedError),
			innerText: vi.fn().mockResolvedValue('stale-text'),
		};
		const adapter = adapterWithLocator('p1', locator);

		await expect(adapter.getElementValue('p1', { ref: 'e5' })).rejects.toThrow(detachedError);
		expect(locator.innerText).not.toHaveBeenCalled();
	});

	it('reads the value for a selector target', async () => {
		const locator: FakeLocator = {
			count: vi.fn().mockResolvedValue(1),
			inputValue: vi.fn().mockResolvedValue('from-selector'),
			innerText: vi.fn(),
		};
		const adapter = adapterWithLocator('p1', locator);

		const value = await adapter.getElementValue('p1', { selector: '#token' });

		expect(value).toBe('from-selector');
	});
});
