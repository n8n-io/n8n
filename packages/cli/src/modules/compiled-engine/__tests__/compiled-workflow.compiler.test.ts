import type { INode, INodeType, INodeTypes } from 'n8n-workflow';

import { calledWorkflowId } from '../compiled-sub-workflow.resolver';
import { bindSlots, classifyNodes, parameterIssueDiagnostics } from '../compiled-workflow.compiler';
import { wfrtWebhookUrl } from '../compiled-webhook.forwarder';

const node = (name: string, type: string, extra: Partial<INode> = {}): INode => ({
	id: name,
	name,
	type,
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
	...extra,
});

describe('classifyNodes', () => {
	it('says where each node runs', () => {
		const nodes = [
			node('Webhook', 'n8n-nodes-base.webhook'),
			node('IF', 'n8n-nodes-base.if'),
			node('HTTP Request', 'n8n-nodes-base.httpRequest'),
			node('Postgres', 'n8n-nodes-base.postgres'),
			node('Code', 'n8n-nodes-base.code'),
			node('Respond', 'n8n-nodes-base.respondToWebhook'),
			node('Broken', 'n8n-nodes-base.executeWorkflow'),
			node('Note', 'n8n-nodes-base.stickyNote'),
			node('Set', 'n8n-nodes-base.set'),
		];
		const result = classifyNodes({
			nodes,
			steps: [
				{ name: 'HTTP Request', kind: 'node', nodeType: 'n8n-nodes-base.httpRequest' },
				{ name: 'Postgres', kind: 'node', nodeType: 'n8n-nodes-base.postgres' },
				{ name: 'Code', kind: 'code', nodeType: null },
				{ name: 'Respond', kind: 'respond', nodeType: 'n8n-nodes-base.respondToWebhook' },
			],
			libraryTypes: new Set(['n8n-nodes-base.httpRequest']),
			fallbackNodes: ['Set'],
			diagnostics: [{ node: 'Broken', severity: 'error', code: 'unsupported-node', message: 'x' }],
		});
		expect(result).toEqual({
			Webhook: 'native',
			IF: 'code',
			'HTTP Request': 'native',
			Postgres: 'host',
			Code: 'host',
			Respond: 'native',
			Set: 'host',
		});
	});
});

describe('bindSlots', () => {
	it('maps module slots to the n8n credentials of the nodes', () => {
		const nodes = [
			node('Slack', 'n8n-nodes-base.slack', {
				credentials: { slackApi: { id: 'c1', name: 'Team Slack' } },
			}),
		];
		const slots = bindSlots(
			nodes,
			[{ slot: 'teamSlack', type: 'slackApi' }],
			() => new Map([['slackApi\u0000Team Slack', 'teamSlack']]),
			(type, name) => `${type}\u0000${name}`,
		);
		expect(slots).toEqual([
			{ slot: 'teamSlack', type: 'slackApi', credentialId: 'c1', credentialName: 'Team Slack' },
		]);
	});
});

describe('helpers', () => {
	it('builds the wfrt webhook URL with the query', () => {
		expect(wfrtWebhookUrl('http://127.0.0.1:5690', 'demo', '/webhook/demo?a=1')).toBe(
			'http://127.0.0.1:5690/webhook/demo?a=1',
		);
		expect(wfrtWebhookUrl('http://127.0.0.1:5690', '/demo', '/webhook/demo')).toBe(
			'http://127.0.0.1:5690/webhook/demo',
		);
	});

	it('reads the id of a called workflow', () => {
		const call = (parameters: INode['parameters']) =>
			calledWorkflowId(node('Call', 'n8n-nodes-base.executeWorkflow', { parameters }));
		expect(call({ workflowId: { __rl: true, value: 'abc', mode: 'list' } })).toBe('abc');
		expect(call({ workflowId: 'xyz' })).toBe('xyz');
		expect(call({ workflowId: '={{ $json.id }}' })).toBeUndefined();
		expect(call({ source: 'parameter', workflowJson: '{}' })).toBeUndefined();
	});
});

describe('parameterIssueDiagnostics', () => {
	const sendType: INodeType = {
		description: {
			displayName: 'Send',
			name: 'send',
			group: ['output'],
			version: 1,
			description: 'Sends a message',
			defaults: { name: 'Send' },
			inputs: ['main'],
			outputs: ['main'],
			properties: [
				{ displayName: 'Channel', name: 'channel', type: 'string', default: '', required: true },
			],
		},
	};
	const nodeTypes: INodeTypes = {
		getByName: () => sendType,
		getByNameAndVersion: () => sendType,
		getKnownTypes: () => ({}),
	};

	it('gives the parameter issues of each enabled node as warnings, as n8n finds them', () => {
		const nodes = [
			node('Empty', 'test.send', { parameters: { channel: '' } }),
			node('Off', 'test.send', { parameters: { channel: '' }, disabled: true }),
			node('Set', 'test.send', { parameters: { channel: '#general' } }),
		];
		const diagnostics = parameterIssueDiagnostics(nodes, {}, nodeTypes);
		expect(diagnostics).toEqual([
			{
				node: 'Empty',
				severity: 'warning',
				code: 'parameter-issues',
				message: 'Parameter "Channel" is required.',
			},
		]);
		// The check works on copies: the nodes keep their parameters.
		expect(nodes[0].parameters).toEqual({ channel: '' });
	});
});
