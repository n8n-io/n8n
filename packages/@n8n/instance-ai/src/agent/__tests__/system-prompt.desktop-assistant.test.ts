/**
 * Prompt-mode variants for the desktop assistant entry points.
 *
 * These tests deliberately avoid pinning prose — the prompt wording is free to
 * evolve. What they do pin are the cross-system identifiers other code depends
 * on (the outcome tool name the desktop client matches tool-call events
 * against, the Computer Use node types and credential the promote build must
 * emit) plus the structural facts: each mode has its section, modes don't
 * bleed into each other, and the outcome tool is registered for one-shot runs
 * only.
 */

import { getDesktopAssistantProfile } from '../desktop-assistant-profile';
import { getSystemPrompt } from '../system-prompt';

describe('getSystemPrompt — desktop-assistant promptMode variants', () => {
	it('omits the desktop-assistant section when no promptMode is set', () => {
		expect(getSystemPrompt({})).not.toMatch(/Desktop Assistant/i);
	});

	it('one-shot mode references the outcome report tool the client listens for', () => {
		const prompt = getSystemPrompt({ promptMode: 'desktop-assistant-one-shot' });
		expect(prompt).toMatch(/Desktop Assistant.+One-Shot/i);
		expect(prompt).toContain('report-desktop-task-outcome');
	});

	it('promote mode references the node types and credential the build must emit', () => {
		const prompt = getSystemPrompt({ promptMode: 'desktop-assistant-promote' });
		expect(prompt).toMatch(/Desktop Assistant.+Promote/i);
		expect(prompt).toContain('@n8n/n8n-nodes-langchain.computerUse');
		expect(prompt).toContain('@n8n/n8n-nodes-langchain.toolComputerUse');
		expect(prompt).toContain('deviceConnectionApi');
	});

	it('modes do not bleed into each other', () => {
		expect(getSystemPrompt({ promptMode: 'desktop-assistant-promote' })).not.toMatch(
			/One-Shot Task/i,
		);
		expect(getSystemPrompt({ promptMode: 'desktop-assistant-one-shot' })).not.toMatch(
			/Promote To Workflow/i,
		);
	});
});

describe('getDesktopAssistantProfile — extra tools', () => {
	it('returns no prompt section and no tools without a promptMode', () => {
		const profile = getDesktopAssistantProfile(undefined);
		expect(profile.promptSection).toBe('');
		expect(profile.extraTools).toHaveLength(0);
	});

	it('registers the outcome report tool for one-shot mode only', () => {
		const oneShot = getDesktopAssistantProfile('desktop-assistant-one-shot');
		expect(oneShot.extraTools.map((tool) => tool.name)).toEqual(['report-desktop-task-outcome']);

		const promote = getDesktopAssistantProfile('desktop-assistant-promote');
		expect(promote.extraTools).toHaveLength(0);
	});
});
