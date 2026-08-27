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

	// Bare `toContain('re')` would pass on the word "runner" elsewhere in the prompt,
	// so these match the rendered list itself.
	it('names the modules an operator allowlisted instead of forbidding all imports', () => {
		const prompt = getSystemPrompt({
			pythonImportPolicy: { stdlib: ['re', 'json'], external: ['pandas'], authoritative: true },
		});

		expect(prompt).toMatch(/standard-library module re, json/);
		expect(prompt).toMatch(/installed package pandas/);
		expect(prompt).not.toMatch(/allows no imports at all/i);
	});

	// The runner checks each category against its own allowlist, so merging them would
	// present a module filed under the wrong one as importable.
	it('keeps the standard-library and package allowlists apart', () => {
		const prompt = getSystemPrompt({
			pythonImportPolicy: { stdlib: [], external: ['re'], authoritative: true },
		});

		expect(prompt).toMatch(/installed package re/);
		expect(prompt).not.toMatch(/standard-library module re/);
	});

	it('says imports are unrestricted on a wildcard allowlist', () => {
		const prompt = getSystemPrompt({
			pythonImportPolicy: { stdlib: ['*'], external: ['*'], authoritative: true },
		});

		expect(prompt).toMatch(/any standard-library module/i);
		expect(prompt).toMatch(/any installed package/i);
		expect(prompt).not.toMatch(/allows no imports at all/i);
	});

	// n8n's view can be wrong in the permissive direction here, so the safe assumption
	// has to lead — reporting the configured list as fact would invite a runtime break.
	// This is the shape cloud runs in.
	it('assumes nothing is importable when the runner is configured separately', () => {
		const prompt = getSystemPrompt({
			pythonImportPolicy: { stdlib: ['re'], external: [], authoritative: false },
		});

		expect(prompt).toMatch(/assume no imports are available/i);
		expect(prompt).not.toMatch(/allows \*\*only\*\*/);
	});

	it('gives the same safe guidance for an allowlist the runner would reject', () => {
		const prompt = getSystemPrompt({
			pythonImportPolicy: { stdlib: [], external: [], authoritative: true, misconfigured: true },
		});

		expect(prompt).toMatch(/assume no imports are available/i);
	});

	// The agent must never point users at deployment configuration. On cloud they
	// cannot change it, so naming a setting only generates a support request for
	// something nobody will change for them.
	it.each([
		['nothing allowlisted', { stdlib: [], external: [], authoritative: true }],
		['modules allowlisted', { stdlib: ['re'], external: ['pandas'], authoritative: true }],
		['wildcard', { stdlib: ['*'], external: ['*'], authoritative: true }],
		['not authoritative', { stdlib: ['re'], external: [], authoritative: false }],
		['misconfigured', { stdlib: [], external: [], authoritative: true, misconfigured: true }],
	])('never names an environment variable or asks for a config change (%s)', (_name, policy) => {
		const prompt = getSystemPrompt({ pythonImportPolicy: policy });

		expect(prompt).not.toMatch(/N8N_RUNNERS_/);
		expect(prompt).not.toMatch(/tell the user their .* setting/i);
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
