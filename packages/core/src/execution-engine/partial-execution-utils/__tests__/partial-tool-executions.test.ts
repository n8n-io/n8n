import { mock } from 'jest-mock-extended';
import { INodeType, NodeConnectionTypes, type INodeTypes } from 'n8n-workflow';

import { createNodeData } from './helpers';
import { isTool } from '../partial-tool-executions';

describe('isTool', () => {
	const node = createNodeData({ name: 'Tool Node' });
	const nodeTypes = mock<INodeTypes>();

	it('should determine if a node is a tool correctly', () => {
		const nodeType: INodeType = {
			description: {
				outputs: [NodeConnectionTypes.AiTool],
				version: 0,
				defaults: {},
				inputs: [],
				properties: [],
				displayName: '',
				name: '',
				group: [],
				description: '',
			},
		};
		nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);
		expect(isTool(node, nodeTypes)).toBe(true);
	});

	it('should determine if a node is not a tool correctly', () => {
		const nodeType: INodeType = {
			description: {
				outputs: [NodeConnectionTypes.AiRetriever],
				version: 0,
				defaults: {},
				inputs: [],
				properties: [],
				displayName: '',
				name: '',
				group: [],
				description: '',
			},
		};
		nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);
		expect(isTool(node, nodeTypes)).toBe(false);
	});
});
