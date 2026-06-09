/**
 * Prompt-mode variants for the desktop assistant entry points.
 *
 * These tests pin the contract that the desktop assistant relies on:
 * - One-shot mode tells the orchestrator to run fire-and-forget (no follow-up
 *   questions, no conversational output, stop on ambiguity).
 * - Promote mode tells the orchestrator to build a workflow and pick a short
 *   descriptive name that starts with a representative emoji.
 *
 * The wording is intentionally not pinned exactly; we assert the protected
 * concepts survive copy edits but intent-shifting edits fail loudly. The
 * desktop assistant no longer subscribes to derived `gate-chosen` /
 * `workflow.created` / `handoff-to-editor` events — those references were
 * removed from the prompts when the abstraction layer was dropped.
 */

import { getSystemPrompt } from '../system-prompt';

describe('getSystemPrompt — desktop-assistant promptMode variants', () => {
	describe('default behaviour', () => {
		it('omits the desktop-assistant section when no promptMode is set', () => {
			const prompt = getSystemPrompt({});
			expect(prompt).not.toMatch(/Desktop Assistant/i);
		});
	});

	describe('promptMode: desktop-assistant-one-shot', () => {
		const prompt = getSystemPrompt({ promptMode: 'desktop-assistant-one-shot' });

		it('declares the one-shot section', () => {
			expect(prompt).toMatch(/Desktop Assistant.+One-Shot/i);
		});

		it('forbids follow-up questions', () => {
			expect(prompt).toMatch(/do not ask follow-up questions/i);
		});

		it('forbids conversational output and tells the model text is not shown to the user', () => {
			expect(prompt).toMatch(/output tool calls only/i);
			expect(prompt).toMatch(/does not read any text content/i);
		});

		it('enumerates specific forbidden conversational patterns', () => {
			expect(prompt).toMatch(/greetings/i);
			expect(prompt).toMatch(/narration/i);
			expect(prompt).toMatch(/summaries/i);
		});

		it('instructs the orchestrator to stop without producing a result when ambiguous', () => {
			expect(prompt).toMatch(/stop without producing a result/i);
		});

		it('does not reference dropped derived events', () => {
			expect(prompt).not.toMatch(/gate-chosen/i);
			expect(prompt).not.toMatch(/workflow\.created/i);
			expect(prompt).not.toMatch(/handoff-to-editor/i);
		});

		it('instructs an emoji-prefixed workflow name on the recurring build path', () => {
			expect(prompt).toMatch(/short descriptive label/i);
			expect(prompt).toMatch(/starts with a single emoji/i);
		});
	});

	describe('promptMode: desktop-assistant-promote', () => {
		const prompt = getSystemPrompt({ promptMode: 'desktop-assistant-promote' });

		it('declares the promote section', () => {
			expect(prompt).toMatch(/Desktop Assistant.+Promote/i);
		});

		it('instructs an emoji-prefixed workflow name', () => {
			expect(prompt).toMatch(/short descriptive label/i);
			expect(prompt).toMatch(/starts with a single emoji/i);
		});

		it('forbids follow-up questions', () => {
			expect(prompt).toMatch(/do not ask follow-up questions/i);
		});

		it('references the workflow-builder skill', () => {
			expect(prompt).toMatch(/workflow-builder/i);
		});

		it('instructs the orchestrator to stop without producing a workflow when ambiguous', () => {
			expect(prompt).toMatch(/stop without producing a workflow/i);
		});

		it('forbids conversational output and tells the model text is not shown to the user', () => {
			expect(prompt).toMatch(/output tool calls only/i);
			expect(prompt).toMatch(/does not read any text content/i);
		});

		it('does not reference dropped derived events', () => {
			expect(prompt).not.toMatch(/gate-chosen/i);
			expect(prompt).not.toMatch(/workflow\.created/i);
			expect(prompt).not.toMatch(/handoff-to-editor/i);
		});
	});

	describe('isolation between modes', () => {
		it('promote mode does not include one-shot-only wording', () => {
			const promotePrompt = getSystemPrompt({ promptMode: 'desktop-assistant-promote' });
			expect(promotePrompt).not.toMatch(/One-Shot Task/i);
		});

		it('one-shot mode does not include promote-only wording', () => {
			const oneShotPrompt = getSystemPrompt({ promptMode: 'desktop-assistant-one-shot' });
			expect(oneShotPrompt).not.toMatch(/Promote To Workflow/i);
		});
	});
});
