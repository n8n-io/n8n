import type { ToolPolicySelector } from '@n8n/api-types';
import { describe, expect, it } from 'vitest';

import type { AgentJsonConfig } from '../types';
import { toolPolicySelectorKey } from '../utils/tool-policy-config';
import {
	coveredAgentTools,
	groupToolPickerOptions,
	mcpServerSelection,
	toggleMcpServer,
	toggleMcpServerTool,
	toolPolicyChips,
	type ToolPickerOption,
} from '../utils/tool-policy-picker';

const option = (
	selector: ToolPolicySelector,
	label: string,
	source?: ToolPickerOption['source'],
): ToolPickerOption => ({ key: toolPolicySelectorKey(selector), label, selector, source });

const mcpTool = (server: string, tool: string): ToolPolicySelector => ({
	kind: 'tool',
	ref: { type: 'mcpServer', name: server, tool },
});
const mcpServer = (name: string): ToolPolicySelector => ({
	kind: 'tool',
	ref: { type: 'mcpServer', name },
});

const readsData = option({ kind: 'category', value: 'readsData' }, 'Reads data', {
	type: 'category',
	category: 'readsData',
});
const sendEmail = option(
	{ kind: 'tool', ref: { type: 'node', name: 'Send Email' } },
	'Send Email',
	{ type: 'node', name: 'Send Email' },
);
const crm = option(mcpServer('crm'), 'crm', { type: 'mcpServer', name: 'crm' });
const crmTool = (tool: string) =>
	option(mcpTool('crm', tool), tool, { type: 'mcpTool', server: 'crm', tool });
const getContact = crmTool('get_contact');
const sendMail = crmTool('send_mail');
const gmailTools = option({ kind: 'nodeType', value: 'n8n-nodes-base.gmailTool' }, 'All Gmail', {
	type: 'nodeType',
	nodeType: 'n8n-nodes-base.gmailTool',
});
const removed = option({ kind: 'tool', ref: { type: 'node', name: 'Old' } }, 'Old (removed)');

const options = [readsData, sendEmail, crm, getContact, sendMail, gmailTools];
const [crmServer] = groupToolPickerOptions(options).servers;

describe('groupToolPickerOptions', () => {
	it('sorts the options into the groups of the picker, with tools under their server', () => {
		expect(groupToolPickerOptions([...options, removed])).toEqual({
			categories: [readsData],
			tools: [sendEmail],
			servers: [{ name: 'crm', all: crm, tools: [getContact, sendMail] }],
			nodeTypes: [gmailTools],
			other: [removed],
		});
	});

	it('keeps a tool that a rule names under its server when the list is not loaded', () => {
		const saved = option(mcpTool('crm', 'send_mail'), 'send_mail');

		expect(groupToolPickerOptions([crm, saved]).servers).toEqual([
			{ name: 'crm', all: crm, tools: [saved] },
		]);
	});

	it('puts the selections of a removed server in the other group', () => {
		const goneServer = option(mcpServer('gone'), 'gone (removed)');
		const goneTool = option(mcpTool('gone', 'x'), 'x');

		expect(groupToolPickerOptions([goneServer, goneTool]).other).toEqual([goneServer, goneTool]);
	});
});

describe('selection of an MCP server', () => {
	it('says how much of a server is selected', () => {
		expect(mcpServerSelection([], crmServer)).toMatchObject({ state: 'none', count: 0 });
		expect(mcpServerSelection([sendMail.key], crmServer)).toEqual({
			state: 'some',
			count: 1,
			listed: 2,
		});
		expect(mcpServerSelection([crm.key], crmServer)).toMatchObject({ state: 'all', count: 2 });
	});

	it('selects the whole server as one selection, in place of its tools', () => {
		expect(toggleMcpServer([sendEmail.key, sendMail.key], crmServer)).toEqual([
			sendEmail.key,
			crm.key,
		]);
	});

	it('clears the server when the whole server was selected', () => {
		expect(toggleMcpServer([sendEmail.key, crm.key], crmServer)).toEqual([sendEmail.key]);
	});

	it('adds and removes one tool', () => {
		expect(toggleMcpServerTool([sendEmail.key], crmServer, sendMail.key)).toEqual([
			sendEmail.key,
			sendMail.key,
		]);
		expect(toggleMcpServerTool([sendEmail.key, sendMail.key], crmServer, sendMail.key)).toEqual([
			sendEmail.key,
		]);
	});

	it('leaves the other tools when one tool is taken out of the whole server', () => {
		expect(toggleMcpServerTool([crm.key], crmServer, sendMail.key)).toEqual([getContact.key]);
	});

	it('becomes the whole server when the last tool of the list is selected', () => {
		expect(toggleMcpServerTool([getContact.key], crmServer, sendMail.key)).toEqual([crm.key]);
	});

	describe('when the list of the server is not loaded', () => {
		const saved = option(mcpTool('crm', 'send_mail'), 'send_mail');
		const [unlisted] = groupToolPickerOptions([crm, saved]).servers;

		it('keeps a tool that a rule names as one tool, and not as the whole server', () => {
			expect(toggleMcpServerTool([], unlisted, saved.key)).toEqual([saved.key]);
		});

		it('does not know how many tools the server has', () => {
			expect(mcpServerSelection([saved.key], unlisted)).toEqual({
				state: 'some',
				count: 1,
				listed: 0,
			});
			expect(toolPolicyChips([saved.key], [crm, saved])[0].server).toEqual({
				selected: 1,
				total: 0,
			});
		});
	});
});

describe('toolPolicyChips', () => {
	it('shows one chip for a selection and one chip for all tools of a server', () => {
		expect(toolPolicyChips([sendEmail.key, getContact.key, sendMail.key], options)).toEqual([
			{ id: sendEmail.key, label: 'Send Email', keys: [sendEmail.key] },
			{
				id: 'mcpServer:crm',
				label: 'crm',
				server: { selected: 2, total: 2 },
				keys: [getContact.key, sendMail.key],
			},
		]);
	});

	it('marks the chip of a whole server', () => {
		expect(toolPolicyChips([crm.key], options)).toEqual([
			{ id: 'mcpServer:crm', label: 'crm', server: 'all', keys: [crm.key] },
		]);
	});
});

describe('coveredAgentTools', () => {
	const config: Pick<AgentJsonConfig, 'tools' | 'mcpServers'> = {
		tools: [
			{
				type: 'node',
				name: 'Send Email',
				node: { nodeType: 'n8n-nodes-base.gmailTool', nodeTypeVersion: 1, nodeParameters: {} },
			},
			{ type: 'workflow', workflow: 'Refund flow', workflowId: 'wf-1', name: 'refund' },
		],
		mcpServers: [
			{ name: 'crm', url: 'https://example.com/mcp', transport: 'sse', authentication: 'none' },
		],
	};

	it('names the tools and servers of the agent that the selectors cover', () => {
		expect(coveredAgentTools(config, [gmailTools.selector, mcpTool('crm', 'send_mail')])).toEqual([
			'Send Email',
			'crm',
		]);
		expect(coveredAgentTools(config, [{ kind: 'category', value: 'sendsDataOut' }])).toEqual([
			'Send Email',
			'refund',
			'crm',
		]);
		expect(coveredAgentTools(config, [])).toEqual([]);
	});
});
