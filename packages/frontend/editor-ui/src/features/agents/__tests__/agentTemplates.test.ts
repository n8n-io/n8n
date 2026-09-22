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
							name: 'Gmail',
							description: 'Read emails.',
							node: {
								nodeType: 'n8n-nodes-base.gmail',
								nodeTypeVersion: 2,
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
		const template = AGENT_TEMPLATES.find((t) => t.id === 'process-incoming-emails')!;
		const result = applyAgentTemplate(blankConfig(), template, 'New Agent');

		expect(result).not.toBeNull();
		expect(result?.name).toBe('Process Incoming Emails');
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
		const template = AGENT_TEMPLATES.find((t) => t.id === 'qualify-new-leads')!;
		const result = applyAgentTemplate(blankConfig(), template, 'New Agent');

		expect(result?.tools).toEqual([]);
	});

	it('writes an empty integrations array for a template without integrations', () => {
		const template = AGENT_TEMPLATES.find((t) => t.id === 'qualify-new-leads')!;
		const result = applyAgentTemplate(blankConfig(), template, 'New Agent');

		expect(result?.integrations).toEqual([]);
	});

	it('writes config.webSearch for the morning news brief template', () => {
		const template = AGENT_TEMPLATES.find((t) => t.id === 'morning-news-brief')!;
		const result = applyAgentTemplate(blankConfig(), template, 'New Agent');

		expect(result?.config?.webSearch).toEqual({ enabled: true, provider: 'native' });
	});

	it('declares a daily 9am task for the morning news brief template', () => {
		const template = AGENT_TEMPLATES.find((t) => t.id === 'morning-news-brief')!;

		expect(template.tasks).toHaveLength(1);
		expect(template.tasks?.[0]).toEqual({
			name: 'Morning news brief',
			objective: expect.stringContaining('top headlines'),
			cronExpression: '0 9 * * *',
		});
	});

	it('writes draft (empty id) credentials for tools that need them', () => {
		const template = AGENT_TEMPLATES.find((t) => t.id === 'process-incoming-emails')!;
		const result = applyAgentTemplate(blankConfig(), template, 'New Agent');
		const tools = result?.tools ?? [];

		expect(tools).toHaveLength(2);
		for (const tool of tools) {
			if (tool.type !== 'node') continue;
			for (const cred of Object.values(tool.node.credentials ?? {})) {
				expect(cred.id).toBe('');
			}
		}
	});

	it('writes a draft credential for the linkedin outreach tool', () => {
		const template = AGENT_TEMPLATES.find((t) => t.id === 'linkedin-outreach')!;
		const result = applyAgentTemplate(blankConfig(), template, 'New Agent');
		const tool = result?.tools?.[0];

		expect(tool?.type).toBe('node');
		if (tool?.type === 'node') {
			const cred = Object.values(tool.node.credentials ?? {})[0];
			expect(cred?.id).toBe('');
		}
	});
});

describe('AGENT_TEMPLATES', () => {
	it('has the four expected ids in order', () => {
		expect(AGENT_TEMPLATES.map((t) => t.id)).toEqual([
			'morning-news-brief',
			'process-incoming-emails',
			'qualify-new-leads',
			'linkedin-outreach',
		]);
	});

	it('never sets a model on a template config', () => {
		for (const template of AGENT_TEMPLATES) {
			expect('model' in template.config).toBe(false);
		}
	});

	it('each template has an icon', () => {
		for (const template of AGENT_TEMPLATES) {
			expect(template.icon).toBeTruthy();
		}
	});
});
