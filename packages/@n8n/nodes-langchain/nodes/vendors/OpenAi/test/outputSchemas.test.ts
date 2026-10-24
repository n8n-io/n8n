import { loadOutputSchema } from 'n8n-core';
import path from 'node:path';

const loadAnalyzeSchema = (version: number, parameters: Record<string, unknown> = {}) =>
	loadOutputSchema({
		nodeDir: path.join(__dirname, '..'),
		version,
		resource: 'image',
		operation: 'analyze',
		versionFallback: true,
		parameters,
		parameterDefaults: { simplify: true },
	});

describe('OpenAI image analyze output schemas', () => {
	it('describes the v2 simplified output as the Responses output array', () => {
		expect(loadAnalyzeSchema(2.3)?.type).toBe('array');
	});

	it('describes the full Responses payload when Simplify is off', () => {
		expect(loadAnalyzeSchema(2.3, { simplify: false })?.properties).toHaveProperty('output');
	});

	it.each([1, 1.8])('keeps v%s on the content shape', (version) => {
		expect(loadAnalyzeSchema(version)?.properties).toHaveProperty('content');
		expect(loadAnalyzeSchema(version, { simplify: false })?.properties).toHaveProperty('choices');
	});
});
