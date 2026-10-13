import { describe, it, expect } from 'vitest';

import { inlineAgentToolTypes } from '../utils/inlineAgentToolTypes';

const nodeTool = (nodeType: string, nodeParameters: unknown = {}) => ({
	type: 'node',
	name: nodeType,
	node: { nodeType, nodeParameters },
});

const inline = (config: unknown) => ({ agentSource: 'inline', inlineAgent: { config } });

describe('inlineAgentToolTypes', () => {
	it.each([['n8n-nodes-base.messageAnAgent'], ['n8n-nodes-base.messageAnAgentTool']])(
		'reads the tools of an inline agent on %s',
		(type) => {
			const types = inlineAgentToolTypes(
				type,
				inline({ tools: [nodeTool('n8n-nodes-base.mySql')] }),
			);

			// Both forms: a rule may name the stored type or the variant the tool runs as.
			expect(types).toEqual(['n8n-nodes-base.mySql', 'n8n-nodes-base.mySqlTool']);
		},
	);

	it('reads an inline agent stored as a JSON string', () => {
		const raw = JSON.stringify({ config: { tools: [nodeTool('n8n-nodes-base.mySql')] } });
		const types = inlineAgentToolTypes('n8n-nodes-base.messageAnAgentTool', {
			agentSource: 'inline',
			inlineAgent: raw,
		});

		expect(types).toEqual(['n8n-nodes-base.mySql', 'n8n-nodes-base.mySqlTool']);
	});

	it('reports the MCP client for an inline agent that holds MCP servers', () => {
		const types = inlineAgentToolTypes(
			'n8n-nodes-base.messageAnAgentTool',
			inline({ mcpServers: [{ name: 'Docs', url: 'https://mcp.example.com' }] }),
		);

		expect(types).toEqual(['@n8n/n8n-nodes-langchain.mcpClientTool']);
	});

	it('reports a registry server by its own type as well as the client it runs on', () => {
		const types = inlineAgentToolTypes(
			'n8n-nodes-base.messageAnAgentTool',
			inline({
				mcpServers: [
					{
						name: 'GitHub',
						url: 'https://mcp.example.com',
						metadata: { nodeTypeName: '@n8n/mcp-registry.github' },
					},
				],
			}),
		);

		expect(types).toEqual(['@n8n/n8n-nodes-langchain.mcpClientTool', '@n8n/mcp-registry.github']);
	});

	it('follows inline agents nested inside inline agents', () => {
		const types = inlineAgentToolTypes(
			'n8n-nodes-base.messageAnAgentTool',
			inline({
				tools: [
					nodeTool(
						'n8n-nodes-base.messageAnAgentTool',
						inline({ tools: [nodeTool('n8n-nodes-base.mySql')] }),
					),
				],
			}),
		);

		expect(types).toEqual([
			'n8n-nodes-base.messageAnAgentTool',
			'n8n-nodes-base.mySql',
			'n8n-nodes-base.mySqlTool',
		]);
	});

	it.each([
		['another node type', 'n8n-nodes-base.slackTool', inline({ tools: [nodeTool('x')] })],
		['a referenced agent', 'n8n-nodes-base.messageAnAgentTool', { agentSource: 'referenced' }],
		[
			'an expression',
			'n8n-nodes-base.messageAnAgentTool',
			{ agentSource: 'inline', inlineAgent: '={{ $json.a }}' },
		],
		[
			'unparsable JSON',
			'n8n-nodes-base.messageAnAgentTool',
			{ agentSource: 'inline', inlineAgent: '{oops' },
		],
		['no parameters', 'n8n-nodes-base.messageAnAgentTool', undefined],
		['no node type', undefined, inline({ tools: [nodeTool('x')] })],
	])('reports nothing for %s', (_label, type, parameters) => {
		expect(inlineAgentToolTypes(type, parameters)).toEqual([]);
	});

	it('skips tools that are not node tools', () => {
		const types = inlineAgentToolTypes(
			'n8n-nodes-base.messageAnAgentTool',
			inline({
				tools: [
					{ type: 'custom', id: 'c1' },
					{ type: 'workflow', workflow: 'w1' },
				],
			}),
		);

		expect(types).toEqual([]);
	});
});
