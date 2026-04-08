import { buildMcpToolName } from '../utils';

jest.mock('@utils/schemaParsing', () => ({
	convertJsonSchemaToZod: jest.fn(),
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
