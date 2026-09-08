/**
 * The existing-automations section is what stops "trigger my X" from being read as
 * "build me an X". #34816 slimmed the old routing table out of the system prompt on
 * the assumption every intent has an owning skill; this one has none, and the agent
 * cannot pick a skill before it knows whether the named automation already exists —
 * so the rule has to be always-on rather than a catalog entry (INS-1379).
 *
 * Assertions are semantic — they pin the protected concepts, not the wording.
 */

import { getSystemPrompt } from '../system-prompt';

describe('getSystemPrompt — existing automations', () => {
	// Every conditional section here is gated on something (a project, a workspace,
	// a feature flag). This one must survive the emptiest possible options object:
	// the reported failure happened on a plain, unscoped thread.
	it('is always on, even for a thread with no project, workspace or flags', () => {
		const prompt = getSystemPrompt({});

		expect(prompt).toContain('## Existing Automations');
	});

	it('requires an inventory lookup before a run-an-existing request becomes a build', () => {
		const prompt = getSystemPrompt({});

		expect(prompt).toMatch(/workflows\(action="list"\)/);
		expect(prompt).toMatch(/before treating the request as a build/i);
	});

	// The source failure hinged on the workflow being called "Feature Release —
	// Create (v1)": the agent read "create" as the user's verb instead of part of the
	// name it was being asked to run.
	it('warns that a workflow name can itself contain a build verb', () => {
		const prompt = getSystemPrompt({});

		expect(prompt).toMatch(/name can contain a build verb/i);
	});

	// The other half of the source failure: a Linear project URL in the prompt read as
	// "build me a Linear integration" rather than "here is the input for that run".
	it('treats a link to an integrable service as input data, not a build request', () => {
		const prompt = getSystemPrompt({});

		expect(prompt).toMatch(/input value/i);
		expect(prompt).toContain('inputData');
	});

	it('routes the run through the executions tool rather than the editor', () => {
		const prompt = getSystemPrompt({});

		expect(prompt).toMatch(/executions\(action="run"\)/);
		expect(prompt).toMatch(/never answer by telling the user to open the workflow/i);
	});

	// The rule must not tax the common case: a plain build request should go straight
	// to the builder, with no inventory round-trip first.
	it('exempts requests to build something new from the lookup', () => {
		const prompt = getSystemPrompt({});

		expect(prompt).toMatch(/build something new goes straight to the build path/i);
		expect(prompt).toMatch(/do not list first/i);
	});

	// The whole prompt is one prompt-cache entry shared by every thread, so this
	// section must not carry a per-thread value.
	it('keeps the section identical across threads so the cached prefix is shared', () => {
		// Bounded by the section's own last sentence: the block that follows it in the
		// prompt carries no `##` heading, so splitting on headings would over-capture.
		const sectionOf = (prompt: string) => {
			const start = prompt.indexOf('## Existing Automations');
			const end = prompt.indexOf('do not list first.', start);
			expect(start).toBeGreaterThan(-1);
			expect(end).toBeGreaterThan(start);
			return prompt.slice(start, end);
		};

		expect(sectionOf(getSystemPrompt({ projectId: 'project-1' }))).toEqual(
			sectionOf(getSystemPrompt({ projectId: 'project-2', conversationHistoryEnabled: true })),
		);
	});
});
