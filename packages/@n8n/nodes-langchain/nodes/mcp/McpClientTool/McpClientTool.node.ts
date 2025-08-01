import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { McpClientToolV1 } from './v1/McpClientToolV1.node';
import { McpClientToolV2 } from './v2/McpClientToolV2.node';

export class McpClientTool extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'MCP Client Tool',
			name: 'mcpClientTool',
			icon: {
				light: 'file:../mcp.svg',
				dark: 'file:../mcp.dark.svg',
			},
			group: ['output'],
			defaultVersion: 2,
			description: 'Connect tools from an MCP Server',
			codex: {
				categories: ['AI'],
				subcategories: {
					AI: ['Model Context Protocol', 'Tools'],
				},
				alias: ['Model Context Protocol', 'MCP Client'],
				resources: {
					primaryDocumentation: [
						{
							url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolmcp/',
						},
					],
				},
			},
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new McpClientToolV1(baseDescription),
			2: new McpClientToolV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
