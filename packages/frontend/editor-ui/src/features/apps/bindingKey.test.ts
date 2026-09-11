import { deriveBindingKey } from './bindingKey';

const KEY_PATTERN = /^[a-z][a-z0-9-]{0,63}$/;

describe('deriveBindingKey', () => {
	it('lowercases and joins words with single hyphens', () => {
		expect(deriveBindingKey('  Send  Slack Message! ', [])).toBe('send-slack-message');
	});

	it('drops characters outside a-z0-9', () => {
		expect(deriveBindingKey('Café ☕ Bestellung', [])).toBe('caf-bestellung');
	});

	it('prefixes a key that does not start with a letter', () => {
		expect(deriveBindingKey('2nd step', [])).toBe('w-2nd-step');
		expect(deriveBindingKey('-dash', [])).toBe('dash');
	});

	it('falls back to a bare prefix for an empty name', () => {
		expect(deriveBindingKey('', [])).toBe('w');
		expect(deriveBindingKey('☕', [])).toBe('w');
	});

	it('cuts the key to 64 characters', () => {
		const key = deriveBindingKey('a'.repeat(80), []);

		expect(key).toBe('a'.repeat(64));
		expect(key).toMatch(KEY_PATTERN);
	});

	it('appends a counter while the key is taken', () => {
		expect(deriveBindingKey('Echo', ['echo'])).toBe('echo-2');
		expect(deriveBindingKey('Echo', ['echo', 'echo-2', 'echo-3'])).toBe('echo-4');
	});

	it('keeps a suffixed key within 64 characters', () => {
		const long = 'a'.repeat(64);
		const key = deriveBindingKey(long, [long]);

		expect(key).toBe(`${'a'.repeat(62)}-2`);
		expect(key).toMatch(KEY_PATTERN);
	});
});
