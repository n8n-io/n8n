import type { GymManifest } from '@n8n/ai-gym';
import type { INode } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { checkWorkflowSupport, matchManifestHost } from '../node-support-validator';

const sampleManifest: GymManifest = {
	vendors: [
		{
			slug: 'slack',
			hosts: ['slack.com', '*.slack.com'],
			fault_flags: [],
			routes: [],
			websocket: false,
		},
		{ slug: 'openai', hosts: ['api.openai.com'], fault_flags: [], routes: [], websocket: false },
		{ slug: 'github', hosts: ['api.github.com'], fault_flags: [], routes: [], websocket: false },
	],
};

function makeNode(overrides: Partial<INode>): INode {
	return {
		id: '1',
		name: 'Node',
		type: 'n8n-nodes-base.set',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		...overrides,
	};
}

describe('node-support-validator', () => {
	it('matches exact and wildcard manifest hosts', () => {
		expect(matchManifestHost('slack.com', 'slack.com')).toBe(true);
		expect(matchManifestHost('*.slack.com', 'api.slack.com')).toBe(true);
		expect(matchManifestHost('*.slack.com', 'slack.com')).toBe(false);
		expect(matchManifestHost('api.openai.com', 'api.openai.com:443')).toBe(true);
		expect(matchManifestHost('api.openai.com', 'evil.com')).toBe(false);
	});

	it('accepts workflows with local nodes and supported vendors', () => {
		const result = checkWorkflowSupport(
			{
				nodes: [
					makeNode({ name: 'Trigger', type: 'n8n-nodes-base.manualTrigger' }),
					makeNode({ name: 'Slack', type: 'n8n-nodes-base.slack' }),
					makeNode({ name: 'OpenAI', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi' }),
					makeNode({
						name: 'GitHub HTTP',
						type: 'n8n-nodes-base.httpRequest',
						parameters: { url: 'https://api.github.com/repos/n8n-io/n8n' },
					}),
				],
			},
			sampleManifest,
		);

		expect(result.supported).toBe(true);
		expect(result.unsupportedNodes).toEqual([]);
		expect(result.requiredVendors).toEqual(['slack', 'openai', 'github']);
	});

	it('fails fast when a workflow contains an unsupported node or unknown HTTP host', () => {
		const result = checkWorkflowSupport(
			{
				nodes: [
					makeNode({ name: 'Trigger', type: 'n8n-nodes-base.manualTrigger' }),
					makeNode({ name: 'Postgres', type: 'n8n-nodes-base.postgres' }),
					makeNode({
						name: 'Custom API',
						type: 'n8n-nodes-base.httpRequest',
						parameters: { url: 'https://internal.example.org/orders' },
					}),
					makeNode({ name: 'Disabled Unsupported', type: 'n8n-nodes-base.mysql', disabled: true }),
				],
			},
			sampleManifest,
		);

		expect(result.supported).toBe(false);
		expect(result.unsupportedNodes).toHaveLength(2);
		expect(result.unsupportedNodes.map((n) => n.nodeName)).toEqual(['Postgres', 'Custom API']);
	});
});
