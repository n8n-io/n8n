/**
 * The Python Code-node section exists because the native runner's import allowlist
 * is per-deployment and empty by default. Without it the builder wrote `import re`
 * (INS-1222), which passed build validation and failed at run time.
 *
 * Assertions are semantic — they pin the protected concepts, not the wording.
 */

import { getSystemPrompt } from '../system-prompt';

describe('getSystemPrompt — Python Code nodes', () => {
	it('omits the section when the instance policy is unknown', () => {
		expect(getSystemPrompt({})).not.toContain('## Python Code Nodes');
	});

	it('states that nothing is importable when both allowlists are empty', () => {
		const prompt = getSystemPrompt({
			pythonImportPolicy: { stdlib: [], external: [], authoritative: true },
		});

		expect(prompt).toContain('## Python Code Nodes');
		expect(prompt).toMatch(/cannot import anything|no imports/i);
		expect(prompt).not.toMatch(/only these imports are available/i);
	});

	it('names the modules an operator allowlisted instead of forbidding all imports', () => {
		const prompt = getSystemPrompt({
			pythonImportPolicy: { stdlib: ['re', 'json'], external: ['pandas'], authoritative: true },
		});

		expect(prompt).toContain('re');
		expect(prompt).toContain('json');
		expect(prompt).toContain('pandas');
		expect(prompt).not.toMatch(/cannot import anything/i);
	});

	it('says imports are unrestricted on a wildcard allowlist', () => {
		const prompt = getSystemPrompt({
			pythonImportPolicy: { stdlib: ['*'], external: ['*'], authoritative: true },
		});

		expect(prompt).toMatch(/any standard-library module/i);
		expect(prompt).not.toMatch(/cannot import anything/i);
	});

	it('flags that the policy is a guess when the runner is configured separately', () => {
		const prompt = getSystemPrompt({
			pythonImportPolicy: { stdlib: ['re'], external: [], authoritative: false },
		});

		expect(prompt).toMatch(/external runner mode|cannot confirm|may differ/i);
	});

	it('always states the globals the runner defines, whatever the import policy', () => {
		const prompt = getSystemPrompt({
			pythonImportPolicy: { stdlib: ['*'], external: ['*'], authoritative: true },
		});

		expect(prompt).toContain('_items');
		expect(prompt).toContain('_item');
		expect(prompt).toMatch(/_\(/);
	});
});
