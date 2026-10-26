import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const manifest = JSON.parse(
	readFileSync(new URL('../component-manifest.json', import.meta.url), 'utf8'),
);

describe('component manifest', () => {
	it('keeps the formatted artifact below the file size limit', () => {
		const artifact = readFileSync(new URL('../component-manifest.json', import.meta.url));
		expect(artifact.byteLength).toBeLessThan(1024 * 1024);
	});

	it('includes local type definitions without external declarations', () => {
		expect(Object.keys(manifest.types).length).toBeGreaterThan(0);
		for (const entry of Object.values(manifest.types)) {
			expect(entry).toEqual(
				expect.objectContaining({
					source: expect.stringMatching(
						/^(?!.*(?:^|[/\\])(?:\.\.|node_modules)(?:[/\\]|$))(?![/\\]|[A-Za-z]:)/,
					),
				}),
			);
		}
	});

	it('includes barrel exports and direct v2 exports', () => {
		expect(manifest.components.N8nButton.source).toBe('src/components/N8nButton/Button.vue');
		expect(manifest.components.N8nSelect2.source).toBe('src/v2/components/Select/Select.vue');
	});

	it('keeps the four API groups and excludes global Vue props', () => {
		for (const component of Object.values(manifest.components)) {
			expect(component).toEqual(
				expect.objectContaining({
					props: expect.any(Array),
					emits: expect.any(Array),
					slots: expect.any(Array),
					variables: expect.any(Array),
				}),
			);
		}
		expect(manifest.components.N8nButton.props).not.toEqual(
			expect.arrayContaining([expect.objectContaining({ name: 'key' })]),
		);
	});

	it('only lists public n8n CSS variables', () => {
		for (const component of Object.values(manifest.components)) {
			for (const entry of component.variables) {
				expect(entry.name).toMatch(/^--n8n-(?!-)/);
				expect(entry.occurrences.length).toBeGreaterThan(0);
			}
		}
		expect(manifest.components.N8nButton.variables).toEqual([]);
	});
});
