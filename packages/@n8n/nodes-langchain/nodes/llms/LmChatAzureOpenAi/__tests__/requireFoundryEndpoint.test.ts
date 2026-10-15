import type { INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { requireFoundryEndpoint } from '../credentials/requireFoundryEndpoint';

const mockNode: INode = {
	id: '1',
	name: 'Mock node',
	typeVersion: 1,
	type: 'n8n-nodes-langchain.lmChatAzureOpenAi',
	position: [0, 0],
	parameters: {},
};

describe('requireFoundryEndpoint', () => {
	it('returns the endpoint when present', () => {
		expect(requireFoundryEndpoint(mockNode, 'https://test.services.ai.azure.com/openai/v1')).toBe(
			'https://test.services.ai.azure.com/openai/v1',
		);
	});

	it('removes spaces and a trailing slash from the endpoint', () => {
		expect(
			requireFoundryEndpoint(mockNode, ' https://test.services.ai.azure.com/openai/v1/ '),
		).toBe('https://test.services.ai.azure.com/openai/v1');
	});

	it('throws NodeOperationError when missing', () => {
		expect(() => requireFoundryEndpoint(mockNode, undefined)).toThrow(NodeOperationError);
	});
});
