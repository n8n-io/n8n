import type { AgentJsonConfig } from '@n8n/api-types';

import { profileAgentTools, summarizeStakes } from '../tool-profile';

const baseConfig: AgentJsonConfig = {
	name: 'Support agent',
	model: 'anthropic/claude-sonnet-5-5',
	instructions: 'Help customers.',
};

describe('profileAgentTools', () => {
	it('sorts a node tool by its operation', () => {
		const profiles = profileAgentTools({
			...baseConfig,
			tools: [
				{
					type: 'node',
					name: 'list_orders',
					node: {
						nodeType: 'n8n-nodes-base.shopify',
						nodeTypeVersion: 1,
						nodeParameters: { resource: 'order', operation: 'getAll' },
					},
				},
				{
					type: 'node',
					name: 'email_customer',
					node: {
						nodeType: 'n8n-nodes-base.gmail',
						nodeTypeVersion: 2,
						nodeParameters: { resource: 'message', operation: 'send' },
					},
					requireApproval: true,
				},
			],
		});

		expect(profiles).toEqual([
			expect.objectContaining({
				name: 'list_orders',
				source: 'node',
				action: 'reads',
				basis: 'operation',
				requireApproval: false,
			}),
			expect.objectContaining({
				name: 'email_customer',
				source: 'node',
				action: 'acts',
				basis: 'operation',
				requireApproval: true,
			}),
		]);
	});

	it('treats a node tool with no operation as acting, the safe default', () => {
		const [profile] = profileAgentTools({
			...baseConfig,
			tools: [
				{
					type: 'node',
					name: 'call_api',
					node: { nodeType: 'n8n-nodes-base.httpRequest', nodeTypeVersion: 4, nodeParameters: {} },
				},
			],
		});

		expect(profile).toEqual(expect.objectContaining({ action: 'acts', basis: 'default' }));
	});

	it('sorts a workflow tool by its name', () => {
		const [profile] = profileAgentTools({
			...baseConfig,
			tools: [{ type: 'workflow', workflow: 'Search knowledge base', name: 'search_kb' }],
		});

		expect(profile).toEqual(
			expect.objectContaining({
				name: 'search_kb',
				source: 'workflow',
				action: 'reads',
				basis: 'name',
			}),
		);
	});

	it('lists an MCP server once, by its read and write permissions', () => {
		const profiles = profileAgentTools({
			...baseConfig,
			mcpServers: [
				{
					name: 'github',
					url: 'https://example.com/mcp',
					transport: 'streamableHttp',
					authentication: 'none',
					toolPermissions: {
						categories: { read: 'always_allow', write: 'require_approval' },
					},
				},
			],
		});

		expect(profiles).toEqual([
			expect.objectContaining({
				name: 'github',
				source: 'mcp',
				action: 'acts',
				basis: 'default',
				requireApproval: true,
			}),
		]);
	});

	it('sorts common shop and calendar verbs the MCP lists do not know', () => {
		const profiles = profileAgentTools({
			...baseConfig,
			tools: [
				{ type: 'workflow', workflow: 'Check calendar', name: 'check_calendar' },
				{ type: 'workflow', workflow: 'Issue refund', name: 'issue_refund' },
				{ type: 'workflow', workflow: 'Book meeting', name: 'book_meeting' },
				{ type: 'workflow', workflow: 'Scrape page', name: 'scrape_page' },
			],
		});

		expect(profiles.map((p) => [p.name, p.action, p.basis])).toEqual([
			['check_calendar', 'reads', 'name'],
			['issue_refund', 'acts', 'name'],
			['book_meeting', 'acts', 'name'],
			['scrape_page', 'reads', 'name'],
		]);
	});

	it('skips disabled tools', () => {
		const profiles = profileAgentTools({
			...baseConfig,
			tools: [{ type: 'custom', id: 'old_tool', enabled: false }],
		});

		expect(profiles).toEqual([]);
	});
});

describe('summarizeStakes', () => {
	it('reads only when no tool acts', () => {
		expect(
			summarizeStakes([
				{ name: 'a', source: 'node', action: 'reads', basis: 'operation', requireApproval: false },
			]),
		).toBe('reads-only');
	});

	it('acts with approval when every acting tool asks first', () => {
		expect(
			summarizeStakes([
				{ name: 'a', source: 'node', action: 'reads', basis: 'operation', requireApproval: false },
				{ name: 'b', source: 'node', action: 'acts', basis: 'operation', requireApproval: true },
			]),
		).toBe('acts-with-approval');
	});

	it('acts on its own when any acting tool runs without approval', () => {
		expect(
			summarizeStakes([
				{ name: 'b', source: 'node', action: 'acts', basis: 'operation', requireApproval: true },
				{ name: 'c', source: 'custom', action: 'acts', basis: 'default', requireApproval: false },
			]),
		).toBe('acts-on-its-own');
	});

	it('has no tools when the list is empty', () => {
		expect(summarizeStakes([])).toBe('no-tools');
	});
});
