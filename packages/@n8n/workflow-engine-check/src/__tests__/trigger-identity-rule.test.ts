import type { INode, INodeTypeDescription } from 'n8n-workflow';

import { checkEngineV2Eligibility } from '../index';

const oauth2Webhook: INode = {
	id: 'webhook-id',
	name: 'Webhook',
	type: 'n8n-nodes-base.webhook',
	typeVersion: 2,
	position: [0, 0],
	parameters: { authentication: 'n8nOAuth2' },
};

const subWorkflowTrigger: INode = {
	id: 'sub-id',
	name: 'When called by another workflow',
	type: 'n8n-nodes-base.executeWorkflowTrigger',
	typeVersion: 1.1,
	position: [0, 0],
	parameters: {},
};

const nodeTypes: INodeTypeDescription[] = [];

function check(nodes: INode[]) {
	return checkEngineV2Eligibility({ nodes, connections: {}, settings: {} }, nodeTypes);
}

describe('trigger identity rule', () => {
	it('blocks a live trigger that takes its identity from the request, naming the node', () => {
		expect(check([oauth2Webhook])).toEqual({
			eligible: false,
			reasons: [
				{
					code: 'TRIGGER_EXTERNAL_IDENTITY',
					severity: 'blocking',
					nodeId: 'webhook-id',
					nodeName: 'Webhook',
					message: expect.stringContaining('"Webhook"'),
				},
			],
		});
	});

	it.each<[string, INode]>([
		['a disabled trigger with external identity', { ...oauth2Webhook, disabled: true }],
		['a webhook without n8n OAuth2', { ...oauth2Webhook, parameters: {} }],
		// A call from a parent workflow skips the dispatcher's identity check.
		['a sub-workflow trigger', subWorkflowTrigger],
	])('does not block %s', (_, node) => {
		expect(check([node])).toEqual({ eligible: true, reasons: [] });
	});
});
