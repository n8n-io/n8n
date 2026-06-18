import type {
	INode,
	INodePropertyOptions,
	IWebhookFunctions,
	ICredentialDataDecryptedObject,
} from 'n8n-workflow';
import type { Mock, Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { createMockLogger, createMockRequest, createMockResponse } from './helpers';
import { McpServer } from '../McpServer';
import { McpTrigger } from '../McpTrigger.node';

const INBOUND_TRIGGER_AUTHENTICATION_BUILDER_HINT =
	"Default to 'none'. n8n exposes inbound trigger URLs publicly by design. Only select an authentication method when the user explicitly asks to authenticate inbound traffic.";

// Mock the McpServer
vi.mock('../McpServer', () => ({
	McpServer: {
		instance: vi.fn(),
	},
	MCP_LIST_TOOLS_REQUEST_MARKER: 'mcp_list_tools_request',
}));

const { validateWebhookAuthenticationMock } = vi.hoisted(() => ({
	validateWebhookAuthenticationMock: vi.fn(),
}));

// Mock webhook utils from nodes-base
vi.mock('n8n-nodes-base/dist/nodes/Webhook/utils', () => ({
	validateWebhookAuthentication: validateWebhookAuthenticationMock,
}));

// Mock getConnectedTools from utils
vi.mock('@utils/helpers', () => ({
	getConnectedTools: vi.fn().mockResolvedValue([]),
}));

describe('McpTrigger', () => {
	let mcpTrigger: McpTrigger;
	let mockMcpServer: Mocked<McpServer>;
	let mockContext: Mocked<IWebhookFunctions>;
	let mockLogger: ReturnType<typeof createMockLogger>;

	beforeEach(() => {
		mcpTrigger = new McpTrigger();
		mockLogger = createMockLogger();

		mockMcpServer = {
			handleSetupRequest: vi.fn().mockResolvedValue(undefined),
			handlePostMessage: vi.fn().mockResolvedValue({
				wasToolCall: false,
				toolCallInfo: undefined,
				messageId: undefined,
				relaySessionId: undefined,
				needsListToolsRelay: false,
			}),
			handleDeleteRequest: vi.fn().mockResolvedValue(undefined),
			handleStreamableHttpSetup: vi.fn().mockResolvedValue(undefined),
			getSessionId: vi.fn().mockReturnValue(undefined),
		} as unknown as Mocked<McpServer>;

		(McpServer.instance as Mock).mockReturnValue(mockMcpServer);

		mockContext = mock<IWebhookFunctions>({
			getWebhookName: vi.fn().mockReturnValue('setup'),
			getRequestObject: vi.fn(),
			getResponseObject: vi.fn(),
			getNode: vi.fn(),
			logger: mockLogger,
			getCredentials: vi.fn().mockResolvedValue({} as ICredentialDataDecryptedObject),
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('description', () => {
		it('should have the correct node metadata', () => {
			expect(mcpTrigger.description.name).toBe('mcpTrigger');
			expect(mcpTrigger.description.displayName).toBe('MCP Server Trigger');
			expect(mcpTrigger.description.group).toContain('trigger');
		});

		it('should support multiple versions', () => {
			expect(mcpTrigger.description.version).toEqual([1, 1.1, 2]);
		});

		it('should have authentication options', () => {
			const authParam = mcpTrigger.description.properties?.find((p) => p.name === 'authentication');
			expect(authParam).toBeDefined();
			expect(authParam?.type).toBe('options');
			expect(authParam?.default).toBe('none');
			expect(authParam?.options).toHaveLength(4);
			expect(authParam?.builderHint).toEqual({
				propertyHint: INBOUND_TRIGGER_AUTHENTICATION_BUILDER_HINT,
			});
		});

		it('should gate the n8nOAuth2 option to node version 2 and above', () => {
			const authParam = mcpTrigger.description.properties?.find((p) => p.name === 'authentication');
			const options = authParam?.options as INodePropertyOptions[];
			const oauthOption = options.find((o) => o.value === 'n8nOAuth2');

			expect(oauthOption).toBeDefined();
			expect(oauthOption?.displayOptions).toEqual({ show: { '@version': [{ _cnd: { gte: 2 } }] } });
		});

		it('should define webhook endpoints', () => {
			const webhooks = mcpTrigger.description.webhooks;
			expect(webhooks).toHaveLength(3);

			const setupWebhook = webhooks?.find((w) => w.name === 'setup');
			expect(setupWebhook?.httpMethod).toBe('GET');

			const defaultWebhooks = webhooks?.filter((w) => w.name === 'default');
			expect(defaultWebhooks).toHaveLength(2);
			expect(defaultWebhooks?.map((w) => w.httpMethod)).toEqual(['POST', 'DELETE']);
		});
	});

	describe('webhook - setup (GET)', () => {
		it('should handle setup request for version 1', async () => {
			const req = createMockRequest({ path: '/webhook/sse' });
			const resp = createMockResponse();
			const node = mock<INode>({
				typeVersion: 1,
				name: 'MCP Server Trigger',
			});

			mockContext.getWebhookName.mockReturnValue('setup');
			mockContext.getRequestObject.mockReturnValue(req as never);
			mockContext.getResponseObject.mockReturnValue(resp as never);
			mockContext.getNode.mockReturnValue(node);

			const result = await mcpTrigger.webhook(mockContext);

			expect(mockMcpServer.handleSetupRequest).toHaveBeenCalled();
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('should use n8n-mcp-server name for version 1', async () => {
			const req = createMockRequest({ path: '/webhook/sse' });
			const resp = createMockResponse();
			const node = mock<INode>({
				typeVersion: 1,
				name: 'MCP Server Trigger',
			});

			mockContext.getWebhookName.mockReturnValue('setup');
			mockContext.getRequestObject.mockReturnValue(req as never);
			mockContext.getResponseObject.mockReturnValue(resp as never);
			mockContext.getNode.mockReturnValue(node);

			await mcpTrigger.webhook(mockContext);

			expect(mockMcpServer.handleSetupRequest).toHaveBeenCalledWith(
				req,
				resp,
				'n8n-mcp-server',
				expect.any(String),
				expect.any(Array),
			);
		});

		it('should use sanitized node name for version > 1', async () => {
			const req = createMockRequest({ path: '/webhook' });
			const resp = createMockResponse();
			const node = mock<INode>({
				typeVersion: 2,
				name: 'My Custom MCP Server',
			});

			mockContext.getWebhookName.mockReturnValue('setup');
			mockContext.getRequestObject.mockReturnValue(req as never);
			mockContext.getResponseObject.mockReturnValue(resp as never);
			mockContext.getNode.mockReturnValue(node);

			await mcpTrigger.webhook(mockContext);

			// nodeNameToToolName converts "My Custom MCP Server" to a sanitized name
			expect(mockMcpServer.handleSetupRequest).toHaveBeenCalledWith(
				req,
				resp,
				expect.stringMatching(/^[a-z0-9_-]+$/i),
				expect.any(String),
				expect.any(Array),
			);
		});

		it('should compute correct POST URL for version 1', async () => {
			const req = createMockRequest({ path: '/webhook/sse' });
			const resp = createMockResponse();
			const node = mock<INode>({
				typeVersion: 1,
				name: 'MCP Server Trigger',
			});

			mockContext.getWebhookName.mockReturnValue('setup');
			mockContext.getRequestObject.mockReturnValue(req as never);
			mockContext.getResponseObject.mockReturnValue(resp as never);
			mockContext.getNode.mockReturnValue(node);

			await mcpTrigger.webhook(mockContext);

			expect(mockMcpServer.handleSetupRequest).toHaveBeenCalledWith(
				req,
				resp,
				expect.any(String),
				'/webhook/messages',
				expect.any(Array),
			);
		});

		it('should use same path as POST URL for version 2', async () => {
			const req = createMockRequest({ path: '/webhook' });
			const resp = createMockResponse();
			const node = mock<INode>({
				typeVersion: 2,
				name: 'MCP Server Trigger',
			});

			mockContext.getWebhookName.mockReturnValue('setup');
			mockContext.getRequestObject.mockReturnValue(req as never);
			mockContext.getResponseObject.mockReturnValue(resp as never);
			mockContext.getNode.mockReturnValue(node);

			await mcpTrigger.webhook(mockContext);

			expect(mockMcpServer.handleSetupRequest).toHaveBeenCalledWith(
				req,
				resp,
				expect.any(String),
				'/webhook',
				expect.any(Array),
			);
		});
	});

	describe('webhook - default POST', () => {
		it('should handle POST with existing session', async () => {
			const req = createMockRequest({ method: 'POST', query: { sessionId: 'test-session' } });
			const resp = createMockResponse();
			const node = mock<INode>({
				typeVersion: 2,
				name: 'MCP Server Trigger',
			});

			mockMcpServer.getSessionId.mockReturnValue('test-session');

			mockContext.getWebhookName.mockReturnValue('default');
			mockContext.getRequestObject.mockReturnValue(req as never);
			mockContext.getResponseObject.mockReturnValue(resp as never);
			mockContext.getNode.mockReturnValue(node);

			const result = await mcpTrigger.webhook(mockContext);

			expect(mockMcpServer.handlePostMessage).toHaveBeenCalled();
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('should return workflow data when tool call is detected', async () => {
			const req = createMockRequest({ method: 'POST', query: { sessionId: 'test-session' } });
			const resp = createMockResponse();
			const node = mock<INode>({
				typeVersion: 2,
				name: 'MCP Server Trigger',
			});

			mockMcpServer.getSessionId.mockReturnValue('test-session');
			mockMcpServer.handlePostMessage.mockResolvedValue({
				wasToolCall: true,
				toolCallInfo: { toolName: 'test-tool', arguments: { arg1: 'value1' } },
				messageId: 'msg-123',
				relaySessionId: undefined,
				needsListToolsRelay: false,
			});

			mockContext.getWebhookName.mockReturnValue('default');
			mockContext.getRequestObject.mockReturnValue(req as never);
			mockContext.getResponseObject.mockReturnValue(resp as never);
			mockContext.getNode.mockReturnValue(node);

			const result = await mcpTrigger.webhook(mockContext);

			expect(result).toEqual({
				noWebhookResponse: true,
				workflowData: [
					[
						{
							json: {
								mcpToolCall: { toolName: 'test-tool', arguments: { arg1: 'value1' } },
								mcpMessageId: 'msg-123',
							},
						},
					],
				],
			});
		});

		it('should handle Streamable HTTP setup when no session exists', async () => {
			const req = createMockRequest({ method: 'POST' });
			const resp = createMockResponse();
			const node = mock<INode>({
				typeVersion: 2,
				name: 'MCP Server Trigger',
			});

			mockMcpServer.getSessionId.mockReturnValue(undefined);

			mockContext.getWebhookName.mockReturnValue('default');
			mockContext.getRequestObject.mockReturnValue(req as never);
			mockContext.getResponseObject.mockReturnValue(resp as never);
			mockContext.getNode.mockReturnValue(node);

			const result = await mcpTrigger.webhook(mockContext);

			expect(mockMcpServer.handleStreamableHttpSetup).toHaveBeenCalled();
			expect(result).toEqual({ noWebhookResponse: true });
		});
	});

	describe('webhook - default DELETE', () => {
		it('should handle DELETE request', async () => {
			const req = createMockRequest({ method: 'DELETE' });
			const resp = createMockResponse();
			const node = mock<INode>({
				typeVersion: 2,
				name: 'MCP Server Trigger',
			});

			mockContext.getWebhookName.mockReturnValue('default');
			mockContext.getRequestObject.mockReturnValue(req as never);
			mockContext.getResponseObject.mockReturnValue(resp as never);
			mockContext.getNode.mockReturnValue(node);

			const result = await mcpTrigger.webhook(mockContext);

			expect(mockMcpServer.handleDeleteRequest).toHaveBeenCalledWith(req, resp);
			expect(result).toEqual({ noWebhookResponse: true });
		});
	});

	describe('authentication', () => {
		it('should rethrow non-authorization errors', async () => {
			const genericError = new Error('Something went wrong');
			validateWebhookAuthenticationMock.mockRejectedValue(genericError);

			const req = createMockRequest({ path: '/webhook' });
			const resp = createMockResponse();
			const node = mock<INode>({
				typeVersion: 2,
				name: 'MCP Server Trigger',
			});

			mockContext.getWebhookName.mockReturnValue('setup');
			mockContext.getRequestObject.mockReturnValue(req as never);
			mockContext.getResponseObject.mockReturnValue(resp as never);
			mockContext.getNode.mockReturnValue(node);

			await expect(mcpTrigger.webhook(mockContext)).rejects.toThrow('Something went wrong');
		});

		it('should return 401 for authentication errors', async () => {
			const { WebhookAuthorizationError }: { WebhookAuthorizationError: any } =
				await vi.importActual('n8n-nodes-base/dist/nodes/Webhook/error');
			validateWebhookAuthenticationMock.mockRejectedValue(
				new WebhookAuthorizationError(401, 'Unauthorized'),
			);

			const req = createMockRequest({ path: '/webhook' });
			const resp = createMockResponse();
			const node = mock<INode>({
				typeVersion: 2,
				name: 'MCP Server Trigger',
			});

			mockContext.getWebhookName.mockReturnValue('setup');
			mockContext.getRequestObject.mockReturnValue(req as never);
			mockContext.getResponseObject.mockReturnValue(resp as never);
			mockContext.getNode.mockReturnValue(node);

			const result = await mcpTrigger.webhook(mockContext);

			expect(resp.writeHead).toHaveBeenCalledWith(401);
			expect(resp.end).toHaveBeenCalledWith('Unauthorized');
			expect(result).toEqual({ noWebhookResponse: true });
		});
	});

	describe('n8nOAuth2 authentication', () => {
		const resourceUrl = 'https://n8n.example.com/mcp/abc';
		const prmUrl = 'https://n8n.example.com/.well-known/oauth-protected-resource/mcp/abc';

		function setupContext(opts: { typeVersion: number; headers?: Record<string, string> }) {
			const req = createMockRequest({ path: '/mcp/abc', headers: opts.headers ?? {} });
			const resp = createMockResponse();
			const node = mock<INode>({ typeVersion: opts.typeVersion, name: 'MCP Server Trigger' });

			mockContext.getNodeParameter.mockReturnValue('n8nOAuth2');
			mockContext.getNodeWebhookUrl.mockReturnValue(resourceUrl);
			mockContext.getWebhookName.mockReturnValue('setup');
			mockContext.getRequestObject.mockReturnValue(req as never);
			mockContext.getResponseObject.mockReturnValue(resp as never);
			mockContext.getNode.mockReturnValue(node);
			return { req, resp, node };
		}

		it('fails closed with 401 on node version below 2', async () => {
			const { resp } = setupContext({ typeVersion: 1.1 });

			const result = await mcpTrigger.webhook(mockContext);

			expect(resp.writeHead).toHaveBeenCalledWith(401);
			expect(mockContext.validateN8nOAuth2Token).not.toHaveBeenCalled();
			expect(mockMcpServer.handleSetupRequest).not.toHaveBeenCalled();
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('returns 401 with resource_metadata and no error when the bearer token is missing', async () => {
			const { resp } = setupContext({ typeVersion: 2 });

			const result = await mcpTrigger.webhook(mockContext);

			expect(resp.writeHead).toHaveBeenCalledWith(401, {
				'WWW-Authenticate': `Bearer realm="n8n MCP Server", resource_metadata="${prmUrl}"`,
			});
			expect(mockContext.validateN8nOAuth2Token).not.toHaveBeenCalled();
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('returns 401 with error="invalid_token" when the token is rejected', async () => {
			const { resp } = setupContext({
				typeVersion: 2,
				headers: { authorization: 'Bearer bad-token' },
			});
			mockContext.validateN8nOAuth2Token.mockResolvedValue({
				valid: false,
				reason: 'invalid_token',
			});

			const result = await mcpTrigger.webhook(mockContext);

			expect(mockContext.validateN8nOAuth2Token).toHaveBeenCalledWith('bad-token', resourceUrl);
			expect(resp.writeHead).toHaveBeenCalledWith(401, {
				'WWW-Authenticate': `Bearer realm="n8n MCP Server", resource_metadata="${prmUrl}", error="invalid_token"`,
			});
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('returns 503 when the token verifier is unavailable', async () => {
			const { resp } = setupContext({
				typeVersion: 2,
				headers: { authorization: 'Bearer some-token' },
			});
			mockContext.validateN8nOAuth2Token.mockResolvedValue({
				valid: false,
				reason: 'verifier_unavailable',
			});

			const result = await mcpTrigger.webhook(mockContext);

			expect(resp.status).toHaveBeenCalledWith(503);
			expect(resp.writeHead).not.toHaveBeenCalled();
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('proceeds to MCP dispatch when the token is valid', async () => {
			setupContext({ typeVersion: 2, headers: { authorization: 'Bearer good-token' } });
			mockContext.validateN8nOAuth2Token.mockResolvedValue({
				valid: true,
				user: { id: 'u1', email: 'u@example.com', firstName: 'U', lastName: 'One' },
			});

			const result = await mcpTrigger.webhook(mockContext);

			expect(mockMcpServer.handleSetupRequest).toHaveBeenCalled();
			expect(result).toEqual({ noWebhookResponse: true });
		});
	});

	describe('list tools relay', () => {
		it('should return list tools relay data when needed', async () => {
			// Reset validateWebhookAuthentication to resolve (not reject)
			validateWebhookAuthenticationMock.mockResolvedValue(undefined);

			const req = createMockRequest({ method: 'POST', query: { sessionId: 'test-session' } });
			const resp = createMockResponse();
			const node = mock<INode>({
				typeVersion: 2,
				name: 'MCP Server Trigger',
			});

			mockMcpServer.getSessionId.mockReturnValue('test-session');
			mockMcpServer.handlePostMessage.mockResolvedValue({
				wasToolCall: false,
				toolCallInfo: undefined,
				messageId: 'msg-456',
				relaySessionId: 'relay-session-789',
				needsListToolsRelay: true,
			});

			mockContext.getWebhookName.mockReturnValue('default');
			mockContext.getRequestObject.mockReturnValue(req as never);
			mockContext.getResponseObject.mockReturnValue(resp as never);
			mockContext.getNode.mockReturnValue(node);

			const result = await mcpTrigger.webhook(mockContext);

			expect(result).toEqual({
				noWebhookResponse: true,
				workflowData: [
					[
						{
							json: {
								mcpListToolsRelay: {
									sessionId: 'relay-session-789',
									messageId: 'msg-456',
									marker: 'mcp_list_tools_request',
								},
							},
						},
					],
				],
			});
		});
	});
});
