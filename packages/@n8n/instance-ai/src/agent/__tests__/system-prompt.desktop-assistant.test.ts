/**
 * Prompt-mode variants for the desktop assistant entry points.
 *
 * These tests pin the contract that the desktop assistant relies on:
 * - One-shot mode tells the orchestrator to run fire-and-forget (no follow-up
 *   questions, no conversational output) and to end every run with exactly one
 *   `report-desktop-task-outcome` call — success after completing the task,
 *   failure with a reason when declining (ambiguous, recurring/scheduled, out
 *   of scope) or when the task failed. One-shot never builds workflows.
 * - Promote mode tells the orchestrator to compile the already-executed task
 *   into a workflow that replays it, and pick a short descriptive name that
 *   starts with a representative emoji.
 *
 * All desktop-specific behavior lives in the desktop-assistant profile module;
 * `getSystemPrompt` and the agent factory consult it. The wording is
 * intentionally not pinned exactly; we assert the protected concepts survive
 * copy edits but intent-shifting edits fail loudly. The desktop assistant no
 * longer subscribes to derived `gate-chosen` / `workflow.created` /
 * `handoff-to-editor` events — those references were removed from the prompts
 * when the abstraction layer was dropped.
 */

import { mock } from 'vitest-mock-extended';

import { getDesktopAssistantProfile } from '../desktop-assistant-profile';
import { getSystemPrompt } from '../system-prompt';
import type { OrchestrationContext } from '../../types';

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

		it('requires every run to end with a single report-desktop-task-outcome call', () => {
			expect(prompt).toContain('report-desktop-task-outcome');
			expect(prompt).toMatch(/exactly once/i);
			expect(prompt).toMatch(/final tool call/i);
		});

		it('describes both the success and the failure shape of the outcome report', () => {
			expect(prompt).toMatch(/success: true/i);
			expect(prompt).toMatch(/success: false/i);
			expect(prompt).toMatch(/failureReason/);
		});

		it('routes the decline path through the outcome report instead of a silent stop', () => {
			expect(prompt).toMatch(/stopping without producing a result still ends with this outcome/i);
		});

		it('does not reference dropped derived events', () => {
			expect(prompt).not.toMatch(/gate-chosen/i);
			expect(prompt).not.toMatch(/workflow\.created/i);
			expect(prompt).not.toMatch(/handoff-to-editor/i);
		});

		it('treats recurring/scheduled requests as a stop condition instead of a build path', () => {
			expect(prompt).toMatch(/recurring schedule or trigger/i);
			expect(prompt).toMatch(/do not build a workflow/i);
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

		it('frames the build as compiling the already-executed task into a replayable workflow', () => {
			expect(prompt).toMatch(/already executed/i);
			expect(prompt).toMatch(/replays it when run/i);
		});

		it('describes the deterministic vs judgment compile decision with the real node types', () => {
			expect(prompt).toMatch(/deterministic/i);
			expect(prompt).toMatch(/requires judgment/i);
			expect(prompt).toContain('@n8n/n8n-nodes-langchain.computerUse');
			expect(prompt).toContain('@n8n/n8n-nodes-langchain.toolComputerUse');
			expect(prompt).toMatch(/deviceConnectionApi/);
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

describe('getDesktopAssistantProfile — extra tools', () => {
	const context = mock<OrchestrationContext>();

	it('returns no prompt section and no tools without a promptMode', () => {
		const profile = getDesktopAssistantProfile(undefined, context);
		expect(profile.promptSection).toBe('');
		expect(profile.extraTools).toHaveLength(0);
	});

	it('returns the outcome report tool for one-shot mode', () => {
		const profile = getDesktopAssistantProfile('desktop-assistant-one-shot', context);
		expect(profile.extraTools.map((tool) => tool.name)).toEqual(['report-desktop-task-outcome']);
	});

	it('returns no tools for one-shot mode without an orchestration context', () => {
		const profile = getDesktopAssistantProfile('desktop-assistant-one-shot');
		expect(profile.extraTools).toHaveLength(0);
		expect(profile.promptSection).toContain('report-desktop-task-outcome');
	});

	it('returns no extra tools for promote mode', () => {
		const profile = getDesktopAssistantProfile('desktop-assistant-promote', context);
		expect(profile.extraTools).toHaveLength(0);
		expect(profile.promptSection).toMatch(/Promote To Workflow/i);
	});
});
