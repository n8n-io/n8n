import type { JSONSchema7 } from 'json-schema';
import { z } from 'zod';

import { convertJsonSchemaToZod } from '@utils/schemaParsing';

import type { McpTool } from '../../shared/types';
import { buildMcpToolName, isZodObjectSchema, mcpToolToDynamicTool } from '../utils';

vi.mock('@utils/schemaParsing', () => ({
	convertJsonSchemaToZod: vi.fn(),
}));

describe('buildMcpToolName', () => {
	it('should prefix tool name with sanitized server name', () => {
		expect(buildMcpToolName('MCP Client', 'get_weather')).toBe('MCP_Client_get_weather');
	});

	it('should sanitize special characters in server name', () => {
		expect(buildMcpToolName('GitHub MCP (v2)', 'list_repos')).toBe('GitHub_MCP__v2__list_repos');
	});

	it('should handle server name with only special characters', () => {
		expect(buildMcpToolName('---', 'tool')).toBe('____tool');
	});

	it('should handle numeric server name', () => {
		expect(buildMcpToolName('123', 'tool')).toBe('123_tool');
	});

	it('should handle empty server name', () => {
		expect(buildMcpToolName('', 'tool')).toBe('_tool');
	});

	it('should not truncate when total length is exactly 64 characters', () => {
		const serverName = 'S';
		const toolName = 'a'.repeat(62); // S_ + 62 = 64
		const result = buildMcpToolName(serverName, toolName);
		expect(result).toBe(`S_${'a'.repeat(62)}`);
		expect(result).toHaveLength(64);
	});

	it('should truncate prefix when total length exceeds 64 characters', () => {
		const toolName = 'a'.repeat(50);
		const result = buildMcpToolName('MyServer', toolName);
		expect(result.length).toBeLessThanOrEqual(64);
		expect(result).toContain(toolName);
	});

	it('should truncate at 65 characters', () => {
		const serverName = 'SS';
		const toolName = 'a'.repeat(62); // SS_ + 62 = 65, exceeds limit
		const result = buildMcpToolName(serverName, toolName);
		expect(result).toBe(`S_${'a'.repeat(62)}`);
		expect(result).toHaveLength(64);
	});

	it('should return original tool name when it alone exceeds 64 characters', () => {
		const longToolName = 'a'.repeat(65);
		expect(buildMcpToolName('Server', longToolName)).toBe(longToolName);
	});

	it('should return original tool name when tool name is exactly 64 characters', () => {
		const toolName = 'a'.repeat(64); // maxPrefixLen = 64 - 64 - 1 = -1, so <= 0
		expect(buildMcpToolName('Server', toolName)).toBe(toolName);
	});
});

describe('isZodObjectSchema', () => {
	it('should recognize a real ZodObject', () => {
		expect(isZodObjectSchema(z.object({ url: z.string() }))).toBe(true);
	});

	it('should reject a non-object schema', () => {
		expect(isZodObjectSchema(z.string())).toBe(false);
	});

	it('should recognize an object schema built by a different zod module instance', () => {
		const foreignInstanceObject = { _def: { typeName: 'ZodObject' } } as unknown as z.ZodTypeAny;
		expect(isZodObjectSchema(foreignInstanceObject)).toBe(true);
	});

	it('should recognize a zod v4 object schema via its type marker', () => {
		const zodV4Object = { _zod: { def: { type: 'object' } } } as unknown as z.ZodTypeAny;
		expect(isZodObjectSchema(zodV4Object)).toBe(true);
	});
});

describe('mcpToolToDynamicTool', () => {
	const tool: McpTool = {
		name: 'browser_navigate',
		description: 'Navigate the browser',
		inputSchema: { type: 'object', properties: { url: { type: 'string' } } } as JSONSchema7,
	};

	it('should keep an object schema unwrapped so args are forwarded top-level', () => {
		vi.mocked(convertJsonSchemaToZod).mockReturnValue(z.object({ url: z.string() }));

		const dynamicTool = mcpToolToDynamicTool(tool, vi.fn());

		expect(Object.keys((dynamicTool.schema as z.ZodObject<z.ZodRawShape>).shape)).toEqual(['url']);
	});

	it('should wrap a non-object schema in a value object', () => {
		vi.mocked(convertJsonSchemaToZod).mockReturnValue(z.string());

		const dynamicTool = mcpToolToDynamicTool(tool, vi.fn());

		expect(Object.keys((dynamicTool.schema as z.ZodObject<z.ZodRawShape>).shape)).toEqual([
			'value',
		]);
	});

	it('should forward object-schema args to the callback top-level, not wrapped in value', async () => {
		vi.mocked(convertJsonSchemaToZod).mockReturnValue(z.object({ url: z.string() }));
		const onCallTool = vi.fn().mockResolvedValue('ok');

		const dynamicTool = mcpToolToDynamicTool(tool, onCallTool);
		await dynamicTool.invoke({ url: 'https://example.com' });

		expect(onCallTool.mock.calls[0][0]).toEqual({ url: 'https://example.com' });
	});
});
