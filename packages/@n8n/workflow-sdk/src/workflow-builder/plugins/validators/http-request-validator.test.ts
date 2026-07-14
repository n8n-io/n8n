import { httpRequestValidator } from './http-request-validator';
import type { GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext } from '../types';

// Helper to create a mock node instance
function createMockNode(
	type: string,
	config: { parameters?: Record<string, unknown> } = {},
): NodeInstance<string, string, unknown> {
	return {
		type,
		name: 'Test HTTP Request',
		version: '1',
		config: {
			parameters: config.parameters ?? {},
		},
	} as NodeInstance<string, string, unknown>;
}

// Helper to create a mock graph node
function createGraphNode(node: NodeInstance<string, string, unknown>): GraphNode {
	return {
		instance: node,
		connections: new Map(),
	};
}

// Helper to create a mock plugin context
function createMockPluginContext(): PluginContext {
	return {
		nodes: new Map(),
		workflowId: 'test-workflow',
		workflowName: 'Test Workflow',
		settings: {},
	};
}

describe('httpRequestValidator', () => {
	describe('metadata', () => {
		it('has correct id', () => {
			expect(httpRequestValidator.id).toBe('core:http-request');
		});

		it('nodeTypes includes httpRequest node type', () => {
			expect(httpRequestValidator.nodeTypes).toContain('n8n-nodes-base.httpRequest');
		});
	});

	describe('validateNode - sensitive headers', () => {
		it('returns HARDCODED_CREDENTIALS warning for Authorization header with static value', () => {
			const node = createMockNode('n8n-nodes-base.httpRequest', {
				parameters: {
					headerParameters: {
						parameters: [{ name: 'Authorization', value: 'Bearer secret123' }],
					},
				},
			});
			const ctx = createMockPluginContext();

			const issues = httpRequestValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toContainEqual(
				expect.objectContaining({
					code: 'HARDCODED_CREDENTIALS',
					severity: 'warning',
				}),
			);
			expect(issues[0].message).toContain('httpHeaderAuth');
		});

		it('returns no warning for Authorization header with expression', () => {
			const node = createMockNode('n8n-nodes-base.httpRequest', {
				parameters: {
					headerParameters: {
						parameters: [{ name: 'Authorization', value: '={{ $json.token }}' }],
					},
				},
			});
			const ctx = createMockPluginContext();

			const issues = httpRequestValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues.filter((i) => i.code === 'HARDCODED_CREDENTIALS')).toHaveLength(0);
		});

		it('detects X-API-Key header', () => {
			const node = createMockNode('n8n-nodes-base.httpRequest', {
				parameters: {
					headerParameters: {
						parameters: [{ name: 'X-API-Key', value: 'my-secret-key' }],
					},
				},
			});
			const ctx = createMockPluginContext();

			const issues = httpRequestValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues.filter((i) => i.code === 'HARDCODED_CREDENTIALS')).toHaveLength(1);
		});

		it('detects x-auth-token header (case insensitive)', () => {
			const node = createMockNode('n8n-nodes-base.httpRequest', {
				parameters: {
					headerParameters: {
						parameters: [{ name: 'x-auth-token', value: 'my-token' }],
					},
				},
			});
			const ctx = createMockPluginContext();

			const issues = httpRequestValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues.filter((i) => i.code === 'HARDCODED_CREDENTIALS')).toHaveLength(1);
		});
	});

	describe('validateNode - credential query parameters', () => {
		it('returns HARDCODED_CREDENTIALS warning for api_key query parameter', () => {
			const node = createMockNode('n8n-nodes-base.httpRequest', {
				parameters: {
					queryParameters: {
						parameters: [{ name: 'api_key', value: 'my-api-key' }],
					},
				},
			});
			const ctx = createMockPluginContext();

			const issues = httpRequestValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toContainEqual(
				expect.objectContaining({
					code: 'HARDCODED_CREDENTIALS',
					severity: 'warning',
				}),
			);
			expect(issues[0].message).toContain('httpQueryAuth');
		});

		it('returns no warning for api_key with expression', () => {
			const node = createMockNode('n8n-nodes-base.httpRequest', {
				parameters: {
					queryParameters: {
						parameters: [{ name: 'api_key', value: '={{ $env.API_KEY }}' }],
					},
				},
			});
			const ctx = createMockPluginContext();

			const issues = httpRequestValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues.filter((i) => i.code === 'HARDCODED_CREDENTIALS')).toHaveLength(0);
		});

		it('detects access_token query parameter', () => {
			const node = createMockNode('n8n-nodes-base.httpRequest', {
				parameters: {
					queryParameters: {
						parameters: [{ name: 'access_token', value: 'secret' }],
					},
				},
			});
			const ctx = createMockPluginContext();

			const issues = httpRequestValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues.filter((i) => i.code === 'HARDCODED_CREDENTIALS')).toHaveLength(1);
		});
	});

	describe('validateNode - raw body content type', () => {
		it('returns INVALID_PARAMETER when a SOAP payload is configured as jsonBody', () => {
			const node = createMockNode('n8n-nodes-base.httpRequest', {
				parameters: {
					sendBody: true,
					contentType: 'json',
					specifyBody: 'json',
					jsonBody: '={{ \'<?xml version="1.0"?><soap:Envelope></soap:Envelope>\' }}',
				},
			});
			const ctx = createMockPluginContext();

			const issues = httpRequestValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toContainEqual(
				expect.objectContaining({
					code: 'INVALID_PARAMETER',
					severity: 'error',
					parameterPath: 'jsonBody',
				}),
			);
			expect(issues[0].message).toContain("contentType='raw'");
			expect(issues[0].message).toContain('rawContentType');
			expect(issues[0].message).toContain('omit specifyBody/jsonBody/bodyParameters');
		});

		it('returns INVALID_PARAMETER when jsonBody references an XML payload field', () => {
			const node = createMockNode('n8n-nodes-base.httpRequest', {
				parameters: {
					sendBody: true,
					contentType: 'json',
					specifyBody: 'json',
					jsonBody: '={{ $json.soapBody }}',
				},
			});
			const ctx = createMockPluginContext();

			const issues = httpRequestValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toContainEqual(
				expect.objectContaining({
					code: 'INVALID_PARAMETER',
					severity: 'error',
					parameterPath: 'jsonBody',
				}),
			);
		});

		it.each(['={{ JSON.stringify($json.xmlData) }}', '={{ $json.soapVersion }}'])(
			'allows JSON bodies that reference non-payload XML/SOAP fields: %s',
			(jsonBody) => {
				const node = createMockNode('n8n-nodes-base.httpRequest', {
					parameters: {
						sendBody: true,
						contentType: 'json',
						specifyBody: 'json',
						jsonBody,
					},
				});
				const ctx = createMockPluginContext();

				const issues = httpRequestValidator.validateNode(node, createGraphNode(node), ctx);

				expect(issues.filter((i) => i.code === 'INVALID_PARAMETER')).toHaveLength(0);
			},
		);

		it('allows valid JSON bodies that contain XML as a field value', () => {
			const node = createMockNode('n8n-nodes-base.httpRequest', {
				parameters: {
					sendBody: true,
					contentType: 'json',
					specifyBody: 'json',
					jsonBody: JSON.stringify({ payload: '<?xml version="1.0"?><root />' }),
				},
			});
			const ctx = createMockPluginContext();

			const issues = httpRequestValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues.filter((i) => i.code === 'INVALID_PARAMETER')).toHaveLength(0);
		});

		it('returns INVALID_PARAMETER when raw XML content type has no body', () => {
			const node = createMockNode('n8n-nodes-base.httpRequest', {
				parameters: {
					sendBody: true,
					contentType: 'raw',
					rawContentType: 'text/xml',
				},
			});
			const ctx = createMockPluginContext();

			const issues = httpRequestValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toContainEqual(
				expect.objectContaining({
					code: 'INVALID_PARAMETER',
					severity: 'error',
					parameterPath: 'body',
				}),
			);
			expect(issues[0].message).toContain("contentType='raw'");
			expect(issues[0].message).toContain("expr('{{ $json.soapBody }}')");
		});

		it('allows raw XML content type with a body expression', () => {
			const node = createMockNode('n8n-nodes-base.httpRequest', {
				parameters: {
					sendBody: true,
					contentType: 'raw',
					rawContentType: 'application/soap+xml',
					body: '={{ $json.soapBody }}',
				},
			});
			const ctx = createMockPluginContext();

			const issues = httpRequestValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues.filter((i) => i.code === 'INVALID_PARAMETER')).toHaveLength(0);
		});
	});

	describe('validateNode - edge cases', () => {
		it('returns no issues when parameters is undefined', () => {
			const node = createMockNode('n8n-nodes-base.httpRequest', {});
			const ctx = createMockPluginContext();

			const issues = httpRequestValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toHaveLength(0);
		});

		it('returns no issues when headerParameters is undefined', () => {
			const node = createMockNode('n8n-nodes-base.httpRequest', {
				parameters: { url: 'https://example.com' },
			});
			const ctx = createMockPluginContext();

			const issues = httpRequestValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toHaveLength(0);
		});

		it('handles non-sensitive headers without warning', () => {
			const node = createMockNode('n8n-nodes-base.httpRequest', {
				parameters: {
					headerParameters: {
						parameters: [{ name: 'Content-Type', value: 'application/json' }],
					},
				},
			});
			const ctx = createMockPluginContext();

			const issues = httpRequestValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toHaveLength(0);
		});
	});
});
