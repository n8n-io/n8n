import { getN8nVersion, setN8nVersion } from '../n8n-version';

describe('n8n version', () => {
	// Runs first, before any test sets the version.
	it('should throw when the version is not set', () => {
		expect(() => getN8nVersion()).toThrow('Cannot get the n8n version because it is not set');
	});

	it('should return the version that was set', () => {
		setN8nVersion('1.2.3');

		expect(getN8nVersion()).toBe('1.2.3');
	});
});
