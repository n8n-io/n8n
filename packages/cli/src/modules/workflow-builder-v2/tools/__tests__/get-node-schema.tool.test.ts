import {
	createGetNodeSchemaTool,
	createGetNodeSchemasTool,
	type LookupNodeSchema,
	type LookupNodeSchemas,
} from '../get-node-schema.tool';

type ToolHandler = (input: unknown, ctx: unknown) => Promise<unknown>;

describe('get_node_schema tool', () => {
	it('returns the schema string from the lookup function', async () => {
		const lookup: LookupNodeSchema = async (input) =>
			`// schema for ${input.nodeType}@${input.version}`;
		const tool = createGetNodeSchemaTool(lookup) as unknown as { handler: ToolHandler };

		const result = (await tool.handler(
			{ nodeType: 'n8n-nodes-base.googleSheets', version: 4, resource: 'sheet' },
			{},
		)) as { schema: string };

		expect(result.schema).toBe('// schema for n8n-nodes-base.googleSheets@4');
	});

	it('returns a structured error when the lookup throws', async () => {
		const lookup: LookupNodeSchema = async () => {
			throw new Error('catalog not initialized');
		};
		const tool = createGetNodeSchemaTool(lookup) as unknown as { handler: ToolHandler };

		const result = (await tool.handler({ nodeType: 'n8n-nodes-base.unknown', version: 1 }, {})) as {
			error: string;
			nodeType: string;
			message: string;
		};

		expect(result.error).toBe('schema-lookup-failed');
		expect(result.nodeType).toBe('n8n-nodes-base.unknown');
		expect(result.message).toContain('catalog not initialized');
	});
});

describe('get_node_schemas tool', () => {
	it('returns the combined schema string from the batch lookup function', async () => {
		const lookup: LookupNodeSchemas = async (nodes) =>
			nodes.map((node) => `// schema for ${node.nodeType}@${node.version}`).join('\n');
		const tool = createGetNodeSchemasTool(lookup) as unknown as { handler: ToolHandler };

		const result = (await tool.handler(
			{
				nodes: [
					{ nodeType: 'n8n-nodes-base.gmail', version: 2.2, resource: 'message' },
					{ nodeType: 'n8n-nodes-base.emailSend', version: 2 },
				],
			},
			{},
		)) as { schema: string };

		expect(result.schema).toContain('// schema for n8n-nodes-base.gmail@2.2');
		expect(result.schema).toContain('// schema for n8n-nodes-base.emailSend@2');
	});

	it('returns a structured error when the batch lookup throws', async () => {
		const lookup: LookupNodeSchemas = async () => {
			throw new Error('catalog unavailable');
		};
		const tool = createGetNodeSchemasTool(lookup) as unknown as { handler: ToolHandler };

		const result = (await tool.handler(
			{ nodes: [{ nodeType: 'n8n-nodes-base.unknown', version: 1 }] },
			{},
		)) as { error: string; nodes: Array<{ nodeType: string }>; message: string };

		expect(result.error).toBe('schema-lookup-failed');
		expect(result.nodes[0]?.nodeType).toBe('n8n-nodes-base.unknown');
		expect(result.message).toContain('catalog unavailable');
	});
});
