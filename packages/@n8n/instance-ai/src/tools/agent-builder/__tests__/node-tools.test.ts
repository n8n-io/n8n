import { executeTool } from '../../../__tests__/tool-test-utils';
import type { InstanceAiContext } from '../../../types';
import { createGetNodeTypesTool } from '../node-tools';

function createContext(getNodeTypeDefinition?: unknown): InstanceAiContext {
	return {
		userId: 'user-1',
		nodeService: { getNodeTypeDefinition },
	} as unknown as InstanceAiContext;
}

describe('agent-builder get_node_types', () => {
	it('delegates to the shared type-definition resolver for string and object requests', async () => {
		const getNodeTypeDefinition = vi
			.fn()
			.mockImplementation((nodeType: string) => ({ version: 2, content: `type ${nodeType} = {}` }));
		const tool = createGetNodeTypesTool(createContext(getNodeTypeDefinition));

		const result = await executeTool<{ definitions: Array<{ nodeType: string; content: string }> }>(
			tool,
			{
				nodeTypes: ['n8n-nodes-base.httpRequest', { nodeType: 'n8n-nodes-base.set', version: '3' }],
			},
			{},
		);

		expect(result.definitions).toEqual([
			{
				nodeType: 'n8n-nodes-base.httpRequest',
				version: 2,
				content: 'type n8n-nodes-base.httpRequest = {}',
			},
			{ nodeType: 'n8n-nodes-base.set', version: 2, content: 'type n8n-nodes-base.set = {}' },
		]);
		// Object requests forward their discriminator options to the resolver.
		expect(getNodeTypeDefinition).toHaveBeenCalledWith('n8n-nodes-base.set', {
			nodeType: 'n8n-nodes-base.set',
			version: '3',
		});
	});

	it('reports a structured error when the node type definition is unavailable', async () => {
		const tool = createGetNodeTypesTool(createContext(undefined));

		const result = await executeTool<{ definitions: Array<{ error?: string }> }>(
			tool,
			{ nodeTypes: ['n8n-nodes-base.httpRequest'] },
			{},
		);

		expect(result.definitions[0].error).toBe('Node type definitions are not available.');
	});
});
