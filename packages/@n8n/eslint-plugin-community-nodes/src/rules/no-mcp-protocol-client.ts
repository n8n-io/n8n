import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import type { TSESTree } from '@typescript-eslint/utils';

import {
	createRule,
	getPropertyKeyName,
	getStringLiteralValue,
	isFileType,
} from '../utils/index.js';

const MCP_METHODS = new Set([
	'tools/call',
	'tools/list',
	'initialize',
	'resources/list',
	'resources/read',
	'prompts/list',
	'prompts/get',
	'notifications/initialized',
]);

export const NoMcpProtocolClientRule = createRule({
	name: 'no-mcp-protocol-client',
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow MCP JSON-RPC clients in community node packages',
		},
		messages: {
			mcpProtocol:
				"This node speaks MCP JSON-RPC. n8n ships its own MCP Client node, so a package that only proxies an MCP server duplicates a built-in. Use the vendor's REST API, with resources and operations modelled on it. If the vendor has no REST API, the package is not currently eligible for verification.",
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (!isFileType(context.filename, '.ts')) return {};

		let hasProtocol = false;
		const protocolVersions: TSESTree.Property[] = [];

		return {
			Property(node) {
				if (node.parent.type !== AST_NODE_TYPES.ObjectExpression) return;

				const key = getPropertyKeyName(node);
				const value = getStringLiteralValue(node.value);
				if (
					(key === 'jsonrpc' && value === '2.0') ||
					(key === 'method' && value !== null && MCP_METHODS.has(value))
				) {
					hasProtocol = true;
					context.report({ node, messageId: 'mcpProtocol' });
				} else if (key === 'protocolVersion') {
					protocolVersions.push(node);
				} else if (
					key?.toLowerCase() === 'mcp-session-id' ||
					key?.toLowerCase() === 'mcp-protocol-version'
				) {
					context.report({ node, messageId: 'mcpProtocol' });
				}
			},
			'Program:exit'() {
				if (!hasProtocol) return;
				for (const node of protocolVersions) {
					context.report({ node, messageId: 'mcpProtocol' });
				}
			},
		};
	},
});
