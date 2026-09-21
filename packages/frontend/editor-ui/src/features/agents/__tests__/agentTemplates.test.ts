import { describe, it, expect } from 'vitest';
import type { AgentJsonConfig } from '@n8n/api-types';
import { AGENT_TEMPLATES, applyAgentTemplate, isAgentConfigBlank } from '../agentTemplates';

function blankConfig(overrides: Partial<AgentJsonConfig> = {}): AgentJsonConfig {
	return {
		name: 'New Agent',
		model: '',
		instructions: '',
		...overrides,
	};
}

describe('isAgentConfigBlank', () => {
	it('is blank when instructions and tools are empty', () => {
		expect(isAgentConfigBlank(blankConfig())).toBe(true);
	});

	it('is blank when instructions is whitespace and tools is undefined', () => {
		expect(isAgentConfigBlank(blankConfig({ instructions: '   ' }))).toBe(true);
	});

	it('is not blank when instructions has content', () => {
		expect(isAgentConfigBlank(blankConfig({ instructions: 'x' }))).toBe(false);
	});

	it('is not blank when tools is non-empty', () => {
		expect(
			isAgentConfigBlank(
				blankConfig({
					tools: [
						{
							type: 'node',
							name: 'Wikipedia',
							description: 'Search Wikipedia.',
							node: {
								nodeType: '@n8n/n8n-nodes-langchain.toolWikipedia',
								nodeTypeVersion: 1,
								nodeParameters: {},
							},
						},
					],
				}),
			),
		).toBe(false);
	});

	it('is not blank when integrations is non-empty', () => {
		expect(
			isAgentConfigBlank(
				blankConfig({ integrations: [{ type: 'telegram', credentialId: 'cred-1' }] }),
			),
		).toBe(false);
	});
});

describe('applyAgentTemplate', () => {
	it('returns null when the agent already has instructions', () => {
		expect(
			applyAgentTemplate(blankConfig({ instructions: 'hi' }), AGENT_TEMPLATES[0], 'New Agent'),
		).toBeNull();
	});

	it('writes instructions, tools and replaces the default name', () => {
		const template = AGENT_TEMPLATES.find((t) => t.id === 'research-assistant')!;
		const result = applyAgentTemplate(blankConfig(), template, 'New Agent');

		expect(result).not.toBeNull();
		expect(result?.name).toBe('Research Assistant');
		expect(result?.instructions).toBe(template.config.instructions);
		expect(result?.tools).toHaveLength(2);
	});

	it('keeps a renamed agent name', () => {
		const template = AGENT_TEMPLATES[0];
		const result = applyAgentTemplate(blankConfig({ name: 'Ops bot' }), template, 'New Agent');

		expect(result?.name).toBe('Ops bot');
	});

	it('preserves model and other fields', () => {
		const template = AGENT_TEMPLATES[0];
		const result = applyAgentTemplate(
			blankConfig({ model: 'openai/gpt-5' }),
			template,
			'New Agent',
		);

		expect(result?.model).toBe('openai/gpt-5');
	});

	it('writes an empty tools array for a template without tools', () => {
		const template = AGENT_TEMPLATES.find((t) => t.id === 'data-analyst')!;
		const result = applyAgentTemplate(blankConfig(), template, 'New Agent');

		expect(result?.tools).toEqual([]);
	});

	it('writes draft integrations from the template', () => {
		const template = AGENT_TEMPLATES.find((t) => t.id === 'customer-support')!;
		const result = applyAgentTemplate(blankConfig(), template, 'New Agent');

		expect(result?.integrations).toEqual([{ type: 'telegram', credentialId: '' }]);
	});

	it('writes an empty integrations array for a template without integrations', () => {
		const template = AGENT_TEMPLATES.find((t) => t.id === 'data-analyst')!;
		const result = applyAgentTemplate(blankConfig(), template, 'New Agent');

		expect(result?.integrations).toEqual([]);
	});
});

describe('AGENT_TEMPLATES', () => {
	it('has the four expected ids in order', () => {
		expect(AGENT_TEMPLATES.map((t) => t.id)).toEqual([
			'customer-support',
			'research-assistant',
			'data-analyst',
			'social-media-monitor',
		]);
	});

	it('never sets a model on a template config', () => {
		for (const template of AGENT_TEMPLATES) {
			expect('model' in template.config).toBe(false);
		}
	});
});
