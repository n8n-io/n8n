import { describe, it, expect } from '@jest/globals';

import { buildConfigString, type ConfigEntry } from './config-builder';

describe('buildConfigString', () => {
	it('builds config with all entries when all conditions are true', () => {
		const entries: ConfigEntry[] = [
			{ condition: true, key: 'name', value: '"test"' },
			{ condition: true, key: 'version', value: '1' },
		];

		const result = buildConfigString(entries);

		expect(result).toContain('name: "test"');
		expect(result).toContain('version: 1');
	});

	it('excludes entries when condition is false', () => {
		const entries: ConfigEntry[] = [
			{ condition: true, key: 'name', value: '"test"' },
			{ condition: false, key: 'skip', value: '"this"' },
		];

		const result = buildConfigString(entries);

		expect(result).toContain('name: "test"');
		expect(result).not.toContain('skip');
	});

	it('returns empty config when no entries pass condition', () => {
		const entries: ConfigEntry[] = [
			{ condition: false, key: 'skip1', value: '"a"' },
			{ condition: false, key: 'skip2', value: '"b"' },
		];

		const result = buildConfigString(entries);

		expect(result).toBe('{}');
	});

	it('returns empty config when entries array is empty', () => {
		const result = buildConfigString([]);

		expect(result).toBe('{}');
	});

	it('formats entries with proper separator', () => {
		const entries: ConfigEntry[] = [
			{ condition: true, key: 'a', value: '1' },
			{ condition: true, key: 'b', value: '2' },
			{ condition: true, key: 'c', value: '3' },
		];

		const result = buildConfigString(entries);

		// Should have comma-separated entries
		expect(result).toBe('{ a: 1, b: 2, c: 3 }');
	});

	it('preserves complex values', () => {
		const entries: ConfigEntry[] = [
			{ condition: true, key: 'parameters', value: '{ foo: "bar" }' },
			{ condition: true, key: 'position', value: '[100, 200]' },
		];

		const result = buildConfigString(entries);

		expect(result).toContain('parameters: { foo: "bar" }');
		expect(result).toContain('position: [100, 200]');
	});

	it('handles single entry correctly', () => {
		const entries: ConfigEntry[] = [{ condition: true, key: 'name', value: '"test"' }];

		const result = buildConfigString(entries);

		expect(result).toBe('{ name: "test" }');
	});
});
