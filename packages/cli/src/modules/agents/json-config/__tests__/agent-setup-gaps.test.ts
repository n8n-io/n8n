import type { AgentJsonConfig, AgentJsonToolConfig } from '@n8n/api-types';
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { NodeTypes } from '@/node-types';

import { fillSetupGaps, findSetupGaps, parameterGapKey } from '../agent-setup-gaps';

type NodeTool = Extract<AgentJsonToolConfig, { type: 'node' }>;

const emailDescription = {
	displayName: 'Email',
	name: 'test.emailTool',
	group: [],
	version: 1,
	description: '',
	defaults: {},
	inputs: [],
	outputs: [],
	credentials: [
		{ name: 'emailOAuth2', displayOptions: { show: { authentication: ['oAuth2'] } } },
		{ name: 'emailApiKey', displayOptions: { show: { authentication: ['apiKey'] } } },
	],
	properties: [
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'options',
			options: [
				{ name: 'OAuth2', value: 'oAuth2' },
				{ name: 'API Key', value: 'apiKey' },
			],
			default: 'oAuth2',
		},
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			options: [
				{ name: 'Send', value: 'send' },
				{ name: 'Get', value: 'get' },
			],
			default: 'send',
		},
		{
			displayName: 'To',
			name: 'sendTo',
			type: 'string',
			required: true,
			default: '',
			displayOptions: { show: { operation: ['send'] } },
		},
		{
			displayName: 'Subject',
			name: 'subject',
			type: 'string',
			required: true,
			default: '',
			displayOptions: { show: { operation: ['send'] } },
		},
		{
			displayName: 'Message ID',
			name: 'messageId',
			type: 'string',
			required: true,
			default: '',
			displayOptions: { show: { operation: ['get'] } },
		},
		{
			displayName: 'Signing Secret',
			name: 'signingSecret',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			displayOptions: { show: { operation: ['send'] } },
		},
		{
			displayName: 'Folder',
			name: 'folder',
			type: 'resourceLocator',
			required: true,
			default: { mode: 'list', value: '' },
			modes: [{ displayName: 'From List', name: 'list', type: 'list' }],
			displayOptions: { show: { operation: ['send'] } },
		},
	],
} as INodeTypeDescription;

function nodeTypesWith(description: INodeTypeDescription): NodeTypes {
	const nodeTypes = mock<NodeTypes>();
	nodeTypes.getByNameAndVersion.mockImplementation((nodeType) => {
		if (nodeType !== description.name) throw new Error(`Unknown node type ${nodeType}`);
		return { description } as INodeType;
	});
	return nodeTypes;
}

const nodeTypes = nodeTypesWith(emailDescription);

function emailTool(
	name: string,
	nodeParameters: Record<string, unknown> = {},
	credentials?: NodeTool['node']['credentials'],
): NodeTool {
	return {
		type: 'node',
		name,
		node: { nodeType: 'test.emailTool', nodeTypeVersion: 1, nodeParameters, credentials },
	};
}

/** Fills every send field except the one under test. */
const completeSend = {
	sendTo: 'ops@acme.test',
	subject: '={{ $fromAI("subject") }}',
	signingSecret: 'secret',
	folder: { __rl: true, mode: 'list', value: 'inbox' },
};

const oauthCredential = { emailOAuth2: { id: 'c1', name: 'Email account' } };

describe('findSetupGaps', () => {
	it('reports an empty required credential slot that the node displays', () => {
		const gaps = findSetupGaps([emailTool('Send report', completeSend)], nodeTypes);

		expect(gaps).toEqual([
			{ kind: 'credential', tool: 'Send report', credentialType: 'emailOAuth2' },
		]);
	});

	it('treats a stored id and the Gateway credits marker as filled, and a cleared id as empty', () => {
		const managed = { id: null, name: 'Gateway credits', __aiGatewayManaged: true as const };
		const gaps = findSetupGaps(
			[
				emailTool('Stored', completeSend, oauthCredential),
				emailTool('Managed', completeSend, { emailOAuth2: managed }),
				emailTool('Cleared', completeSend, { emailOAuth2: { id: '', name: 'Old' } }),
			],
			nodeTypes,
		);

		expect(gaps).toEqual([{ kind: 'credential', tool: 'Cleared', credentialType: 'emailOAuth2' }]);
	});

	it('follows the selected authentication option', () => {
		const gaps = findSetupGaps(
			[emailTool('Send report', { ...completeSend, authentication: 'apiKey' })],
			nodeTypes,
		);

		expect(gaps).toEqual([
			{ kind: 'credential', tool: 'Send report', credentialType: 'emailApiKey' },
		]);
	});

	it('reports empty required parameters of the current operation only', () => {
		const gaps = findSetupGaps(
			[emailTool('Send report', { subject: '={{ $fromAI("subject") }}' }, oauthCredential)],
			nodeTypes,
		);

		expect(gaps).toEqual([
			{ kind: 'parameter', tool: 'Send report', parameter: 'sendTo', label: 'To', askable: true },
			{
				kind: 'parameter',
				tool: 'Send report',
				parameter: 'signingSecret',
				label: 'Signing Secret',
				askable: false,
			},
			{
				kind: 'parameter',
				tool: 'Send report',
				parameter: 'folder',
				label: 'Folder',
				askable: false,
			},
		]);
	});

	it('treats a whitespace-only value as empty', () => {
		const gaps = findSetupGaps(
			[emailTool('Send report', { ...completeSend, sendTo: '  ' }, oauthCredential)],
			nodeTypes,
		);

		expect(gaps).toEqual([
			{ kind: 'parameter', tool: 'Send report', parameter: 'sendTo', label: 'To', askable: true },
		]);
	});

	it('skips tools whose node type is not installed and non-node tools', () => {
		const gaps = findSetupGaps(
			[
				{
					...emailTool('Missing'),
					node: { nodeType: 'test.missing', nodeTypeVersion: 1 },
				} as NodeTool,
				{ type: 'workflow', workflowId: 'w1', workflow: 'Report' } as AgentJsonToolConfig,
			],
			nodeTypes,
		);

		expect(gaps).toEqual([]);
	});
});

describe('fillSetupGaps', () => {
	const config = (tools: AgentJsonToolConfig[]) =>
		({ name: 'Agent', model: '', instructions: 'Help', tools }) as unknown as AgentJsonConfig;

	it('writes credentials and askable answers into their gaps and leaves the input unchanged', () => {
		const tools = [emailTool('Send report', { subject: '={{ $fromAI("subject") }}' })];
		const input = config(tools);
		const before = structuredClone(input);

		const { config: next, filled } = fillSetupGaps(input, nodeTypes, {
			credentials: { emailOAuth2: { id: 'c1', name: 'Email account' } },
			parameters: {
				[parameterGapKey({ tool: 'Send report', parameter: 'sendTo' })]: 'ops@acme.test',
				[parameterGapKey({ tool: 'Send report', parameter: 'signingSecret' })]: 'typed-secret',
				[parameterGapKey({ tool: 'Other tool', parameter: 'sendTo' })]: 'ignored@acme.test',
			},
		});

		expect(input).toEqual(before);
		expect(filled).toEqual([
			{ kind: 'credential', tool: 'Send report', credentialType: 'emailOAuth2' },
			{ kind: 'parameter', tool: 'Send report', parameter: 'sendTo', label: 'To', askable: true },
		]);
		const node = (next.tools?.[0] as NodeTool).node;
		expect(node.credentials).toEqual(oauthCredential);
		expect(node.nodeParameters).toEqual({
			subject: '={{ $fromAI("subject") }}',
			sendTo: 'ops@acme.test',
		});
	});

	it('fills the slot of every tool that needs the credential type', () => {
		const { config: next } = fillSetupGaps(
			config([emailTool('Send report', completeSend), emailTool('Send alert', completeSend)]),
			nodeTypes,
			{ credentials: { emailOAuth2: { id: 'c1', name: 'Email account' } }, parameters: {} },
		);

		expect(next.tools?.map((tool) => (tool as NodeTool).node.credentials)).toEqual([
			oauthCredential,
			oauthCredential,
		]);
	});

	it('never overwrites a field that is already set', () => {
		const stored = { emailOAuth2: { id: 'own', name: 'Own account' } };
		const input = config([emailTool('Send report', completeSend, stored)]);

		const { config: next, filled } = fillSetupGaps(input, nodeTypes, {
			credentials: { emailOAuth2: { id: 'c1', name: 'Email account' } },
			parameters: {
				[parameterGapKey({ tool: 'Send report', parameter: 'sendTo' })]: 'new@acme.test',
			},
		});

		expect(filled).toEqual([]);
		expect(next).toBe(input);
	});
});
