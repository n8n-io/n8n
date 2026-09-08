/**
 * The existing-resources section is what stops "trigger my X" from being read as
 * "build me an X". #34816 slimmed the old routing table out of the system prompt on
 * the assumption every intent has an owning skill; this one has none, and the agent
 * cannot pick a skill before it knows whether the named resource already exists —
 * so the rule has to be always-on rather than a catalog entry (INS-1379).
 *
 * Assertions are semantic — they pin the protected concepts, not the wording.
 */

import { getSystemPrompt } from '../system-prompt';

describe('getSystemPrompt — existing resources', () => {
	// Every conditional section here is gated on something (a project, a workspace,
	// a feature flag). This one must survive the emptiest possible options object:
	// the reported failure happened on a plain, unscoped thread.
	it('is always on, even for a thread with no project, workspace or flags', () => {
		const prompt = getSystemPrompt({});

		expect(prompt).toContain('## Existing Resources');
	});

	it('requires a lookup before a request becomes a build', () => {
		const prompt = getSystemPrompt({});

		expect(prompt).toMatch(/workflows\(action="list"\)/);
		expect(prompt).toMatch(/before treating a request as a build/i);
	});

	// The source failure hinged on the workflow being called "Feature Release —
	// Create (v1)": the agent read "create" as the user's verb instead of part of the
	// name it was being asked to run.
	it('warns that a resource name can itself contain a verb', () => {
		const prompt = getSystemPrompt({});

		expect(prompt).toMatch(/as a name, not as an instruction/i);
		expect(prompt).toMatch(/names routinely contain verbs/i);
	});

	// The other half of the source failure: a Linear project URL in the prompt read as
	// "build me a Linear integration" rather than "here is the input for that run".
	it('treats a value the user supplies as input, not as a thing to build around', () => {
		const prompt = getSystemPrompt({});

		expect(prompt).toMatch(/inputs, not requirements/i);
		expect(prompt).toContain('inputData');
	});

	it('routes the operation through the tools rather than back to the user', () => {
		const prompt = getSystemPrompt({});

		expect(prompt).toMatch(/do not start the builder/i);
		expect(prompt).toMatch(/never hand the work back/i);
	});

	// The rule must not tax the common case: a plain build request should go straight
	// to the builder, with no inventory round-trip first.
	it('exempts requests to build something new from the lookup', () => {
		const prompt = getSystemPrompt({});

		expect(prompt).toMatch(/build something genuinely new goes straight to the build path/i);
		expect(prompt).toMatch(/no lookup first/i);
	});

	// The rule it replaces failed because its verb list omitted "running". Naming a
	// closed set here would rebuild that bug, so the verbs must read as examples.
	it('states the verbs as an open set rather than an exhaustive list', () => {
		const prompt = getSystemPrompt({});

		expect(prompt).toMatch(/and anything else that acts on what already exists/i);
	});

	// The eval that measures this section (LangTracer case #708) uses the workflow
	// name "Onboarding Packet — Create" and the phrase "trigger onboarding packet -
	// create". Echoing either here turns that measurement into string matching.
	it('does not reuse the measuring eval’s fixture wording', () => {
		const prompt = getSystemPrompt({}).toLowerCase();

		expect(prompt).not.toContain('onboarding packet');
		expect(prompt).not.toContain('feature release');
	});

	// The whole prompt is one prompt-cache entry shared by every thread, so this
	// section must not carry a per-thread value.
	it('keeps the section identical across threads so the cached prefix is shared', () => {
		// Bounded by the section's own last sentence: the block that follows it in the
		// prompt carries no `##` heading, so splitting on headings would over-capture.
		const sectionOf = (prompt: string) => {
			const start = prompt.indexOf('## Existing Resources');
			const end = prompt.indexOf('no lookup first.', start);
			expect(start).toBeGreaterThan(-1);
			expect(end).toBeGreaterThan(start);
			return prompt.slice(start, end);
		};

		expect(sectionOf(getSystemPrompt({ projectId: 'project-1' }))).toEqual(
			sectionOf(getSystemPrompt({ projectId: 'project-2', conversationHistoryEnabled: true })),
		);
	});
});
