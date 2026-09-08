import type { AgentJsonToolConfig } from '@n8n/api-types';

import {
	findHttpRequestToolUrlFromAiViolations,
	validateNodeToolConfigs,
} from '../node-tool-validation';

const { mockValidateNodeConfig } = vi.hoisted(() => ({
	mockValidateNodeConfig: vi.fn(),
}));

vi.mock('@n8n/workflow-sdk', () => ({
	getSchemaBaseDirs: () => [],
	setSchemaBaseDirs: vi.fn(),
	validateNodeConfig: (...args: unknown[]) => mockValidateNodeConfig(...args),
}));

const nodeTool = (operation: string): AgentJsonToolConfig => ({
	type: 'node',
	name: 'Slack',
	node: {
		nodeType: 'n8n-nodes-base.slackTool',
		nodeTypeVersion: 2.2,
		nodeParameters: { resource: 'message', operation },
	},
});

const configuredNodeTool = (
	name: string,
	nodeType: string,
	nodeParameters: Record<string, unknown>,
): AgentJsonToolConfig => ({
	type: 'node',
	name,
	node: { nodeType, nodeTypeVersion: 4.5, nodeParameters },
});

describe('HTTP Request URL validation', () => {
	it('finds $fromAI only in modern HTTP Request URL fields', () => {
		expect(
			findHttpRequestToolUrlFromAiViolations([
				configuredNodeTool('HTTP Request Tool', 'n8n-nodes-base.httpRequestTool', {
					url: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('url') }}",
				}),
				configuredNodeTool('HTTP Request', 'n8n-nodes-base.httpRequest', {
					url: "={{ $FromAI ('url') }}",
				}),
				configuredNodeTool('Malformed HTTP Request', 'n8n-nodes-base.httpRequestTool', {
					url: "={{ $fromAI('url' }}",
				}),
			]),
		).toEqual([
			{
				toolIndex: 0,
				toolName: 'HTTP Request Tool',
				path: 'tools.0.node.nodeParameters.url',
			},
			{
				toolIndex: 1,
				toolName: 'HTTP Request',
				path: 'tools.1.node.nodeParameters.url',
			},
			{
				toolIndex: 2,
				toolName: 'Malformed HTTP Request',
				path: 'tools.2.node.nodeParameters.url',
			},
		]);

		expect(
			findHttpRequestToolUrlFromAiViolations([
				configuredNodeTool('Fixed HTTP Request', 'n8n-nodes-base.httpRequestTool', {
					url: '={{ $json.url }}',
					body: "={{ $fromAI('body') }}",
				}),
				configuredNodeTool('Legacy HTTP Request', '@n8n/n8n-nodes-langchain.toolHttpRequest', {
					url: "={{ $fromAI('url') }}",
				}),
				configuredNodeTool('Other Node', 'n8n-nodes-base.slackTool', {
					url: "={{ $fromAI('url') }}",
				}),
			]),
		).toEqual([]);
	});
});

describe('validateNodeToolConfigs', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockValidateNodeConfig.mockReturnValue({ valid: true, errors: [] });
	});

	it.each(['sendAndWait', 'dispatchAndWait'])(
		'rejects unsupported operation %s with approval guidance',
		async (operation) => {
			const result = await validateNodeToolConfigs([nodeTool(operation)]);

			expect(result).toContain(`"${operation}"`);
			expect(result).toContain('requireApproval: true');
			expect(mockValidateNodeConfig).not.toHaveBeenCalled();
		},
	);

	it('accepts a normal send operation', async () => {
		const result = await validateNodeToolConfigs([nodeTool('post')]);

		expect(result).toBeNull();
		expect(mockValidateNodeConfig).toHaveBeenCalledOnce();
	});
});
