import type { INodeTypeDescription } from 'n8n-workflow';

import { serverToNodeDescription } from '../node-description-transform';
import { notionMockServer, linearMockServer } from '../registry/mock-servers';
import { synthesizeMcpRegistryTypeDef } from '../synthesize-type-def';

const baseDescription: INodeTypeDescription = {
	displayName: 'MCP Registry Client Tool',
	name: 'mcpRegistryClientTool',
	icon: 'fa:server',
	group: ['output'],
	version: 1,
	description: 'Connect to a registry-backed MCP server',
	defaults: { name: 'MCP Registry Client Tool' },
	inputs: [],
	outputs: [],
	codex: {
		alias: ['MCP', 'Model Context Protocol'],
		categories: ['AI'],
		subcategories: { AI: ['Model Context Protocol'] },
	},
	credentials: [],
	properties: [
		{
			displayName: 'Endpoint URL',
			name: 'endpointUrl',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Server Transport',
			name: 'serverTransport',
			type: 'hidden',
			default: 'httpStreamable',
		},
		{
			displayName: 'Tools to Include',
			name: 'include',
			type: 'options',
			default: 'all',
			options: [],
		},
	],
};

describe('synthesizeMcpRegistryTypeDef', () => {
	it('produces TypeScript content for the Notion registry node', () => {
		const description = serverToNodeDescription(notionMockServer, baseDescription);
		expect(description).not.toBeNull();

		const content = synthesizeMcpRegistryTypeDef(description!);

		expect(content).toContain('notionMcpOAuth2Api');
		expect(content).toContain('export');
		// Hidden fields should not leak into the agent-facing schema.
		expect(content).not.toContain('endpointUrl');
		expect(content).not.toContain('serverTransport');
	});

	it('produces TypeScript content for the Linear registry node', () => {
		const description = serverToNodeDescription(linearMockServer, baseDescription);
		expect(description).not.toBeNull();

		const content = synthesizeMcpRegistryTypeDef(description!);

		expect(content).toContain('linearMcpOAuth2Api');
		expect(content).toContain('export');
	});
});
