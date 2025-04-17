import { McpClient } from '../nodes/McpClient/McpClient.node';

describe('McpClient Node', () => {
	let mcpClient: McpClient;

	beforeEach(() => {
		mcpClient = new McpClient();
	});

	it('should have the correct node type', () => {
		expect(mcpClient.description.name).toBe('mcpClient');
	});

	it('should have properties defined', () => {
		expect(mcpClient.description.properties).toBeDefined();
	});
});
