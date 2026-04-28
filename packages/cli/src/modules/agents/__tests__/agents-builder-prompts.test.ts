import { describe, it, expect } from '@jest/globals';

import {
	buildBuilderPrompt,
	INTERACTIVE_TOOLS_SECTION,
	getConfigRulesSection,
	IMPORTANT_SECTION,
	WORKFLOW_SECTION,
	TOOL_TYPES_SECTION,
} from '../builder/agents-builder-prompts';

describe('buildBuilderPrompt', () => {
	const ctx = {
		configJson: '{}',
		toolList: '(none)',
		builderModel: 'anthropic/claude-sonnet-4-5',
	};

	it('includes INTERACTIVE_TOOLS_SECTION', () => {
		const prompt = buildBuilderPrompt(ctx);
		expect(prompt).toContain('ask_llm');
		expect(prompt).toContain('ask_credential');
		expect(prompt).toContain('ask_question');
	});

	it('includes FEW_SHOT_FLOWS_SECTION', () => {
		const prompt = buildBuilderPrompt(ctx);
		expect(prompt).toContain('Example flows');
	});

	it('does not contain the removed "fill them with empty values" guidance', () => {
		const prompt = buildBuilderPrompt(ctx);
		expect(prompt).not.toContain('fill them with empty values');
	});

	it('does not tell the model to "call list_credentials first to pick the right credential"', () => {
		const prompt = buildBuilderPrompt(ctx);
		expect(prompt).not.toContain('call list_credentials first to pick the right credential');
	});

	it('sections appear in the correct order', () => {
		const prompt = buildBuilderPrompt(ctx);
		const interactiveIdx = prompt.indexOf('Interactive tools (user-facing)');
		const expressionsIdx = prompt.indexOf('n8n expressions');
		expect(interactiveIdx).toBeGreaterThan(-1);
		expect(expressionsIdx).toBeGreaterThan(interactiveIdx);
	});
});

describe('getConfigRulesSection', () => {
	it('references ask_llm instead of list_credentials for the credential rule', () => {
		const section = getConfigRulesSection('anthropic/claude-sonnet-4-5');
		expect(section).toContain('ask_llm');
		expect(section).not.toContain('list_credentials');
	});
});

describe('INTERACTIVE_TOOLS_SECTION', () => {
	it('describes the three interactive tools', () => {
		expect(INTERACTIVE_TOOLS_SECTION).toContain('ask_llm');
		expect(INTERACTIVE_TOOLS_SECTION).toContain('ask_credential');
		expect(INTERACTIVE_TOOLS_SECTION).toContain('ask_question');
	});

	it('warns not to call two interactive tools in parallel', () => {
		expect(INTERACTIVE_TOOLS_SECTION).toContain('Never call two interactive tools in parallel');
	});
});

describe('WORKFLOW_SECTION', () => {
	it('instructs to call ask_llm first for fresh agents', () => {
		expect(WORKFLOW_SECTION).toContain('ask_llm');
	});

	it('instructs to call ask_credential before adding node tools', () => {
		expect(WORKFLOW_SECTION).toContain('ask_credential');
	});

	it('instructs to register created skills in skills, not tools', () => {
		expect(WORKFLOW_SECTION).toContain('attaches the returned skill id to `skills`');
		expect(WORKFLOW_SECTION).not.toContain('append the returned skill id to `tools`');
	});
});

describe('TOOL_TYPES_SECTION', () => {
	it('instructs to use ask_credential for node tool credential slots', () => {
		expect(TOOL_TYPES_SECTION).toContain('ask_credential');
	});

	it('instructs to create and register skills', () => {
		expect(TOOL_TYPES_SECTION).toContain('create_skill');
		expect(TOOL_TYPES_SECTION).toContain('Use when');
		expect(TOOL_TYPES_SECTION).toContain('{ "type": "skill", "id": "<returned id>" }');
		expect(TOOL_TYPES_SECTION).toContain('in one operation');
	});

	it('no longer tells the model to fill credentials with empty values', () => {
		expect(TOOL_TYPES_SECTION).not.toContain('fill them with empty values');
	});
});

describe('IMPORTANT_SECTION', () => {
	it('instructs to use ask_llm and ask_credential', () => {
		expect(IMPORTANT_SECTION).toContain('ask_llm');
		expect(IMPORTANT_SECTION).toContain('ask_credential');
	});

	it('does not instruct to use list_credentials to pick credentials', () => {
		expect(IMPORTANT_SECTION).not.toContain('Always call list_credentials first');
	});

	it('instructs that create_skill attaches skills', () => {
		expect(IMPORTANT_SECTION).toContain('create_skill');
		expect(IMPORTANT_SECTION).toContain('{ type: "skill", id }');
		expect(IMPORTANT_SECTION).toContain('entry to `skills` in one operation');
	});
});
