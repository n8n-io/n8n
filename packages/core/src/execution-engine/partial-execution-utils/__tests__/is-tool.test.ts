import { mock } from 'jest-mock-extended';
import { type INode, type INodeTypes, NodeConnectionTypes } from 'n8n-workflow';

import { isTool } from '../is-tool';

describe('isTool', () => {
	const mockNode = mock<INode>({
		id: '1',
		type: 'n8n-nodes-base.openAi',
		typeVersion: 1,
		parameters: {},
	});
	const mockNodeTypes = mock<INodeTypes>();

	it('should return true for a node with AiTool output', () => {
		mockNodeTypes.getByNameAndVersion.mockReturnValue({
			description: {
				outputs: [NodeConnectionTypes.AiTool],
				version: 0,
				defaults: {
					name: '',
					color: '',
				},
				inputs: [NodeConnectionTypes.Main],
				properties: [],
				displayName: '',
				name: '',
				group: [],
				description: '',
			},
		});
		const result = isTool(mockNode, mockNodeTypes);
		expect(result).toBe(true);
	});

	it('should return true for a node with AiTool output in NodeOutputConfiguration', () => {
		mockNodeTypes.getByNameAndVersion.mockReturnValue({
			description: {
				outputs: [{ type: NodeConnectionTypes.AiTool }, { type: NodeConnectionTypes.Main }],
				version: 0,
				defaults: {
					name: '',
					color: '',
				},
				inputs: [NodeConnectionTypes.Main],
				properties: [],
				displayName: '',
				name: '',
				group: [],
				description: '',
			},
		});
		const result = isTool(mockNode, mockNodeTypes);
		expect(result).toBe(true);
	});

	it('returns true for a vectore store node in retrieve-as-tool mode', () => {
		mockNode.type = 'n8n-nodes-base.vectorStore';
		mockNode.parameters = { mode: 'retrieve-as-tool' };
		mockNodeTypes.getByNameAndVersion.mockReturnValue({
			description: {
				outputs: [NodeConnectionTypes.Main],
				version: 0,
				defaults: {
					name: '',
					color: '',
				},
				inputs: [NodeConnectionTypes.Main],
				properties: [],
				displayName: '',
				name: '',
				group: [],
				description: '',
			},
		});
		const result = isTool(mockNode, mockNodeTypes);
		expect(result).toBe(true);
	});

	it('returns false for node with no AiTool output', () => {
		mockNode.type = 'n8n-nodes-base.someTool';
		mockNode.parameters = {};
		mockNodeTypes.getByNameAndVersion.mockReturnValue({
			description: {
				outputs: [NodeConnectionTypes.Main],
				version: 0,
				defaults: {
					name: '',
					color: '',
				},
				inputs: [NodeConnectionTypes.Main],
				properties: [],
				displayName: '',
				name: '',
				group: [],
				description: '',
			},
		});
		const result = isTool(mockNode, mockNodeTypes);
		expect(result).toBe(false);
	});
});
