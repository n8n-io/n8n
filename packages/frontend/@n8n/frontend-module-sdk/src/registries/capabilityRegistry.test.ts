import * as capabilityRegistry from './capabilityRegistry';
import { declareCapability } from '../declareCapability';

type Greeter = (name: string) => string;

// Local tokens on purpose: the registry contract must not depend on the tokens
// the shell happens to ship in `../capabilities`.
const greeter = declareCapability<Greeter>('test-greeter');
const greeterWithFallback = declareCapability<Greeter>('test-greeter-with-fallback', {
	fallback: () => 'fallback',
});

const hello: Greeter = (name) => `hello ${name}`;
const goodbye: Greeter = (name) => `goodbye ${name}`;

describe('capabilityRegistry', () => {
	beforeEach(() => {
		capabilityRegistry.clear();
	});

	it('returns the provided implementation from use', () => {
		capabilityRegistry.provide(greeter, hello);

		expect(capabilityRegistry.use(greeter)).toBe(hello);
		expect(capabilityRegistry.has(greeter)).toBe(true);
	});

	it('throws from use when nothing is provided and no fallback was declared', () => {
		expect(() => capabilityRegistry.use(greeter)).toThrowError(
			'Capability "test-greeter" has no provider. Call capabilityRegistry.provide() at app bootstrap.',
		);
	});

	it('returns the fallback from use when nothing is provided', () => {
		expect(capabilityRegistry.use(greeterWithFallback)('ada')).toBe('fallback');
	});

	it('prefers a provided implementation over the fallback', () => {
		capabilityRegistry.provide(greeterWithFallback, hello);

		expect(capabilityRegistry.use(greeterWithFallback)).toBe(hello);
	});

	it('returns undefined from tryUse when nothing is provided, even with a fallback', () => {
		expect(capabilityRegistry.tryUse(greeter)).toBeUndefined();
		expect(capabilityRegistry.tryUse(greeterWithFallback)).toBeUndefined();
		expect(capabilityRegistry.has(greeterWithFallback)).toBe(false);
	});

	it('treats re-providing the same implementation as a no-op', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		capabilityRegistry.provide(greeter, hello);
		capabilityRegistry.provide(greeter, hello);

		expect(capabilityRegistry.use(greeter)).toBe(hello);
		expect(warn).not.toHaveBeenCalled();
	});

	it('keeps the first implementation and warns when a different one is provided', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		capabilityRegistry.provide(greeter, hello);
		capabilityRegistry.provide(greeter, goodbye);

		expect(capabilityRegistry.use(greeter)).toBe(hello);
		expect(warn).toHaveBeenCalledWith('Capability "test-greeter" is already provided. Skipping.');
	});

	it('frees the slot on unprovide', () => {
		capabilityRegistry.provide(greeter, hello);
		capabilityRegistry.unprovide(greeter);

		expect(capabilityRegistry.tryUse(greeter)).toBeUndefined();
		expect(capabilityRegistry.has(greeter)).toBe(false);
	});

	it('removes every provider on clear', () => {
		capabilityRegistry.provide(greeter, hello);
		capabilityRegistry.provide(greeterWithFallback, goodbye);

		capabilityRegistry.clear();

		expect(capabilityRegistry.has(greeter)).toBe(false);
		expect(capabilityRegistry.has(greeterWithFallback)).toBe(false);
	});
});
