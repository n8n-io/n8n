import { mock } from 'jest-mock-extended';
import { type INode, type INodeTypes, NodeConnectionTypes } from 'n8n-workflow';

import { isTool } from '../is-tool';

const mockNode = mock<INode>({ id: '1', type: 'n8n-nodes-base.openAi', typeVersion: 1 });
const mockNodeTypes = mock<INodeTypes>();

describe('isTool', () => {
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

	it('returns false for node with no AiTool output', () => {
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
