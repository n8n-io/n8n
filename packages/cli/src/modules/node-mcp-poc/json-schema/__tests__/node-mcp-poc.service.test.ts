import { findTool } from '../node-mcp-poc.service';
import type { CompiledNodeToolset, CompiledOperationTool } from '../node-mcp-poc.types';
import { z } from 'zod';

function operationTool(name: string): CompiledOperationTool {
	return {
		name,
		description: name,
		destructive: false,
		inputSchema: z.object({}).strict(),
		inputFields: {},
		jsonSchema: {},
		properties: [],
		hiddenDefaults: {},
		dynamicParameters: [],
		deferredOptions: [],
	};
}

const sheetAppend = operationTool('sheet_append');
const toolset: CompiledNodeToolset = {
	endpoint: {
		endpoint: 'test',
		type: 'json-schema',
		binding: {
			nodeType: 'n8n-nodes-base.googleSheets',
			nodeVersion: 4.7,
			projectId: 'project',
			userId: 'user',
			credentials: {},
		},
		flavor: { resolver: 'generic-single', hideOptions: false },
	},
	tools: [sheetAppend],
};

describe('findTool', () => {
	it('finds an exact operation tool name', () => {
		expect(findTool(toolset, 'sheet_append')).toBe(sheetAppend);
	});

	it('finds a provider-prefixed operation tool name', () => {
		expect(findTool(toolset, 'mcp-client_sheet_append')).toBe(sheetAppend);
	});

	it('prefers the longest matching operation suffix', () => {
		expect(
			findTool(
				{ ...toolset, tools: [operationTool('append'), sheetAppend] },
				'mcp-client_sheet_append',
			),
		).toBe(sheetAppend);
	});

	it('rejects names that do not contain a known operation suffix', () => {
		expect(() => findTool(toolset, 'mcp-client_sheet_read')).toThrow('Unknown operation tool');
	});
});
