import { describe, it, expect } from 'vitest';
import type { AgentCapabilitySummary, ChatIntegrationDescriptor } from '@n8n/api-types';
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
	it('orders chips as channels, tools, skills, tasks', () => {
		const summary = makeSummary({
			channels: [{ type: 'slack' }],
			tools: [{ type: 'node', name: 'get_prs' }],
			skills: [{ id: 's1', name: 'PR Reviewer' }],
			tasks: [{ id: 't1', name: 'Weekly Summary', enabled: true }],
		});

		const labels = buildAgentCardChips(summary, null).map((c) => c.label);
		expect(labels).toEqual(['slack', 'Get prs', 'PR Reviewer', 'Weekly Summary']);
	});

	it('humanizes raw tool names like the edit page', () => {
		const summary = makeSummary({
			tools: [{ type: 'node', name: 'send_telegram_message' }],
		});

		expect(buildAgentCardChips(summary, null)[0].label).toBe('Send telegram message');
	});

	it('collapses 2+ tools of the same resolved node type into one "N {NodeType}" chip', () => {
		const summary = makeSummary({
			tools: [
				{ type: 'node', name: 'send_message', nodeType: 'telegramTool', nodeTypeVersion: 1 },
				{ type: 'node', name: 'get_chat', nodeType: 'telegramTool', nodeTypeVersion: 1 },
			],
		});
		const resolve = (nodeType: string) => (nodeType === 'telegramTool' ? 'Telegram' : undefined);

		const chips = buildAgentCardChips(summary, null, resolve);
		expect(chips).toHaveLength(1);
		expect(chips[0].label).toBe('2 Telegram');
	});

	it('keeps a single node-type tool as an individual humanized chip', () => {
		const summary = makeSummary({
			tools: [{ type: 'node', name: 'send_message', nodeType: 'telegramTool', nodeTypeVersion: 1 }],
		});

		const chips = buildAgentCardChips(summary, null, () => 'Telegram');
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
		expect(buildAgentCardChips(summary, null).map((c) => c.label)).toEqual([
			'Send message',
			'Get chat',
		]);
	});

	it('groups channels by type with a count prefix when repeated', () => {
		const summary = makeSummary({ channels: [{ type: 'slack' }, { type: 'slack' }] });

		const chips = buildAgentCardChips(summary, null);
		expect(chips).toHaveLength(1);
		expect(chips[0].label).toBe('2 slack');
	});

	it('resolves channel label and icon from the integrations catalog when loaded', () => {
		const integrations = [
			{ type: 'slack', label: 'Slack', icon: 'slack' },
		] as unknown as ChatIntegrationDescriptor[];
		const summary = makeSummary({ channels: [{ type: 'slack' }, { type: 'slack' }] });

		const chips = buildAgentCardChips(summary, integrations);
		expect(chips[0].label).toBe('2 Slack');
		expect(chips[0].icon).toBe('slack');
	});

	it('falls back to a generic icon for an unknown channel integration', () => {
		const summary = makeSummary({ channels: [{ type: 'mystery' }] });

		const chips = buildAgentCardChips(summary, []);
		expect(chips[0].icon).toBe('zap');
		expect(chips[0].label).toBe('mystery');
	});

	it('maps tool types to icons', () => {
		const summary = makeSummary({
			tools: [
				{ type: 'workflow', name: 'Run WF' },
				{ type: 'custom', name: 'My Code' },
				{ type: 'node', name: 'HTTP' },
			],
		});

		const chips = buildAgentCardChips(summary, null);
		expect(chips.map((c) => c.icon)).toEqual(['workflow', 'code', 'wrench']);
	});

	it('uses sparkles for skills and clipboard-list for tasks', () => {
		const summary = makeSummary({
			skills: [{ id: 's1', name: 'Skill' }],
			tasks: [{ id: 't1', name: 'Task', enabled: false }],
		});

		const chips = buildAgentCardChips(summary, null);
		expect(chips.find((c) => c.key.startsWith('skill:'))?.icon).toBe('sparkles');
		expect(chips.find((c) => c.key.startsWith('task:'))?.icon).toBe('clipboard-list');
	});
});
