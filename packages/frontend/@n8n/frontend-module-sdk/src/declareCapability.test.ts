import { declareCapability } from './declareCapability';

describe('declareCapability', () => {
	it('returns a token carrying the key and the fallback', () => {
		const noop = () => {};
		const token = declareCapability<() => void>('test-key', { fallback: noop });

		expect(token.key).toBe('test-key');
		expect(token.fallback).toBe(noop);
	});

	it('leaves the fallback undefined when it is omitted', () => {
		const token = declareCapability<() => void>('test-key');

		expect(token.fallback).toBeUndefined();
	});
});
