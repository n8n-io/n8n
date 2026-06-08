/**
 * Prompt-mode variants for the desktop assistant entry points.
 *
 * These tests pin the contract that the desktop assistant relies on:
 * - One-shot mode tells the orchestrator to run fire-and-forget (no follow-up
 *   questions, emit events only, hand off when ambiguous).
 * - Promote mode tells the orchestrator to build a workflow and pick an emoji.
 *
 * The wording is intentionally not pinned exactly; we assert the protected
 * concepts survive copy edits but intent-shifting edits fail loudly.
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

		it('forbids conversational output', () => {
			expect(prompt).toMatch(/do not produce conversational output/i);
		});

		it('directs ambiguous requests to handoff-to-editor', () => {
			expect(prompt).toMatch(/handoff-to-editor/i);
		});

		it('references the gate-chosen signal', () => {
			expect(prompt).toMatch(/gate-chosen/i);
		});
	});

	describe('promptMode: desktop-assistant-promote', () => {
		const prompt = getSystemPrompt({ promptMode: 'desktop-assistant-promote' });

		it('declares the promote section', () => {
			expect(prompt).toMatch(/Desktop Assistant.+Promote/i);
		});

		it('asks the orchestrator to pick an emoji icon', () => {
			expect(prompt).toMatch(/emoji/i);
			expect(prompt).toMatch(/icon/i);
		});

		it('forbids follow-up questions', () => {
			expect(prompt).toMatch(/do not ask follow-up questions/i);
		});

		it('references the workflow-builder skill', () => {
			expect(prompt).toMatch(/workflow-builder/i);
		});

		it('directs ambiguous requests to handoff-to-editor', () => {
			expect(prompt).toMatch(/handoff-to-editor/i);
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
