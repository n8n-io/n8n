import type { AgentJsonConfig } from '@n8n/api-types';
import { describe, expect, it } from 'vitest';

import { scriptedDecisions } from '../../__tests__/scripted-decisions';
import { NodeRegistry } from '../../workflow-compiler/catalog/node-registry';
import type { AgentCapabilityCatalog } from '../catalog/capabilities';
import { compileAgent } from '../compiler/compile';
import { extractAgentRequirements } from '../requirements/extract';
import { enumerateAgentScenarios, scenarioCoverage } from '../scenarios/enumerate';
import { AgentCompilerService } from '../service';

function catalog(overrides: Partial<AgentCapabilityCatalog> = {}): AgentCapabilityCatalog {
	return {
		channels: [
			{ type: 'slack', label: 'Slack', icon: 'slack', credentialTypes: ['slackApi'] },
			{ type: 'telegram', label: 'Telegram', icon: 'telegram', credentialTypes: ['telegramApi'] },
		],
		workflows: [{ id: 'wf-refund', name: 'Issue refund', published: true }],
		agents: [
			{ agentId: 'ag-billing', name: 'Billing Agent', published: true },
			{ agentId: 'ag-support', name: 'Support Agent', published: false },
		],
		nodeRegistry: new NodeRegistry(),
		defaultModel: { model: 'anthropic/claude-sonnet-4-5', credential: 'cred-anthropic' },
		limitations: [],
		...overrides,
	};
}

const REQUEST =
	'Create a Slack agent called "Sales Helper" that answers questions about our pricing. ' +
	'It should upsert new leads in HubSpot and post a summary to #sales. ' +
	'It can use the Issue refund workflow. Delegate billing questions to the Billing Agent. ' +
	'Every morning at 9am, summarize new leads. Never promise discounts.';

describe('extractAgentRequirements', () => {
	const requirements = extractAgentRequirements(REQUEST);

	it('reads name, channel, purpose, tools, workflow, sub-agent, schedule and rules', () => {
		expect(requirements.name).toMatchObject({ value: 'Sales Helper', source: 'user' });
		expect(requirements.channels).toEqual([{ name: 'slack', supported: true, type: 'slack' }]);
		expect(requirements.purpose.status).toBe('resolved');
		expect(requirements.toolActions.map((action) => action.integration)).toEqual([
			'hubspot',
			'slack',
		]);
		expect(requirements.workflowTools).toEqual(['Issue refund']);
		expect(requirements.subAgentNames).toEqual(['Billing']);
		expect(requirements.schedules[0]).toMatchObject({ cron: '0 9 * * *' });
		expect(requirements.rules).toEqual(['Never promise discounts']);
	});

	it('flags unsupported channels without guessing', () => {
		const whatsapp = extractAgentRequirements('Build a WhatsApp bot that answers FAQs');
		expect(whatsapp.channels).toEqual([{ name: 'whatsapp', supported: false }]);
	});
});

describe('AgentCompilerService.create', () => {
	it('compiles a runnable agent config in one decision wave', async () => {
		const service = new AgentCompilerService({ decisions: scriptedDecisions() });
		const result = await service.create({
			ref: 'sales-helper',
			request: REQUEST,
			catalog: catalog(),
		});
		expect(result.status).toBe('compiled');
		if (result.status !== 'compiled') return;
		const { config } = result;
		expect(config.name).toBe('Sales Helper');
		expect(config.model).toBe('anthropic/claude-sonnet-4-5');
		expect(config.credential).toBe('cred-anthropic');
		expect(config.integrations).toEqual([
			{ type: 'slack', credentialId: '', settings: { messagingExperience: 'agent' } },
		]);
		const toolTypes = (config.tools ?? []).map((tool) => tool.type);
		expect(toolTypes.sort()).toEqual(['node', 'node', 'workflow']);
		const hubspot = (config.tools ?? []).find(
			(tool) => tool.type === 'node' && tool.node.nodeType === 'n8n-nodes-base.hubspot',
		);
		expect(hubspot).toMatchObject({
			requireApproval: true,
			node: { nodeParameters: { resource: 'contact', operation: 'upsert' } },
		});
		const workflowTool = (config.tools ?? []).find((tool) => tool.type === 'workflow');
		expect(workflowTool).toMatchObject({ workflowId: 'wf-refund', workflow: 'Issue refund' });
		expect(config.subAgents?.agents).toEqual([
			{ agentId: 'ag-billing', useWhen: 'the request is about Billing' },
		]);
		expect(result.tasks).toEqual([
			expect.objectContaining({ cronExpression: '0 9 * * *', timezone: 'UTC', enabled: true }),
		]);
		expect(config.instructions).toContain('# Role');
		expect(config.instructions).toContain('Never promise discounts');
		expect(config.instructions).toContain('## Instructions from the user');
		expect(result.report.schema).toBe('pass');
		expect(result.report.references).toBe('pass');
		expect(result.report.channels).toBe('warn');
		expect(result.report.previewScenarios).toBe('not_run');
		expect(result.scenarios.map((scenario) => scenario.kind)).toEqual([
			'tool',
			'tool',
			'tool',
			'sub_agent',
			'task',
			'direct_answer',
			'refusal',
		]);
		expect(result.diagnostics.decisionWaves).toBeLessThanOrEqual(1);
	});

	it('asks about an unsupported channel and continues with the answer', async () => {
		const service = new AgentCompilerService({ decisions: scriptedDecisions() });
		const first = await service.create({
			ref: 'faq',
			request: 'Build a WhatsApp bot that answers questions about our return policy',
			catalog: catalog(),
		});
		expect(first.status).toBe('needs_clarification');
		if (first.status !== 'needs_clarification') return;
		expect(first.message).toContain('Agents cannot connect to whatsapp');
		const second = await service.create({
			ref: 'faq',
			sessionId: first.sessionId,
			request: 'Use Telegram instead',
			catalog: catalog(),
		});
		expect(second.status).toBe('compiled');
		if (second.status !== 'compiled') return;
		expect(second.config.integrations?.map((integration) => integration.type)).toEqual([
			'telegram',
		]);
	});

	it('reports a missing workflow tool as a required artifact', async () => {
		const service = new AgentCompilerService({ decisions: scriptedDecisions() });
		const result = await service.create({
			ref: 'ops',
			request:
				'Create an agent that helps with orders. It should use the Restock inventory workflow.',
			catalog: catalog(),
		});
		expect(result.status).toBe('needs_artifacts');
		if (result.status !== 'needs_artifacts') return;
		expect(result.artifacts[0]).toMatchObject({
			type: 'workflow',
			name: 'Restock inventory',
			relationship: 'agent-tool',
		});
	});

	it('saves a draft when no model is available', async () => {
		const service = new AgentCompilerService({ decisions: scriptedDecisions() });
		const result = await service.create({
			ref: 'draft',
			request: 'Create an agent that answers questions about our holiday policy',
			catalog: catalog({ defaultModel: null }),
		});
		expect(result.status).toBe('compiled');
		if (result.status !== 'compiled') return;
		expect(result.config.model).toBe('');
		expect(result.report.runnable).toBe('warn');
	});
});

describe('AgentCompilerService.edit', () => {
	async function baseline(): Promise<AgentJsonConfig> {
		const service = new AgentCompilerService({ decisions: scriptedDecisions() });
		const result = await service.create({
			ref: 'sales-helper',
			request: REQUEST,
			catalog: catalog(),
		});
		if (result.status !== 'compiled') throw new Error('setup failed');
		return result.config;
	}

	it('adds a node tool and a usage rule without touching the rest', async () => {
		const config = await baseline();
		const service = new AgentCompilerService({ decisions: scriptedDecisions() });
		const result = await service.edit({
			ref: 'sales-helper',
			agentId: 'ag-1',
			request: 'Also let it look up rows in Postgres table leads',
			config,
			catalog: catalog(),
		});
		expect(result.status).toBe('compiled');
		if (result.status !== 'compiled') return;
		expect(result.config.tools?.length).toBe((config.tools?.length ?? 0) + 1);
		expect(result.config.instructions.startsWith(config.instructions.split('\n## Rules')[0])).toBe(
			true,
		);
		expect(result.config.instructions).toMatch(
			/- Use [\w-]+ when let it look up rows in postgres table leads/,
		);
		expect(result.changed).toEqual(['add_tool', 'append_rule']);
	});

	it('removes a tool named in the request', async () => {
		const config = await baseline();
		const service = new AgentCompilerService({ decisions: scriptedDecisions() });
		const result = await service.edit({
			ref: 'sales-helper',
			agentId: 'ag-1',
			request: 'Remove the Issue refund tool',
			config,
			catalog: catalog(),
		});
		expect(result.status).toBe('compiled');
		if (result.status !== 'compiled') return;
		expect(result.config.tools?.some((tool) => tool.type === 'workflow')).toBe(false);
	});

	it('connects a channel, sets memory and the model', async () => {
		const config = await baseline();
		const service = new AgentCompilerService({ decisions: scriptedDecisions() });
		const telegram = await service.edit({
			ref: 'r',
			agentId: 'ag-1',
			request: 'Connect it to Telegram too',
			config,
			catalog: catalog(),
		});
		if (telegram.status !== 'compiled') throw new Error(JSON.stringify(telegram));
		expect(telegram.config.integrations?.map((integration) => integration.type).sort()).toEqual([
			'slack',
			'telegram',
		]);
		const memory = await service.edit({
			ref: 'r',
			agentId: 'ag-1',
			request: 'Make it remember previous conversations',
			config,
			catalog: catalog(),
		});
		if (memory.status !== 'compiled') throw new Error(JSON.stringify(memory));
		expect(memory.config.memory).toMatchObject({
			enabled: true,
			observationalMemory: { enabled: true },
		});
		const model = await service.edit({
			ref: 'r',
			agentId: 'ag-1',
			request: 'Switch the model to openai/gpt-5',
			config,
			catalog: catalog(),
		});
		if (model.status !== 'compiled') throw new Error(JSON.stringify(model));
		expect(model.config.model).toBe('openai/gpt-5');
	});

	it('asks when the target is ambiguous and the decision service abstains', async () => {
		const config = await baseline();
		const service = new AgentCompilerService();
		const result = await service.edit({
			ref: 'r',
			agentId: 'ag-1',
			request: 'Remove that tool',
			config,
			catalog: catalog(),
		});
		expect(result.status).toBe('needs_clarification');
		if (result.status !== 'needs_clarification') return;
		expect(result.message).toContain('Which tool');
	});
});

describe('scenarios', () => {
	it('measures which behavior paths a set of preview runs exercised', async () => {
		const service = new AgentCompilerService({ decisions: scriptedDecisions() });
		const result = await service.create({
			ref: 'sales-helper',
			request: REQUEST,
			catalog: catalog(),
		});
		if (result.status !== 'compiled') throw new Error('setup failed');
		const scenarios = result.scenarios;
		const coverage = scenarioCoverage(scenarios, [
			{
				scenarioId: scenarios[0].id,
				response: 'done',
				toolCalls: scenarios[0].expectedTools,
				status: 'completed',
			},
			{
				scenarioId: 'direct-answer',
				response: 'I help with pricing.',
				toolCalls: [],
				status: 'completed',
			},
		]);
		expect(coverage.covered).toBe(2);
		expect(coverage.uncovered.map((entry) => entry.reason)[0]).toBe('not run');
	});

	it('is deterministic across compiles', () => {
		const first = compileAgent(
			{
				ref: 'a',
				name: 'A',
				purpose: 'help',
				instructions: { role: 'r', goals: [], rules: [] },
				channels: [],
				model: { mode: 'default' },
				tools: [],
				skills: [],
				tasks: [],
				subAgents: [],
				memory: { observational: false, episodic: false },
				mcpServers: [],
				options: {},
				patternIds: [],
			},
			{ registry: new NodeRegistry(), defaultModel: null },
		);
		const second = compileAgent(
			{
				ref: 'a',
				name: 'A',
				purpose: 'help',
				instructions: { role: 'r', goals: [], rules: [] },
				channels: [],
				model: { mode: 'default' },
				tools: [],
				skills: [],
				tasks: [],
				subAgents: [],
				memory: { observational: false, episodic: false },
				mcpServers: [],
				options: {},
				patternIds: [],
			},
			{ registry: new NodeRegistry(), defaultModel: null },
		);
		expect(first.config).toEqual(second.config);
		expect(
			enumerateAgentScenarios(
				{
					ref: 'a',
					name: 'A',
					purpose: 'help',
					instructions: { role: 'r', goals: [], rules: [] },
					channels: [],
					model: { mode: 'default' },
					tools: [],
					skills: [],
					tasks: [],
					subAgents: [],
					memory: { observational: false, episodic: false },
					mcpServers: [],
					options: {},
					patternIds: [],
				},
				{},
			),
		).toHaveLength(1);
	});
});
