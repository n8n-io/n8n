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

	it('sets the personalisation icon and gradient from the template', () => {
		const template = AGENT_TEMPLATES.find((t) => t.id === 'process-incoming-emails')!;
		const result = applyAgentTemplate(
			blankConfig({
				personalisation: {
					icon: 'bot',
					gradient: {
						from: '#111111',
						to: '#222222',
						angle: 90,
						fromStop: 0,
						toStop: 100,
					},
				},
			}),
			template,
			'New Agent',
		);

		expect(result?.personalisation).toEqual({
			icon: 'mail',
			gradient: template.gradient,
		});
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

	it('writes schema-valid parameters for the email tools', () => {
		const template = AGENT_TEMPLATES.find((t) => t.id === 'process-incoming-emails')!;
		const result = applyAgentTemplate(blankConfig(), template, 'New Agent');
		const tools = result?.tools ?? [];
		const gmail = tools[0];
		const calendar = tools[1];

		expect(gmail?.type).toBe('node');
		expect(calendar?.type).toBe('node');
		if (gmail?.type !== 'node' || calendar?.type !== 'node') return;
		expect(gmail.node.nodeParameters).toEqual({ resource: 'message', operation: 'getAll' });
		expect(calendar.node.nodeParameters).toMatchObject({
			resource: 'event',
			operation: 'create',
			start: expect.stringContaining('$fromAI'),
			end: expect.stringContaining('$fromAI'),
		});
	});

	it('writes a draft credential and availability parameters for the meeting times tool', () => {
		const template = AGENT_TEMPLATES.find((t) => t.id === 'propose-meeting-times')!;
		const result = applyAgentTemplate(blankConfig(), template, 'New Agent');
		const tool = result?.tools?.[0];

		expect(tool?.type).toBe('node');
		if (tool?.type === 'node') {
			const cred = Object.values(tool.node.credentials ?? {})[0];
			expect(cred?.id).toBe('');
			expect(tool.node.nodeParameters).toMatchObject({
				resource: 'calendar',
				operation: 'availability',
				timeMin: expect.stringContaining('$fromAI'),
				timeMax: expect.stringContaining('$fromAI'),
			});
		}
	});
});

describe('AGENT_TEMPLATES', () => {
	it('has the four expected ids in order', () => {
		expect(AGENT_TEMPLATES.map((t) => t.id)).toEqual([
			'morning-news-brief',
			'process-incoming-emails',
			'qualify-new-leads',
			'propose-meeting-times',
		]);
	});

	it('never sets a model on a template config', () => {
		for (const template of AGENT_TEMPLATES) {
			expect('model' in template.config).toBe(false);
		}
	});

	it('each template has an icon and a distinct gradient', () => {
		const seen = new Set<string>();
		for (const template of AGENT_TEMPLATES) {
			expect(template.icon).toBeTruthy();
			expect(template.gradient.from).toMatch(/^#[0-9A-Fa-f]{6}$/);
			expect(template.gradient.to).toMatch(/^#[0-9A-Fa-f]{6}$/);
			const key = `${template.gradient.from}:${template.gradient.to}`;
			expect(seen.has(key)).toBe(false);
			seen.add(key);
		}
	});
});
