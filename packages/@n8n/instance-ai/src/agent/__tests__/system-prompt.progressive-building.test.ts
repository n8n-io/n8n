/**
 * The progressive-building section carries the rules that must shape the very
 * first build (slice scoping, question shape) before the model has loaded the
 * `progressive-building` skill; the skill holds the full loop.
 *
 * Assertions are semantic — they pin the protected concepts, not the wording.
 */

import { getSystemPrompt } from '../system-prompt';

describe('getSystemPrompt — progressive building', () => {
	it('omits the section when the mode is off', () => {
		const prompt = getSystemPrompt({});

		expect(prompt).not.toContain('## Progressive Building Mode');
	});

	it('renders the section and points at the skill when the mode is on', () => {
		const prompt = getSystemPrompt({ progressiveBuilding: true });

		expect(prompt).toContain('## Progressive Building Mode');
		expect(prompt).toContain('progressive-building');
		expect(prompt).toMatch(/smallest end-to-end working slice/i);
		expect(prompt).toMatch(/never ask multi-select/i);
	});

	// The whole system prompt is one prompt-cache entry, so the section is a
	// pure presence flag: two cache variants (on/off), no per-thread values.
	it('keeps the section identical for every thread with the mode on', () => {
		const promptA = getSystemPrompt({ progressiveBuilding: true });
		const promptB = getSystemPrompt({ progressiveBuilding: true });

		expect(promptA).toEqual(promptB);
	});
});
