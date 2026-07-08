import { describe, it, expect } from 'vitest';
import type { AgentCapabilitySummary } from '@n8n/api-types';
import { buildAgentCardChips } from './canvasNodeAgentChips.utils';

function makeSummary(overrides: Partial<AgentCapabilitySummary> = {}): AgentCapabilitySummary {
	return {
		id: 'agent-1',
		name: 'Test Agent',
		model: null,
		channels: [],
		tools: [],
		skills: [],
		tasks: [],
		...overrides,
	};
}

describe('buildAgentCardChips', () => {
	it('orders chips as tools then skills, omitting channels and tasks', () => {
		const summary = makeSummary({
			channels: [{ type: 'slack' }],
			tools: [{ type: 'node', name: 'get_prs' }],
			skills: [{ id: 's1', name: 'PR Reviewer' }],
			tasks: [{ id: 't1', name: 'Weekly Summary', enabled: true }],
		});

		// Channels + tasks are standalone-agent concepts and don't apply when the
		// agent is invoked by the embedding workflow — only tools + skills show.
		const chips = buildAgentCardChips(summary);
		expect(chips.map((c) => c.label)).toEqual(['Get prs', 'PR Reviewer']);
		expect(chips.some((c) => c.key.startsWith('channel:'))).toBe(false);
		expect(chips.some((c) => c.key.startsWith('task:'))).toBe(false);
	});

	it('humanizes raw tool names like the edit page', () => {
		const summary = makeSummary({
			tools: [{ type: 'node', name: 'send_telegram_message' }],
		});

		expect(buildAgentCardChips(summary)[0].label).toBe('Send telegram message');
	});

	it('collapses 2+ tools of the same resolved node type into one "N {NodeType}" chip', () => {
		const summary = makeSummary({
			tools: [
				{ type: 'node', name: 'send_message', nodeType: 'telegramTool', nodeTypeVersion: 1 },
				{ type: 'node', name: 'get_chat', nodeType: 'telegramTool', nodeTypeVersion: 1 },
			],
		});
		const resolve = (nodeType: string) => (nodeType === 'telegramTool' ? 'Telegram' : undefined);

		const chips = buildAgentCardChips(summary, resolve);
		expect(chips).toHaveLength(1);
		expect(chips[0].label).toBe('2 Telegram');
	});

	it('keeps a single node-type tool as an individual humanized chip', () => {
		const summary = makeSummary({
			tools: [{ type: 'node', name: 'send_message', nodeType: 'telegramTool', nodeTypeVersion: 1 }],
		});

		const chips = buildAgentCardChips(summary, () => 'Telegram');
		expect(chips).toHaveLength(1);
		expect(chips[0].label).toBe('Send message');
	});

	it('leaves node tools ungrouped when the node type does not resolve', () => {
		const summary = makeSummary({
			tools: [
				{ type: 'node', name: 'send_message', nodeType: 'telegramTool', nodeTypeVersion: 1 },
				{ type: 'node', name: 'get_chat', nodeType: 'telegramTool', nodeTypeVersion: 1 },
			],
		});

		// No resolver → node type can't resolve → individual humanized chips.
		expect(buildAgentCardChips(summary).map((c) => c.label)).toEqual(['Send message', 'Get chat']);
	});

	it('maps tool types to icons', () => {
		const summary = makeSummary({
			tools: [
				{ type: 'workflow', name: 'Run WF' },
				{ type: 'custom', name: 'My Code' },
				{ type: 'node', name: 'HTTP' },
			],
		});

		const chips = buildAgentCardChips(summary);
		expect(chips.map((c) => c.icon)).toEqual(['workflow', 'code', 'wrench']);
	});

	it('uses sparkles for skills', () => {
		const summary = makeSummary({
			skills: [{ id: 's1', name: 'Skill' }],
		});

		const chips = buildAgentCardChips(summary);
		expect(chips.find((c) => c.key.startsWith('skill:'))?.icon).toBe('sparkles');
	});

	it('carries the node type on node-tool chips so the card can render the node icon', () => {
		const summary = makeSummary({
			tools: [
				{
					type: 'node',
					name: 'send_message',
					nodeType: 'n8n-nodes-base.telegramTool',
					nodeTypeVersion: 2,
				},
				{ type: 'workflow', name: 'Run WF' },
			],
		});

		const chips = buildAgentCardChips(summary);
		const nodeChip = chips.find((c) => c.label === 'Send message');
		expect(nodeChip).toMatchObject({ nodeType: 'n8n-nodes-base.telegramTool', nodeTypeVersion: 2 });
		// Workflow tools don't carry a node type.
		expect(chips.find((c) => c.label === 'Run wf')?.nodeType).toBeUndefined();
	});

	it('carries the node type on a grouped node chip', () => {
		const summary = makeSummary({
			tools: [
				{
					type: 'node',
					name: 'send_message',
					nodeType: 'n8n-nodes-base.telegramTool',
					nodeTypeVersion: 1,
				},
				{
					type: 'node',
					name: 'get_chat',
					nodeType: 'n8n-nodes-base.telegramTool',
					nodeTypeVersion: 1,
				},
			],
		});

		const chips = buildAgentCardChips(summary, () => 'Telegram');
		expect(chips).toHaveLength(1);
		expect(chips[0]).toMatchObject({
			label: '2 Telegram',
			nodeType: 'n8n-nodes-base.telegramTool',
			nodeTypeVersion: 1,
		});
	});
});
