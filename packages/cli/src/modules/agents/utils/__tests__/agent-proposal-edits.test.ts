import type { AgentJsonConfig, AgentSkill } from '@n8n/api-types';

import { agentToolModelName, applyAgentEdits } from '../agent-proposal-edits';

const node = { nodeType: 'n8n-nodes-base.httpRequestTool', nodeTypeVersion: 1, nodeParameters: {} };
const config: AgentJsonConfig = {
	name: 'Support agent',
	model: 'openai/gpt-5',
	instructions: 'Help with support tickets.',
	tools: [
		{ type: 'node', name: 'Find Order', description: 'Finds an order.', node },
		{ type: 'workflow', workflow: 'Find customer', name: 'Find Customer' },
		{ type: 'workflow', workflow: 'Refund order' },
		{ type: 'custom', id: 'calculator' },
	],
};
const skills: Record<string, AgentSkill> = {
	refunds: { name: 'Refunds', description: 'Refund rules.', instructions: 'Refund in 14 days.' },
};

describe('agentToolModelName', () => {
	it('returns the name that the model sees', () => {
		const [nodeTool, namedWorkflow, workflow] = config.tools ?? [];
		if (
			nodeTool.type !== 'node' ||
			namedWorkflow.type !== 'workflow' ||
			workflow.type !== 'workflow'
		)
			throw new Error('Unexpected fixture');
		expect(agentToolModelName(nodeTool)).toBe('Find_Order');
		expect(agentToolModelName(namedWorkflow)).toBe('find-customer');
		expect(agentToolModelName(workflow)).toBe('refund-order');
	});
});

describe('applyAgentEdits', () => {
	it('applies each kind of edit and does not change its arguments', () => {
		const originalConfig = structuredClone(config);
		const originalSkills = structuredClone(skills);

		const result = applyAgentEdits(config, skills, [
			{ kind: 'instructions', after: 'Help with orders.' },
			{ kind: 'toolDescription', toolType: 'node', toolName: 'Find_Order', after: 'By order ID.' },
			{
				kind: 'toolDescription',
				toolType: 'workflow',
				toolName: 'refund-order',
				after: 'Refunds one order.',
			},
			{ kind: 'skill', skillId: 'refunds', field: 'instructions', after: 'Refund in 30 days.' },
		]);

		expect(result.config.instructions).toBe('Help with orders.');
		expect(result.config.tools).toEqual([
			{ type: 'node', name: 'Find Order', description: 'By order ID.', node },
			{ type: 'workflow', workflow: 'Find customer', name: 'Find Customer' },
			{ type: 'workflow', workflow: 'Refund order', description: 'Refunds one order.' },
			{ type: 'custom', id: 'calculator' },
		]);
		expect(result.skills.refunds).toEqual({
			name: 'Refunds',
			description: 'Refund rules.',
			instructions: 'Refund in 30 days.',
		});
		expect(config).toEqual(originalConfig);
		expect(skills).toEqual(originalSkills);
	});

	it('returns equal content when the edit list is empty', () => {
		expect(applyAgentEdits(config, skills, [])).toEqual({ config, skills });
	});

	it('rejects an edit of a tool that the agent does not have', () => {
		expect(() =>
			applyAgentEdits(config, skills, [
				{ kind: 'toolDescription', toolType: 'workflow', toolName: 'Find_Order', after: 'x' },
			]),
		).toThrow('The agent has no workflow tool with the name "Find_Order".');
	});

	it('rejects an edit of a disabled tool', () => {
		const disabled: AgentJsonConfig = {
			...config,
			tools: [{ type: 'node', name: 'Find Order', enabled: false, node }],
		};
		expect(() =>
			applyAgentEdits(disabled, skills, [
				{ kind: 'toolDescription', toolType: 'node', toolName: 'Find_Order', after: 'x' },
			]),
		).toThrow('The agent has no node tool');
	});

	it('rejects an edit that matches more than one tool', () => {
		const ambiguous: AgentJsonConfig = {
			...config,
			tools: [
				{ type: 'node', name: 'Find Order', node },
				{ type: 'node', name: 'Find_Order', node },
			],
		};
		expect(() =>
			applyAgentEdits(ambiguous, skills, [
				{ kind: 'toolDescription', toolType: 'node', toolName: 'Find_Order', after: 'x' },
			]),
		).toThrow('The agent has more than one node tool');
	});

	it('rejects an edit of an MCP server description', () => {
		const withMcp = {
			...config,
			mcpServers: [{ name: 'crm', url: 'https://example.com/mcp' }],
		} as AgentJsonConfig;
		expect(() =>
			applyAgentEdits(withMcp, skills, [
				{ kind: 'toolDescription', toolType: 'mcp', toolName: 'crm', after: 'x' },
			]),
		).toThrow('The agent has no mcp tool');
	});

	it('rejects an edit of a skill that the agent does not have', () => {
		expect(() =>
			applyAgentEdits(config, skills, [
				{ kind: 'skill', skillId: 'missing', field: 'description', after: 'x' },
			]),
		).toThrow('The agent has no skill with the ID "missing".');
	});
});
