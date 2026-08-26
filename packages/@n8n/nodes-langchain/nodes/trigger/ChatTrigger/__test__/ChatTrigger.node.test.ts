import { ChatTriggerConfig } from '@n8n/config/src';
import { Container } from '@n8n/di';
import type { Request, Response } from 'express';
import type { INode, IWebhookFunctions } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ChatTrigger } from '../ChatTrigger.node';
import { ChatTriggerAuthorizationError } from '../error';
import { validateAuth } from '../GenericFunctions';
import type { LoadPreviousSessionChatOption } from '../types';

vi.mock('../GenericFunctions', () => ({
	validateAuth: vi.fn(),
}));

const INBOUND_TRIGGER_AUTHENTICATION_BUILDER_HINT =
	"Default to 'none'. n8n exposes inbound trigger URLs publicly by design. Only select an authentication method when the user explicitly asks to authenticate inbound traffic.";

describe('ChatTrigger Node', () => {
	const mockContext = mock<IWebhookFunctions>();
	const mockRequest = mock<Request>();
	const mockResponse = mock<Response>();
	let chatTrigger: ChatTrigger;
	let chatTriggerConfig: ChatTriggerConfig;

	beforeEach(() => {
		vi.clearAllMocks();

		chatTriggerConfig = new ChatTriggerConfig();
		vi.mocked(Container.get).mockReturnValue(chatTriggerConfig as never);
		chatTrigger = new ChatTrigger();
		Container.set(ChatTriggerConfig, chatTriggerConfig);

		mockResponse.status.mockReturnValue(mockResponse);
		mockResponse.send.mockReturnValue(mockResponse);
		mockResponse.end.mockReturnValue(mockResponse);
		mockResponse.writeHead.mockReturnValue(mockResponse);
		mockResponse.flushHeaders.mockImplementation(() => mockResponse);

		// Provide socket methods required by the streaming keepalive configuration
		mockRequest.socket = {
			...mockRequest.socket,
			setTimeout: vi.fn(),
			setNoDelay: vi.fn(),
			setKeepAlive: vi.fn(),
		} as unknown as Request['socket'];

		mockContext.getRequestObject.mockReturnValue(mockRequest);
		mockContext.getResponseObject.mockReturnValue(mockResponse);
		mockContext.getNode.mockReturnValue({
			name: 'Chat Trigger',
			type: 'n8n-nodes-langchain.chatTrigger',
			typeVersion: 1,
		} as INode);
		mockContext.getMode.mockReturnValue('webhook');
		mockContext.getWebhookName.mockReturnValue('default');
		mockContext.getBodyData.mockReturnValue({ message: 'Hello' });
		mockContext.helpers = {
			returnJsonArray: vi.fn().mockReturnValue([]),
		} as unknown as IWebhookFunctions['helpers'];
		mockContext.getNodeParameter.mockImplementation(
			(
				paramName: string,
				defaultValue?: boolean | string | object,
			): boolean | string | object | undefined => {
				if (paramName === 'public') return true;
				if (paramName === 'mode') return 'hostedChat';
				if (paramName === 'options') return {};
				if (paramName === 'availableInChat') return false;
				if (paramName === 'authentication') return 'none';
				return defaultValue;
			},
		);
	});

	describe('description', () => {
		beforeEach(() => {
			mockContext.getBodyData.mockReturnValue({ action: 'loadPreviousSession' });
		});

		it('should tell builders to keep inbound authentication disabled unless requested', async () => {
			// Call the webhook method
			const result = await chatTrigger.webhook(mockContext);

			// Verify the returned result contains empty data array
			expect(result).toEqual({
				webhookResponse: { data: [] },
			});
		});

		it('should return empty array when loadPreviousSession is "notSupported"', async () => {
			// Mock options with notSupported loadPreviousSession
			mockContext.getNodeParameter.mockImplementation(
				(
					paramName: string,
					defaultValue?: boolean | string | object,
				): boolean | string | object | undefined => {
					if (paramName === 'public') return true;
					if (paramName === 'mode') return 'hostedChat';
					if (paramName === 'options') return { loadPreviousSession: 'notSupported' };
					return defaultValue;
				},
			);

			// Call the webhook method
			const result = await chatTrigger.webhook(mockContext);

			// Verify the returned result contains empty data array
			expect(result).toEqual({
				webhookResponse: { data: [] },
			});
		});

		it('should handle loadPreviousSession="memory" correctly', async () => {
			const authParam = chatTrigger.description.properties.find(
				(property) => property.name === 'authentication',
			);

			// Mock chat history data
			const mockMessages = [
				{ toJSON: () => ({ content: 'Message 1' }) },
				{ toJSON: () => ({ content: 'Message 2' }) },
			];

			// Mock memory with chat history
			const mockMemory = {
				chatHistory: {
					getMessages: vi.fn().mockReturnValueOnce(mockMessages),
				},
			};

			// Mock options with memory loadPreviousSession
			mockContext.getNodeParameter.mockImplementation(
				(
					paramName: string,
					defaultValue?: boolean | string | object,
				): boolean | string | object | undefined => {
					if (paramName === 'public') return true;
					if (paramName === 'mode') return 'hostedChat';
					if (paramName === 'options')
						return { loadPreviousSession: 'memory' as LoadPreviousSessionChatOption };
					return defaultValue;
				},
			);

			// Mock getInputConnectionData to return memory
			mockContext.getInputConnectionData.mockResolvedValue(mockMemory);

			// Call the webhook method
			const result = await chatTrigger.webhook(mockContext);

			// Verify the returned result contains messages from memory
			expect(result).toEqual({
				webhookResponse: {
					data: [{ content: 'Message 1' }, { content: 'Message 2' }],
				},
			});
			expect(authParam).toMatchObject({
				default: 'none',
				builderHint: {
					propertyHint: INBOUND_TRIGGER_AUTHENTICATION_BUILDER_HINT,
				},
			});
		});
	});

	describe('webhook method', () => {
		it('returns 404 for public chat when instance policy disables public chat', async () => {
			chatTriggerConfig.disablePublicChat = true;

			const result = await chatTrigger.webhook(mockContext);

			expect(mockContext.getNodeParameter).not.toHaveBeenCalledWith('public', false);
			expect(mockResponse.status).toHaveBeenCalledWith(404);
			expect(mockResponse.end).toHaveBeenCalled();
			expect(result).toEqual({
				noWebhookResponse: true,
			});
		});

		it('allows public chat when instance policy is disabled', async () => {
			chatTriggerConfig.disablePublicChat = false;

			const result = await chatTrigger.webhook(mockContext);

			expect(mockContext.getNodeParameter).toHaveBeenCalledWith('public', false);
			expect(mockResponse.status).not.toHaveBeenCalledWith(404);
			expect(result).toEqual({
				webhookResponse: { status: 200 },
				workflowData: expect.any(Array),
			});
		});

		it('should enable streaming when availableInChat is true and responseMode is not set', async () => {
			// Mock options with availableInChat true and no responseMode
			mockContext.getNodeParameter.mockImplementation(
				(
					paramName: string,
					defaultValue?: boolean | string | object,
				): boolean | string | object | undefined => {
					if (paramName === 'public') return true;
					if (paramName === 'mode') return 'hostedChat';
					if (paramName === 'options') return {};
					if (paramName === 'availableInChat') return true;
					return defaultValue;
				},
			);

			// Call the webhook method
			const result = await chatTrigger.webhook(mockContext);

			// Verify streaming headers are set
			expect(mockResponse.writeHead).toHaveBeenCalledWith(200, {
				'Content-Type': 'application/json; charset=utf-8',
				'Transfer-Encoding': 'chunked',
				'Cache-Control': 'no-cache, no-transform',
				Connection: 'keep-alive',
			});
			expect(mockResponse.flushHeaders).toHaveBeenCalled();

			// Verify response structure for streaming
			expect(result).toEqual({
				workflowData: expect.any(Array),
				noWebhookResponse: true,
			});
		});

		it('should enable streaming when availableInChat is true and responseMode is "streaming"', async () => {
			// Mock options with availableInChat true and streaming responseMode
			mockContext.getNodeParameter.mockImplementation(
				(
					paramName: string,
					defaultValue?: boolean | string | object,
				): boolean | string | object | undefined => {
					if (paramName === 'public') return true;
					if (paramName === 'mode') return 'hostedChat';
					if (paramName === 'options') return { responseMode: 'streaming' };
					if (paramName === 'availableInChat') return true;
					return defaultValue;
				},
			);

			// Call the webhook method
			const result = await chatTrigger.webhook(mockContext);

			// Verify streaming headers are set
			expect(mockResponse.writeHead).toHaveBeenCalledWith(200, {
				'Content-Type': 'application/json; charset=utf-8',
				'Transfer-Encoding': 'chunked',
				'Cache-Control': 'no-cache, no-transform',
				Connection: 'keep-alive',
			});
			expect(mockResponse.flushHeaders).toHaveBeenCalled();

			// Verify response structure for streaming
			expect(result).toEqual({
				workflowData: expect.any(Array),
				noWebhookResponse: true,
			});
		});

		it('should handle multipart form data with streaming enabled', async () => {
			// Mock multipart form data request
			mockRequest.contentType = 'multipart/form-data';
			mockRequest.body = {
				data: { message: 'Hello' },
				files: {},
			};

			// Mock options with streaming responseMode
			mockContext.getNodeParameter.mockImplementation(
				(
					paramName: string,
					defaultValue?: boolean | string | object,
				): boolean | string | object | undefined => {
					if (paramName === 'public') return true;
					if (paramName === 'mode') return 'hostedChat';
					if (paramName === 'options') return { responseMode: 'streaming' };
					return defaultValue;
				},
			);

			// Call the webhook method
			const result = await chatTrigger.webhook(mockContext);

			// Verify streaming headers are set
			expect(mockResponse.writeHead).toHaveBeenCalledWith(200, {
				'Content-Type': 'application/json; charset=utf-8',
				'Transfer-Encoding': 'chunked',
				'Cache-Control': 'no-cache, no-transform',
				Connection: 'keep-alive',
			});
			expect(mockResponse.flushHeaders).toHaveBeenCalled();

			// Verify response structure for streaming
			expect(result).toEqual({
				workflowData: expect.any(Array),
				noWebhookResponse: true,
			});
		});

		it('skips auth validation for manual (test) executions', async () => {
			mockContext.getMode.mockReturnValue('manual');
			mockContext.getNodeParameter.mockImplementation(
				(
					paramName: string,
					defaultValue?: boolean | string | object,
				): boolean | string | object | undefined => {
					if (paramName === 'public') return true;
					if (paramName === 'mode') return 'hostedChat';
					if (paramName === 'options') return {};
					if (paramName === 'availableInChat') return false;
					if (paramName === 'authentication') return 'basicAuth';
					return defaultValue;
				},
			);

			const result = await chatTrigger.webhook(mockContext);

			expect(validateAuth).not.toHaveBeenCalled();
			expect(mockResponse.writeHead).not.toHaveBeenCalledWith(401, expect.anything());
			expect(result).toEqual({
				webhookResponse: { status: 200 },
				workflowData: expect.any(Array),
			});
		});

		it('still enforces auth validation for production executions', async () => {
			mockContext.getMode.mockReturnValue('webhook');
			mockContext.getNode.mockReturnValue({
				name: 'Chat Trigger',
				type: 'n8n-nodes-langchain.chatTrigger',
				typeVersion: 1,
				webhookId: 'abc123',
			} as INode);
			mockContext.getNodeParameter.mockImplementation(
				(
					paramName: string,
					defaultValue?: boolean | string | object,
				): boolean | string | object | undefined => {
					if (paramName === 'public') return true;
					if (paramName === 'mode') return 'hostedChat';
					if (paramName === 'options') return {};
					if (paramName === 'availableInChat') return false;
					if (paramName === 'authentication') return 'basicAuth';
					return defaultValue;
				},
			);
			vi.mocked(validateAuth).mockRejectedValueOnce(new ChatTriggerAuthorizationError(401));

			const result = await chatTrigger.webhook(mockContext);

			expect(validateAuth).toHaveBeenCalledWith(mockContext);
			expect(mockResponse.writeHead).toHaveBeenCalledWith(401, {
				'www-authenticate': 'Basic realm="Webhook abc123"',
			});
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('falls back to the plain realm when the node has no webhookId', async () => {
			mockContext.getMode.mockReturnValue('webhook');
			mockContext.getNode.mockReturnValue({
				name: 'Chat Trigger',
				type: 'n8n-nodes-langchain.chatTrigger',
				typeVersion: 1,
			} as INode);
			mockContext.getNodeParameter.mockImplementation(
				(
					paramName: string,
					defaultValue?: boolean | string | object,
				): boolean | string | object | undefined => {
					if (paramName === 'public') return true;
					if (paramName === 'mode') return 'hostedChat';
					if (paramName === 'options') return {};
					if (paramName === 'availableInChat') return false;
					if (paramName === 'authentication') return 'basicAuth';
					return defaultValue;
				},
			);
			vi.mocked(validateAuth).mockRejectedValueOnce(new ChatTriggerAuthorizationError(401));

			const result = await chatTrigger.webhook(mockContext);

			expect(validateAuth).toHaveBeenCalledWith(mockContext);
			expect(mockResponse.writeHead).toHaveBeenCalledWith(401, {
				'www-authenticate': 'Basic realm="Webhook"',
			});
			expect(result).toEqual({ noWebhookResponse: true });
		});
	});

	describe('hosted chat shell', () => {
		const visitor = {
			id: 'user-1',
			email: 'visitor@example.com',
			firstName: 'Vi',
			lastName: 'Sitor',
		};

		const renderSetupPage = async (authentication = 'n8nUserAuth') => {
			mockContext.getNodeParameter.mockImplementation(
				(
					paramName: string,
					defaultValue?: boolean | string | object,
				): boolean | string | object | undefined => {
					if (paramName === 'public') return true;
					if (paramName === 'mode') return 'hostedChat';
					if (paramName === 'options') return {};
					if (paramName === 'availableInChat') return false;
					if (paramName === 'authentication') return authentication;
					if (paramName === 'initialMessages') return '';
					return defaultValue;
				},
			);
			return await chatTrigger.webhook(mockContext);
		};

		const renderedPage = () => vi.mocked(mockResponse.send).mock.calls.at(-1)?.[0] as string;

		beforeEach(() => {
			// `generateChatUserAuthToken` needs the instance's hmac secret; everything
			// else in the node still wants the chat config.
			vi.mocked(Container.get).mockImplementation(((token: unknown) =>
				token === ChatTriggerConfig
					? chatTriggerConfig
					: { hmacSignatureSecret: 'test-secret' }) as never);

			mockContext.getWebhookName.mockReturnValue('setup');
			mockContext.getNodeWebhookUrl.mockReturnValue('http://localhost:5678/webhook/abc/chat');
			mockContext.getInstanceId.mockReturnValue('instance-1');
			mockContext.validateCookieAuth.mockResolvedValue(visitor);
			mockContext.getNode.mockReturnValue({
				id: 'node-1',
				name: 'Chat Trigger',
				type: '@n8n/n8n-nodes-langchain.chatTrigger',
				typeVersion: 1.4,
				webhookId: 'webhook-1',
			} as never);

			mockRequest.headers = {
				'x-forwarded-proto': 'http',
				host: 'localhost:5678',
				cookie: 'n8n-auth=session-token',
			};
			mockRequest.query = {};
			mockRequest.originalUrl = '/webhook/abc/chat';

			vi.stubEnv('N8N_ENV_FEAT_CHAT_TRIGGER_OAUTH2', 'true');
		});

		afterEach(() => {
			vi.unstubAllEnvs();
		});

		it('renders the shell with the author chat in a sandboxed frame', async () => {
			const result = await renderSetupPage();

			expect(result).toEqual({ noWebhookResponse: true });
			expect(mockResponse.setHeader).toHaveBeenCalledWith(
				'Content-Security-Policy',
				"frame-ancestors 'none'",
			);
			expect(renderedPage()).toContain('data-src="/webhook/abc/chat?n8nShellInner=1"');
			expect(renderedPage()).toContain(
				'sandbox="allow-scripts allow-forms allow-modals allow-popups"',
			);
			// No author-supplied CSS or markup on the trusted document.
			expect(renderedPage()).not.toContain('createChat');
		});

		it('renders the author chat for the frame own request', async () => {
			mockRequest.query = { n8nShellInner: '1' };
			mockRequest.headers = {
				'x-forwarded-proto': 'http',
				host: 'localhost:5678',
				cookie: 'n8n-auth=session-token',
				'sec-fetch-dest': 'iframe',
			};

			await renderSetupPage();

			expect(mockResponse.setHeader).toHaveBeenCalledWith(
				'Content-Security-Policy',
				'sandbox allow-scripts allow-forms allow-modals allow-popups',
			);
			expect(renderedPage()).toContain('createChat');
			// Identity injected server-side, and a header token for the messages that follow.
			expect(renderedPage()).toContain('"email":"visitor@example.com"');
			expect(renderedPage()).toContain("'x-auth-token'");
		});

		// Honouring the flag on a top-level navigation would let a visitor skip the
		// trusted document, and with it the connect UI that lives there.
		it('still renders the shell for a hand-typed inner URL', async () => {
			mockRequest.query = { n8nShellInner: '1' };
			mockRequest.headers = {
				'x-forwarded-proto': 'http',
				host: 'localhost:5678',
				cookie: 'n8n-auth=session-token',
				'sec-fetch-dest': 'document',
			};

			await renderSetupPage();

			expect(renderedPage()).toContain('data-src=');
			expect(renderedPage()).not.toContain('createChat');
		});

		it('sends an unauthenticated visitor to sign in', async () => {
			mockRequest.headers = { 'x-forwarded-proto': 'http', host: 'localhost:5678' };
			mockContext.validateCookieAuth.mockRejectedValue(new Error('nope'));

			const result = await renderSetupPage();

			expect(result).toEqual({ noWebhookResponse: true });
			expect(mockResponse.writeHead).toHaveBeenCalledWith(302, {
				Location: '/signin?redirect=http%3A%2F%2Flocalhost%3A5678%2Fwebhook%2Fabc%2Fchat',
			});
			expect(mockResponse.send).not.toHaveBeenCalled();
		});

		it('renders the page unsplit when the flag is off', async () => {
			vi.stubEnv('N8N_ENV_FEAT_CHAT_TRIGGER_OAUTH2', 'false');

			await renderSetupPage();

			expect(mockResponse.setHeader).not.toHaveBeenCalled();
			expect(renderedPage()).toContain('createChat');
			expect(renderedPage()).not.toContain('n8nShellInner');
		});

		it.each(['none', 'basicAuth'])(
			'renders the page unsplit for authentication %s',
			async (authentication) => {
				await renderSetupPage(authentication);

				expect(mockResponse.setHeader).not.toHaveBeenCalled();
				expect(renderedPage()).toContain('createChat');
				expect(renderedPage()).not.toContain('n8nShellInner');
			},
		);

		// The builder opens the test URL from the canvas, so it must split exactly as
		// production does for the flow to be testable end to end.
		it('splits the page in test mode too', async () => {
			mockContext.getMode.mockReturnValue('manual');
			mockRequest.originalUrl = '/webhook-test/abc/chat';

			await renderSetupPage();

			expect(renderedPage()).toContain('data-src="/webhook-test/abc/chat?n8nShellInner=1"');
		});
	});
});
