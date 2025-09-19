import { injectStrict } from '@/utils/injectStrict';
import type { InjectionKey } from 'vue';
import { inject } from 'vue';

vi.mock('vue', async () => {
	const original = await vi.importActual('vue');
	return {
		...original,
		inject: vi.fn(),
	};
});

describe('injectStrict', () => {
	it('should return the injected value when it exists', () => {
		const key = Symbol('testKey') as InjectionKey<string>;
		const value = 'testValue';
		vi.mocked(inject).mockReturnValueOnce(value);
		const result = injectStrict(key);
		expect(result).toBe(value);
	});

	it('should return the fallback value when the injected value does not exist', () => {
		const key = Symbol('testKey') as InjectionKey<string>;
		const fallback = 'fallbackValue';
		vi.mocked(inject).mockReturnValueOnce(fallback);
		const result = injectStrict(key, fallback);
		expect(result).toBe(fallback);
	});

	it('should throw an error when the injected value does not exist and no fallback is provided', () => {
		const key = Symbol('testKey') as InjectionKey<string>;
		vi.mocked(inject).mockReturnValueOnce(undefined);
		expect(() => injectStrict(key)).toThrowError(`Could not resolve ${key.description}`);
	});
});
