/**
 * The project-scope section is what keeps a project-scoped thread from
 * misreporting what lives in its project: without it, the assistant answered a
 * project-status question from name-filtered lookups, and separately claimed it
 * could not find the project at all.
 *
 * Assertions are semantic — they pin the protected concepts, not the wording.
 */

import { getSystemPrompt } from '../system-prompt';

describe('getSystemPrompt — project scope', () => {
	it('omits the section when the thread is not scoped to a project', () => {
		const prompt = getSystemPrompt({});

		expect(prompt).not.toContain('## Project Scope');
	});

	it('points at the tool that identifies the bound project', () => {
		const prompt = getSystemPrompt({ projectId: 'project-1' });

		expect(prompt).toContain('## Project Scope');
		expect(prompt).toMatch(/list-projects/);
		expect(prompt).toContain('isCurrentProject');
	});

	// The whole system prompt is one prompt-cache entry shared by every thread on
	// the instance, so the section must not carry any per-thread value — a
	// per-project prefix would fragment the cache and cold-start each project.
	it('keeps the section identical for every project so the cached prefix is shared', () => {
		const promptA = getSystemPrompt({ projectId: 'project-1' });
		const promptB = getSystemPrompt({ projectId: 'project-2' });

		expect(promptA).toEqual(promptB);
		expect(promptA).not.toContain('project-1');
	});

	it('forbids answering inventory questions from a filtered lookup', () => {
		const prompt = getSystemPrompt({ projectId: 'project-1' });

		expect(prompt).toMatch(/inventory question/i);
		expect(prompt).toMatch(/without .{0,20}(a )?filter|no `query`/i);
	});
});
