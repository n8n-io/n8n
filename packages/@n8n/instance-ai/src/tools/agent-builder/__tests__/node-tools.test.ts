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
	it('normalizes Agent node versions as literal numbers before host resolution', async () => {
		const getNodeTypeDefinition = vi.fn().mockImplementation((nodeType: string) => ({
			version: '43',
			content: `type ${nodeType} = {}`,
		}));
		const tool = createGetNodeTypesTool(createContext(getNodeTypeDefinition));

		const result = await executeTool<{ definitions: Array<{ nodeType: string; content: string }> }>(
			tool,
			{
				nodeTypes: [
					'n8n-nodes-base.httpRequest',
					{ nodeType: 'n8n-nodes-base.set', version: '3' },
					{ nodeType: 'n8n-nodes-base.code', version: 43 },
					{ nodeType: 'n8n-nodes-base.if', version: '43' },
					{ nodeType: 'n8n-nodes-base.switch', version: '4.3' },
				],
			},
			{},
		);

		expect(result.definitions).toEqual([
			{
				nodeType: 'n8n-nodes-base.httpRequest',
				version: 43,
				content: 'type n8n-nodes-base.httpRequest = {}',
			},
			{ nodeType: 'n8n-nodes-base.set', version: 43, content: 'type n8n-nodes-base.set = {}' },
			{ nodeType: 'n8n-nodes-base.code', version: 43, content: 'type n8n-nodes-base.code = {}' },
			{ nodeType: 'n8n-nodes-base.if', version: 43, content: 'type n8n-nodes-base.if = {}' },
			{
				nodeType: 'n8n-nodes-base.switch',
				version: 43,
				content: 'type n8n-nodes-base.switch = {}',
			},
		]);
		// Object requests forward their discriminator options to the resolver.
		expect(getNodeTypeDefinition).toHaveBeenCalledWith('n8n-nodes-base.set', {
			nodeType: 'n8n-nodes-base.set',
			version: 3,
		});
		expect(getNodeTypeDefinition).toHaveBeenCalledWith(
			'n8n-nodes-base.code',
			expect.objectContaining({ version: 43 }),
		);
		expect(getNodeTypeDefinition).toHaveBeenCalledWith(
			'n8n-nodes-base.if',
			expect.objectContaining({ version: 43 }),
		);
		expect(getNodeTypeDefinition).toHaveBeenCalledWith(
			'n8n-nodes-base.switch',
			expect.objectContaining({ version: 4.3 }),
		);
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

	it('does not reinterpret internal definition file labels as semantic versions', async () => {
		const getNodeTypeDefinition = vi.fn().mockResolvedValue({
			version: 'v13',
			content: 'type GoogleCalendar = { version: 1.3 }',
		});
		const tool = createGetNodeTypesTool(createContext(getNodeTypeDefinition));

		await expect(
			executeTool(tool, { nodeTypes: ['n8n-nodes-base.googleCalendarTool'] }, {}),
		).rejects.toThrow('Invalid resolved node version: "v13".');
	});

	it('rejects internal definition file labels as Agent node requests', async () => {
		const getNodeTypeDefinition = vi.fn();
		const tool = createGetNodeTypesTool(createContext(getNodeTypeDefinition));

		await expect(
			executeTool(
				tool,
				{
					nodeTypes: [{ nodeType: 'n8n-nodes-base.googleCalendarTool', version: 'v13' }],
				},
				{},
			),
		).rejects.toThrow('Node version must be a semantic number such as 1.3.');
		expect(getNodeTypeDefinition).not.toHaveBeenCalled();
	});
});
