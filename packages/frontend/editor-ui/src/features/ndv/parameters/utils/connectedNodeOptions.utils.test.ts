import { NodeConnectionTypes } from 'n8n-workflow';
import type { INode } from 'n8n-workflow';

import { getConnectedNodeOptions } from './connectedNodeOptions.utils';

const node = (name: string, type: string): INode => ({
	id: name,
	name,
	type,
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
});

const nodes: Record<string, INode> = {
	'Send Email': node('Send Email', 'n8n-nodes-base.gmailTool'),
	'Read Customer DB': node('Read Customer DB', 'n8n-nodes-base.postgresTool'),
	'Send Report': node('Send Report', 'n8n-nodes-base.gmailTool'),
};

const displayNames: Record<string, string> = {
	'n8n-nodes-base.gmailTool': 'Gmail Tool',
	'n8n-nodes-base.postgresTool': 'Postgres Tool',
};

const getParentNodes = vi.fn(() => Object.keys(nodes));

const lookups = {
	getParentNodes,
	getNodeByName: (name: string) => nodes[name],
	getNodeTypeDisplayName: (type: string) => displayNames[type],
};

describe('getConnectedNodeOptions', () => {
	beforeEach(() => getParentNodes.mockClear());

	it('should list the directly connected nodes by name', () => {
		const options = getConnectedNodeOptions(
			'Agent',
			{ connectionType: NodeConnectionTypes.AiTool, value: 'nodeName' },
			lookups,
		);

		expect(getParentNodes).toHaveBeenCalledWith('Agent', NodeConnectionTypes.AiTool, 1);
		expect(options).toEqual([
			{ name: 'Read Customer DB', value: 'Read Customer DB' },
			{ name: 'Send Email', value: 'Send Email' },
			{ name: 'Send Report', value: 'Send Report' },
		]);
	});

	it('should list each connected node type once, with its display name', () => {
		const options = getConnectedNodeOptions(
			'Agent',
			{ connectionType: NodeConnectionTypes.AiTool, value: 'nodeType' },
			lookups,
		);

		expect(options).toEqual([
			{ name: 'Gmail Tool', value: 'n8n-nodes-base.gmailTool' },
			{ name: 'Postgres Tool', value: 'n8n-nodes-base.postgresTool' },
		]);
	});

	it('should fall back to the type name when the node type is not loaded', () => {
		const options = getConnectedNodeOptions(
			'Agent',
			{ connectionType: NodeConnectionTypes.AiTool, value: 'nodeType' },
			{ ...lookups, getNodeTypeDisplayName: () => undefined },
		);

		expect(options.map((o) => o.name)).toEqual([
			'n8n-nodes-base.gmailTool',
			'n8n-nodes-base.postgresTool',
		]);
	});

	it('should return no options when nothing is connected', () => {
		const options = getConnectedNodeOptions(
			'Agent',
			{ connectionType: NodeConnectionTypes.AiTool, value: 'nodeName' },
			{ ...lookups, getParentNodes: () => [] },
		);

		expect(options).toEqual([]);
	});
});
