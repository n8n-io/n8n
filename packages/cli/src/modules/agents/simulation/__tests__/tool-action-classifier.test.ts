import type { BuiltTool } from '@n8n/agents';

import {
	classifyBuiltToolAction,
	classifyHttpMethod,
	classifyToolAction,
} from '../tool-action-classifier';

describe('classifyHttpMethod', () => {
	it.each(['GET', 'get', ' get ', 'HEAD', 'head'])('classifies %s as read_through', (method) => {
		expect(classifyHttpMethod(method)).toBe('read_through');
	});

	it.each([
		'POST',
		'PUT',
		'PATCH',
		'DELETE',
		'OPTIONS',
		'',
		'={{ $fromAI("method") }}',
		undefined,
		null,
		123,
	])('classifies %o as write_hold', (method) => {
		expect(classifyHttpMethod(method)).toBe('write_hold');
	});
});

describe('classifyToolAction', () => {
	describe('standard SaaS read operations', () => {
		it.each([
			{
				label: 'Gmail get message',
				action: {
					toolName: 'gmail_get_message',
					kind: 'node',
					nodeType: 'n8n-nodes-base.gmail',
					nodeParameters: { resource: 'message', operation: 'get' },
				},
			},
			{
				label: 'Gmail list messages',
				action: {
					toolName: 'gmail_list_messages',
					kind: 'node',
					nodeType: 'n8n-nodes-base.gmail',
					nodeParameters: { resource: 'message', operation: 'getAll' },
				},
			},
			{
				label: 'Slack list channels',
				action: {
					toolName: 'slack_list_channels',
					kind: 'node',
					nodeType: 'n8n-nodes-base.slack',
					nodeParameters: { resource: 'channel', operation: 'getAll' },
				},
			},
			{
				label: 'Slack channel history',
				action: {
					toolName: 'slack_history',
					kind: 'node',
					nodeType: 'n8n-nodes-base.slack',
					nodeParameters: { resource: 'channel', operation: 'history' },
				},
			},
			{
				label: 'Slack search messages',
				action: {
					toolName: 'slack_search',
					kind: 'node',
					nodeType: 'n8n-nodes-base.slack',
					nodeParameters: { resource: 'message', operation: 'search' },
				},
			},
			{
				label: 'Google Sheets read rows',
				action: {
					toolName: 'sheets_read_rows',
					kind: 'node',
					nodeType: 'n8n-nodes-base.googleSheets',
					nodeParameters: { resource: 'sheet', operation: 'read' },
				},
			},
			{
				label: 'HubSpot search contacts',
				action: {
					toolName: 'hubspot_search_contacts',
					kind: 'node',
					nodeType: 'n8n-nodes-base.hubspot',
					nodeParameters: { resource: 'contact', operation: 'search' },
				},
			},
			{
				label: 'Shopify get order',
				action: {
					toolName: 'shopify_get_order',
					kind: 'node',
					nodeType: 'n8n-nodes-base.shopify',
					nodeParameters: { resource: 'order', operation: 'get' },
				},
			},
			{
				label: 'Linear MCP get_issue',
				action: {
					toolName: 'linear__get_issue',
					kind: 'mcp',
					mcpToolName: 'get_issue',
				},
			},
			{
				label: 'Linear MCP list_issues',
				action: {
					toolName: 'linear__list_issues',
					kind: 'mcp',
					mcpToolName: 'list_issues',
				},
			},
			{
				label: 'HTTP Request GET',
				action: {
					toolName: 'fetch_status',
					kind: 'node',
					nodeType: 'n8n-nodes-base.httpRequest',
					nodeParameters: { method: 'GET', url: 'https://api.example.com/status' },
				},
			},
		])('classifies $label as read_through', ({ action }) => {
			expect(classifyToolAction(action)).toBe('read_through');
		});
	});

	describe('standard SaaS write operations', () => {
		it.each([
			{
				label: 'Gmail send email',
				action: {
					toolName: 'gmail_send_email',
					kind: 'node',
					nodeType: 'n8n-nodes-base.gmail',
					nodeParameters: { resource: 'message', operation: 'send' },
				},
			},
			{
				label: 'Gmail reply to message',
				action: {
					toolName: 'gmail_reply',
					kind: 'node',
					nodeType: 'n8n-nodes-base.gmail',
					nodeParameters: { resource: 'message', operation: 'reply' },
				},
			},
			{
				label: 'Gmail mark as read (write wins over read token)',
				action: {
					toolName: 'gmail_mark_as_read',
					kind: 'node',
					nodeType: 'n8n-nodes-base.gmail',
					nodeParameters: { resource: 'message', operation: 'markAsRead' },
				},
			},
			{
				label: 'Slack post message',
				action: {
					toolName: 'slack_post_message',
					kind: 'node',
					nodeType: 'n8n-nodes-base.slack',
					nodeParameters: { resource: 'message', operation: 'post' },
				},
			},
			{
				label: 'Google Sheets append row',
				action: {
					toolName: 'sheets_append',
					kind: 'node',
					nodeType: 'n8n-nodes-base.googleSheets',
					nodeParameters: { resource: 'sheet', operation: 'append' },
				},
			},
			{
				label: 'Google Sheets appendOrUpdate',
				action: {
					toolName: 'sheets_upsert',
					kind: 'node',
					nodeType: 'n8n-nodes-base.googleSheets',
					nodeParameters: { resource: 'sheet', operation: 'appendOrUpdate' },
				},
			},
			{
				label: 'HubSpot create contact',
				action: {
					toolName: 'hubspot_create_contact',
					kind: 'node',
					nodeType: 'n8n-nodes-base.hubspot',
					nodeParameters: { resource: 'contact', operation: 'upsert' },
				},
			},
			{
				label: 'Shopify update order',
				action: {
					toolName: 'shopify_update_order',
					kind: 'node',
					nodeType: 'n8n-nodes-base.shopify',
					nodeParameters: { resource: 'order', operation: 'update' },
				},
			},
			{
				label: 'Linear MCP create_issue',
				action: {
					toolName: 'linear__create_issue',
					kind: 'mcp',
					mcpToolName: 'create_issue',
				},
			},
			{
				label: 'Linear MCP delete_issue',
				action: {
					toolName: 'linear__delete_issue',
					kind: 'mcp',
					mcpToolName: 'delete_issue',
				},
			},
			{
				label: 'HTTP Request POST',
				action: {
					toolName: 'get_report',
					kind: 'node',
					nodeType: 'n8n-nodes-base.httpRequest',
					nodeParameters: { method: 'POST', url: 'https://api.example.com/report' },
				},
			},
			{
				label: 'Node named get_customer but operation is update',
				action: {
					toolName: 'get_customer',
					kind: 'node',
					nodeType: 'n8n-nodes-base.hubspot',
					nodeParameters: { operation: 'update' },
				},
			},
		])('classifies $label as write_hold', ({ action }) => {
			expect(classifyToolAction(action)).toBe('write_hold');
		});
	});

	describe('ambiguous, dynamic, and non-read-safe operations default to write_hold', () => {
		it.each([
			{
				label: 'ambiguous tool name with no read verb',
				action: { toolName: 'process_customer', kind: 'node' },
			},
			{
				label: 'compound getOrCreate operation',
				action: {
					toolName: 'crm_get_or_create',
					kind: 'node',
					nodeParameters: { operation: 'getOrCreate' },
				},
			},
			{
				label: 'MCP tool find_and_replace, where a read verb comes before a write verb',
				action: { toolName: 'find_and_replace', kind: 'mcp', mcpToolName: 'find_and_replace' },
			},
			{
				label: 'node operation findAndReplace',
				action: {
					toolName: 'docs_find_and_replace',
					kind: 'node',
					nodeParameters: { operation: 'findAndReplace' },
				},
			},
			{
				label: 'MCP tool search_replace with a write verb and no joining word',
				action: { toolName: 'search_replace', kind: 'mcp', mcpToolName: 'search_replace' },
			},
			{
				label: 'joined name whose second verb is not a known write verb',
				action: { toolName: 'get_and_frobnicate', kind: 'mcp', mcpToolName: 'get_and_frobnicate' },
			},
			{
				label: 'joined name fetch_then_obliterate',
				action: {
					toolName: 'fetch_then_obliterate',
					kind: 'mcp',
					mcpToolName: 'fetch_then_obliterate',
				},
			},
			{
				label: 'expression operation',
				action: {
					toolName: 'gmail_get',
					kind: 'node',
					nodeParameters: { operation: '={{ $fromAI("op") }}' },
				},
			},
			{
				label: 'HTTP Request with expression method',
				action: {
					toolName: 'http_get',
					kind: 'node',
					nodeType: 'n8n-nodes-base.httpRequest',
					nodeParameters: { method: '={{ $fromAI("method") }}' },
				},
			},
			{
				label: 'HTTP Request with omitted method',
				action: {
					toolName: 'http_get',
					kind: 'node',
					nodeType: 'n8n-nodes-base.httpRequest',
					nodeParameters: { url: 'https://api.example.com' },
				},
			},
			{
				label: 'HTTP Request tool node with omitted method',
				action: {
					toolName: 'http_get',
					kind: 'node',
					nodeType: 'n8n-nodes-base.httpRequestTool',
					nodeParameters: { url: 'https://api.example.com' },
				},
			},
			{
				label: 'node tool named get_customer with omitted operation',
				action: {
					toolName: 'get_customer',
					kind: 'node',
					nodeType: 'n8n-nodes-base.hubspot',
					nodeParameters: { resource: 'contact' },
				},
			},
			{
				label: 'node tool named get_customer without node parameters',
				action: { toolName: 'get_customer', kind: 'node', nodeType: 'n8n-nodes-base.hubspot' },
			},
			{
				label: 'custom code tool named get_data',
				action: { toolName: 'get_data', kind: 'custom' },
			},
			{
				label: 'workflow tool named find_user',
				action: { toolName: 'find_user', kind: 'workflow' },
			},
			{
				label: 'integration tool named slack_get_messages',
				action: { toolName: 'slack_get_messages', kind: 'integration' },
			},
		])('defaults $label to write_hold', ({ action }) => {
			expect(classifyToolAction(action)).toBe('write_hold');
		});
	});
});

describe('classifyBuiltToolAction', () => {
	it('uses mcpToolName for MCP tools', () => {
		const readTool: BuiltTool = {
			name: 'linear_search_issues',
			description: 'Search issues',
			mcpTool: true,
			mcpServerName: 'linear',
			mcpToolName: 'search_issues',
		};
		const writeTool: BuiltTool = {
			name: 'linear_create_issue',
			description: 'Create issue',
			mcpTool: true,
			mcpServerName: 'linear',
			mcpToolName: 'create_issue',
		};
		expect(classifyBuiltToolAction(readTool)).toBe('read_through');
		expect(classifyBuiltToolAction(writeTool)).toBe('write_hold');
	});

	it('holds custom tools regardless of name', () => {
		const customTool: BuiltTool = {
			name: 'get_customer',
			description: 'Custom code',
			metadata: { customTool: true },
		};
		expect(classifyBuiltToolAction(customTool)).toBe('write_hold');
	});
});
