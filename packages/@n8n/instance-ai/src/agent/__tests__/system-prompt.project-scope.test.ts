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

	// `<project-context>` is best-effort (the lookup can fail) and resume paths compose
	// no new turn at all, so the section must not promise the block unconditionally —
	// and must leave the agent a way to identify its project when the block is absent.
	it('treats the project-context block as present-when-available, with a fallback', () => {
		const prompt = getSystemPrompt({ projectId: 'project-1' });

		expect(prompt).toContain('<project-context>');
		expect(prompt).toMatch(/when .{0,30}block is present|whenever that block is present/i);
		// The pre-build check must still be reachable without the block.
		expect(prompt).toMatch(/BEFORE you build[\s\S]{0,200}list-projects/);
	});

	it('forbids answering inventory questions from a filtered lookup', () => {
		const prompt = getSystemPrompt({ projectId: 'project-1' });

		expect(prompt).toMatch(/inventory question/i);
		expect(prompt).toMatch(/without .{0,20}(a )?filter|no `query`/i);
	});
});
