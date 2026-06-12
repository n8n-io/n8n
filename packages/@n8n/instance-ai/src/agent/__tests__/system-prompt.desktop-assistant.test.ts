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

	it('one-shot mode references the details field the done card renders', () => {
		const prompt = getSystemPrompt({ promptMode: 'desktop-assistant-one-shot' });
		expect(prompt).toContain('`details`');
	});

	it('promote mode references the node types and credential the build must emit', () => {
		const prompt = getSystemPrompt({ promptMode: 'desktop-assistant-promote' });
		expect(prompt).toMatch(/Desktop Assistant.+Promote/i);
		expect(prompt).toContain('@n8n/n8n-nodes-langchain.computerUse');
		expect(prompt).toContain('@n8n/n8n-nodes-langchain.toolComputerUse');
		expect(prompt).toContain('@n8n/n8n-nodes-langchain.chainLlm');
		expect(prompt).toContain('deviceConnectionApi');
	});

	it('edit mode restricts the run to the listed changes', () => {
		const prompt = getSystemPrompt({ promptMode: 'desktop-assistant-edit' });
		expect(prompt).toMatch(/Desktop Assistant.+Edit Existing Workflow/i);
		expect(prompt).toMatch(/apply ONLY the listed changes/i);
		expect(prompt).toMatch(/stop without modifying the workflow/i);
	});

	it('modes do not bleed into each other', () => {
		expect(getSystemPrompt({ promptMode: 'desktop-assistant-promote' })).not.toMatch(
			/One-Shot Task/i,
		);
		expect(getSystemPrompt({ promptMode: 'desktop-assistant-one-shot' })).not.toMatch(
			/Promote To Workflow/i,
		);
		const editPrompt = getSystemPrompt({ promptMode: 'desktop-assistant-edit' });
		expect(editPrompt).not.toMatch(/One-Shot Task/i);
		expect(editPrompt).not.toMatch(/Promote To Workflow/i);
	});
});

describe('getDesktopAssistantProfile — extra tools', () => {
	it('returns no prompt section and no tools without a promptMode', () => {
		const profile = getDesktopAssistantProfile(undefined);
		expect(profile.promptSection).toBe('');
		expect(profile.extraTools).toHaveLength(0);
	});

	it('registers the outcome report and plan proposal tools for one-shot mode', () => {
		const oneShot = getDesktopAssistantProfile('desktop-assistant-one-shot');
		expect(oneShot.extraTools.map((tool) => tool.name)).toEqual([
			'report-desktop-task-outcome',
			'propose-task-plan',
		]);
	});

	it('registers the promote outcome report tool for promote mode', () => {
		const promote = getDesktopAssistantProfile('desktop-assistant-promote');
		expect(promote.extraTools.map((tool) => tool.name)).toEqual(['report-promote-outcome']);
	});

	it('pins gateway tools out of deferred search for one-shot runs only', () => {
		expect(getDesktopAssistantProfile('desktop-assistant-one-shot').preloadGatewayTools).toBe(true);
		expect(getDesktopAssistantProfile('desktop-assistant-promote').preloadGatewayTools).toBe(false);
		expect(getDesktopAssistantProfile(undefined).preloadGatewayTools).toBe(false);
	});

	it('pre-approves workflow edits for edit mode only', () => {
		expect(getDesktopAssistantProfile('desktop-assistant-edit').preApproveWorkflowEdits).toBe(true);
		expect(getDesktopAssistantProfile('desktop-assistant-one-shot').preApproveWorkflowEdits).toBe(
			false,
		);
		expect(getDesktopAssistantProfile('desktop-assistant-promote').preApproveWorkflowEdits).toBe(
			false,
		);
		expect(getDesktopAssistantProfile(undefined).preApproveWorkflowEdits).toBe(false);
	});

	it('suppresses interactive setup for every desktop mode but not regular chat', () => {
		expect(getDesktopAssistantProfile('desktop-assistant-one-shot').suppressInteractiveSetup).toBe(
			true,
		);
		expect(getDesktopAssistantProfile('desktop-assistant-promote').suppressInteractiveSetup).toBe(
			true,
		);
		expect(getDesktopAssistantProfile('desktop-assistant-edit').suppressInteractiveSetup).toBe(
			true,
		);
		expect(getDesktopAssistantProfile(undefined).suppressInteractiveSetup).toBe(false);
	});
});
