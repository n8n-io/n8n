import { ChatTriggerConfig } from '@n8n/config/src';
import { Container } from '@n8n/di';
import type { Request, Response } from 'express';
import type {
	CredentialCheckResult,
	IDataObject,
	INode,
	INodeExecutionData,
	IUser,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ChatTrigger } from '../ChatTrigger.node';
import { ChatTriggerAuthorizationError } from '../error';
import {
	establishChatSessionIdentity,
	handleChatTokenRefresh,
	resolveInnerFrameIdentity,
	validateAuth,
} from '../GenericFunctions';
import type { LoadPreviousSessionChatOption } from '../types';

vi.mock('../GenericFunctions', () => ({
	validateAuth: vi.fn(),
	establishChatSessionIdentity: vi.fn(),
	handleChatTokenRefresh: vi.fn(),
	resolveInnerFrameIdentity: vi.fn(),
}));

const INBOUND_TRIGGER_AUTHENTICATION_BUILDER_HINT =
	"Default to 'none'. n8n exposes inbound trigger URLs publicly by design. Only select an authentication method when the user explicitly asks to authenticate inbound traffic.";

describe('ChatTrigger Node', () => {
	const mockContext = mock<IWebhookFunctions>();
	const mockRequest = mock<Request>();
	const mockResponse = mock<Response>();
	let chatTrigger: ChatTrigger;
	let chatTriggerConfig: ChatTriggerConfig;
	// Optional on `IWebhookFunctions`, so `mock<T>()` leaves it a plain function rather
	// than a mock. Keep a typed handle and assign it onto the context each run.
	const getTestWebhookUser = vi.fn<() => Promise<IUser | undefined>>();

	beforeEach(() => {
		vi.clearAllMocks();

		chatTriggerConfig = new ChatTriggerConfig();
		vi.mocked(Container.get).mockReturnValue(chatTriggerConfig as never);
		chatTrigger = new ChatTrigger();
		Container.set(ChatTriggerConfig, chatTriggerConfig);

		mockResponse.status.mockReturnValue(mockResponse);
		mockResponse.send.mockReturnValue(mockResponse);
		mockResponse.json.mockReturnValue(mockResponse);
		mockResponse.end.mockReturnValue(mockResponse);
		mockResponse.writeHead.mockReturnValue(mockResponse);
		mockResponse.flushHeaders.mockImplementation(() => mockResponse);

		// No identity established / dynamic credentials disabled by default - the gate
		// is a no-op unless a test opts in with a readiness result.
		mockContext.checkTriggerCredentialStatus.mockResolvedValue(undefined);
		mockContext.logger = {
			warn: vi.fn(),
			error: vi.fn(),
			debug: vi.fn(),
			info: vi.fn(),
		} as unknown as IWebhookFunctions['logger'];

		// Provide socket methods required by the streaming keepalive configuration
		mockRequest.socket = {
			...mockRequest.socket,
			setTimeout: vi.fn(),
			setNoDelay: vi.fn(),
			setKeepAlive: vi.fn(),
		} as unknown as Request['socket'];

		mockRequest.contentType = undefined;
		mockContext.customData = mock<IWebhookFunctions['customData']>();
		mockContext.getTestWebhookUser = getTestWebhookUser;

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
			// Pass through, so tests can assert on the item the node actually emits.
			returnJsonArray: vi.fn((data) => (Array.isArray(data) ? data : [data])),
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

	describe('requireExecuteAccess property', () => {
		it('exposes the toggle, off by default and scoped to n8nUserAuth hosted chat', () => {
			const requireExecuteParam = chatTrigger.description.properties.find(
				(property) => property.name === 'requireExecuteAccess',
			);

			expect(requireExecuteParam).toMatchObject({
				type: 'boolean',
				default: false,
				displayOptions: {
					show: { authentication: ['n8nUserAuth'], mode: ['hostedChat'], public: [true] },
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

		it('enforces auth for manual executions outside the canvas chat session route', async () => {
			mockContext.getMode.mockReturnValue('manual');
			mockContext.isChatSessionTest.mockReturnValue(false);
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

	describe('message-send credential readiness gate', () => {
		const notReady: CredentialCheckResult = {
			readyToExecute: false,
			credentials: [
				{
					credentialId: 'cred-missing',
					credentialName: 'My Gmail',
					credentialType: 'gmailOAuth2',
					resolverId: 'resolver-1',
					status: 'missing',
					authorizationUrl: 'https://example.com/authorize',
					revokeUrl: 'https://example.com/revoke',
				},
			],
		};

		it('rejects the message and creates no execution when a required credential is missing', async () => {
			mockContext.checkTriggerCredentialStatus.mockResolvedValue(notReady);

			const result = await chatTrigger.webhook(mockContext);

			expect(mockResponse.status).toHaveBeenCalledWith(428);
			expect(mockResponse.json).toHaveBeenCalledWith({
				status: 'credential_connections_required',
				readyToExecute: false,
				credentials: [
					{
						credentialId: 'cred-missing',
						credentialName: 'My Gmail',
						credentialType: 'gmailOAuth2',
						credentialStatus: 'missing',
					},
				],
			});
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('enqueues the execution when the check reports ready', async () => {
			mockContext.checkTriggerCredentialStatus.mockResolvedValue({
				readyToExecute: true,
				credentials: [],
			});

			const result = await chatTrigger.webhook(mockContext);

			expect(mockResponse.status).not.toHaveBeenCalledWith(428);
			expect(result).toMatchObject({
				webhookResponse: { status: 200 },
				workflowData: expect.any(Array),
			});
		});

		it('enqueues the execution when no check applies (no identity established)', async () => {
			mockContext.checkTriggerCredentialStatus.mockResolvedValue(undefined);

			const result = await chatTrigger.webhook(mockContext);

			expect(mockResponse.status).not.toHaveBeenCalled();
			expect(result).toMatchObject({
				webhookResponse: { status: 200 },
				workflowData: expect.any(Array),
			});
		});

		it('fails closed with 503 when the check throws', async () => {
			const error = new Error('could not decrypt credential context');
			mockContext.checkTriggerCredentialStatus.mockRejectedValue(error);

			const result = await chatTrigger.webhook(mockContext);

			expect(mockResponse.status).toHaveBeenCalledWith(503);
			expect(mockResponse.json).toHaveBeenCalledWith({
				status: 'credential_readiness_check_failed',
			});
			expect(mockContext.logger.error).toHaveBeenCalledWith(
				'Chat trigger credential readiness check failed',
			);
			expect(mockContext.logger.error).not.toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ error: expect.anything() }),
			);
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('excludes loadPreviousSession requests from the gate', async () => {
			mockContext.getBodyData.mockReturnValue({ action: 'loadPreviousSession' });
			mockContext.checkTriggerCredentialStatus.mockResolvedValue(notReady);

			const result = await chatTrigger.webhook(mockContext);

			expect(mockContext.checkTriggerCredentialStatus).not.toHaveBeenCalled();
			expect(mockResponse.status).not.toHaveBeenCalledWith(428);
			expect(result).toEqual({ webhookResponse: { data: [] } });
		});
	});

	describe('includeUserInOutput', () => {
		const authedUser = {
			id: 'user-1',
			email: 'user@example.com',
			firstName: 'Test',
			lastName: 'User',
		};

		/** The default parameter set for a public `n8nUserAuth` chat, with overrides. */
		const setParams = (overrides: Record<string, boolean | string | object> = {}) => {
			mockContext.getNodeParameter.mockImplementation(
				(
					paramName: string,
					defaultValue?: boolean | string | object,
				): boolean | string | object | undefined => {
					if (paramName in overrides) return overrides[paramName];
					if (paramName === 'public') return true;
					if (paramName === 'mode') return 'hostedChat';
					if (paramName === 'options') return {};
					if (paramName === 'availableInChat') return false;
					if (paramName === 'authentication') return 'n8nUserAuth';
					return defaultValue;
				},
			);
		};

		const emittedJson = (result: IWebhookResponseData) =>
			(result.workflowData as INodeExecutionData[][])[0][0].json;

		beforeEach(() => {
			vi.mocked(validateAuth).mockResolvedValue(authedUser);
		});

		it('exposes the toggle, on by default and scoped to n8nUserAuth public chats', () => {
			const includeUserParam = chatTrigger.description.properties.find(
				(property) => property.name === 'includeUserInOutput',
			);

			expect(includeUserParam).toMatchObject({
				type: 'boolean',
				default: true,
				displayOptions: {
					show: {
						authentication: ['n8nUserAuth'],
						public: [true],
						'@version': [{ _cnd: { gte: 1.5 } }],
					},
				},
			});
		});

		it('adds the authenticated user to a JSON message', async () => {
			setParams();

			const result = await chatTrigger.webhook(mockContext);

			expect(emittedJson(result)).toEqual({ message: 'Hello', user: authedUser });
		});

		it('adds the authenticated user to a streamed message', async () => {
			setParams({ availableInChat: true });

			const result = await chatTrigger.webhook(mockContext);

			expect(result).toMatchObject({ noWebhookResponse: true });
			expect(emittedJson(result)).toEqual({ message: 'Hello', user: authedUser });
		});

		it('adds the authenticated user to a multipart message', async () => {
			mockRequest.contentType = 'multipart/form-data';
			mockRequest.body = { data: { message: 'Hello' }, files: {} };
			setParams();

			const result = await chatTrigger.webhook(mockContext);

			expect(emittedJson(result)).toEqual({ message: 'Hello', user: authedUser });
		});

		// An array body has no `user` key to merge, and must survive as an array —
		// object rest/spread would rewrite it to `{ 0: …, 1: … }`.
		it('passes an array body through unchanged', async () => {
			const arrayBody = [{ a: 1 }, { b: 2 }];
			mockContext.getBodyData.mockReturnValue(arrayBody as unknown as IDataObject);
			setParams();

			const result = await chatTrigger.webhook(mockContext);
			const json = emittedJson(result);

			expect(Array.isArray(json)).toBe(true);
			expect(json).toEqual(arrayBody);
		});

		// A `text/plain` request body reaches the node as a string. Object rest would shred
		// it into `{ 0: 'H', 1: 'e', … }`, so it must pass through untouched.
		it('passes a string body through unchanged', async () => {
			mockContext.getBodyData.mockReturnValue('Hello' as unknown as IDataObject);
			setParams();

			const result = await chatTrigger.webhook(mockContext);

			expect(emittedJson(result)).toBe('Hello');
		});

		it('omits the user when the toggle is off', async () => {
			setParams({ includeUserInOutput: false });

			const result = await chatTrigger.webhook(mockContext);

			expect(emittedJson(result)).toEqual({ message: 'Hello' });
		});

		it('omits the user for basicAuth, which identifies nobody', async () => {
			setParams({ authentication: 'basicAuth' });
			vi.mocked(validateAuth).mockResolvedValue(undefined);

			const result = await chatTrigger.webhook(mockContext);

			expect(emittedJson(result)).toEqual({ message: 'Hello' });
		});

		it('omits the user for unauthenticated chats', async () => {
			setParams({ authentication: 'none' });
			vi.mocked(validateAuth).mockResolvedValue(undefined);

			const result = await chatTrigger.webhook(mockContext);

			expect(emittedJson(result)).toEqual({ message: 'Hello' });
		});
	});

	// The editor's canvas chat can't supply webhook credentials, so its session-scoped
	// route skips auth. The editor user who started the run is known instead, so test
	// output keeps the same shape as production.
	describe('canvas test route', () => {
		const editorUser = {
			id: 'editor-1',
			email: 'editor@example.com',
			firstName: 'Ed',
			lastName: 'Itor',
		};

		const setParams = (authentication = 'n8nUserAuth') => {
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
					return defaultValue;
				},
			);
		};

		const emittedJson = (result: IWebhookResponseData) =>
			(result.workflowData as INodeExecutionData[][])[0][0].json;

		beforeEach(() => {
			mockContext.getMode.mockReturnValue('manual');
			mockContext.isChatSessionTest.mockReturnValue(true);
			getTestWebhookUser.mockResolvedValue(editorUser);
		});

		it('reports the editor user without running webhook auth', async () => {
			setParams();

			const result = await chatTrigger.webhook(mockContext);

			expect(validateAuth).not.toHaveBeenCalled();
			expect(emittedJson(result)).toEqual({ message: 'Hello', user: editorUser });
		});

		it('does not consult the editor user when auth is none', async () => {
			setParams('none');

			const result = await chatTrigger.webhook(mockContext);

			expect(getTestWebhookUser).not.toHaveBeenCalled();
			expect(emittedJson(result)).toEqual({ message: 'Hello' });
		});

		it('does not consult the editor user when auth is basicAuth', async () => {
			setParams('basicAuth');

			const result = await chatTrigger.webhook(mockContext);

			expect(getTestWebhookUser).not.toHaveBeenCalled();
			expect(emittedJson(result)).toEqual({ message: 'Hello' });
		});

		it('emits no user, and does not throw, when the editor user cannot be resolved', async () => {
			setParams();
			getTestWebhookUser.mockResolvedValue(undefined);

			const result = await chatTrigger.webhook(mockContext);

			expect(emittedJson(result)).toEqual({ message: 'Hello' });
		});
	});

	// `json` starts life as the caller's own request body, so a caller can put a `user`
	// key in it. Under `n8nUserAuth` that key is the server's, so a claimed one must never
	// survive into the output and look authoritative. Under the other auth modes there is
	// no server identity to shadow, so the body is left exactly as it arrived.
	describe('user spoofing', () => {
		const authedUser = {
			id: 'user-1',
			email: 'user@example.com',
			firstName: 'Test',
			lastName: 'User',
		};
		const forgedUser = { email: 'ceo@acme.com' };

		const setParams = (overrides: Record<string, boolean | string | object> = {}) => {
			mockContext.getNodeParameter.mockImplementation(
				(
					paramName: string,
					defaultValue?: boolean | string | object,
				): boolean | string | object | undefined => {
					if (paramName in overrides) return overrides[paramName];
					if (paramName === 'public') return true;
					if (paramName === 'mode') return 'hostedChat';
					if (paramName === 'options') return {};
					if (paramName === 'availableInChat') return false;
					if (paramName === 'authentication') return 'n8nUserAuth';
					return defaultValue;
				},
			);
		};

		const emittedJson = (result: IWebhookResponseData) =>
			(result.workflowData as INodeExecutionData[][])[0][0].json;

		beforeEach(() => {
			mockContext.getBodyData.mockReturnValue({ chatInput: 'hi', user: forgedUser });
			vi.mocked(validateAuth).mockResolvedValue(authedUser);
		});

		it('overwrites a caller-supplied user with the authenticated one', async () => {
			setParams();

			const result = await chatTrigger.webhook(mockContext);

			expect(emittedJson(result)).toEqual({ chatInput: 'hi', user: authedUser });
		});

		it('leaves a caller-supplied user alone when the chat is unauthenticated', async () => {
			setParams({ authentication: 'none' });
			vi.mocked(validateAuth).mockResolvedValue(undefined);

			const result = await chatTrigger.webhook(mockContext);

			expect(emittedJson(result)).toEqual({ chatInput: 'hi', user: forgedUser });
		});

		it('leaves a caller-supplied user alone under basicAuth', async () => {
			setParams({ authentication: 'basicAuth' });
			vi.mocked(validateAuth).mockResolvedValue(undefined);

			const result = await chatTrigger.webhook(mockContext);

			expect(emittedJson(result)).toEqual({ chatInput: 'hi', user: forgedUser });
		});

		it('strips a caller-supplied user when the toggle is off', async () => {
			setParams({ includeUserInOutput: false });

			const result = await chatTrigger.webhook(mockContext);

			expect(emittedJson(result)).toEqual({ chatInput: 'hi' });
		});

		it('strips a caller-supplied user on the canvas test route with no resolvable user', async () => {
			setParams();
			mockContext.getMode.mockReturnValue('manual');
			mockContext.isChatSessionTest.mockReturnValue(true);
			getTestWebhookUser.mockResolvedValue(undefined);

			const result = await chatTrigger.webhook(mockContext);

			expect(emittedJson(result)).toEqual({ chatInput: 'hi' });
		});

		it('strips a caller-supplied user from multipart form data', async () => {
			mockRequest.contentType = 'multipart/form-data';
			mockRequest.body = { data: { chatInput: 'hi', user: forgedUser }, files: {} };
			setParams();

			const result = await chatTrigger.webhook(mockContext);

			expect(emittedJson(result)).toEqual({ chatInput: 'hi', user: authedUser });
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

		const renderedView = () =>
			(vi.mocked(mockResponse.render).mock.calls.at(-1)?.[1] ?? {}) as Record<string, unknown>;
		const renderedTemplate = () => vi.mocked(mockResponse.render).mock.calls.at(-1)?.[0];

		// Every body and header this request produced, so a `/signin` anywhere in the
		// response — a redirect Location as much as a rendered page — shows up.
		const everySentResponse = () =>
			JSON.stringify([
				vi.mocked(mockResponse.send).mock.calls,
				vi.mocked(mockResponse.writeHead).mock.calls,
				vi.mocked(mockResponse.setHeader).mock.calls,
			]);

		beforeEach(() => {
			mockContext.getWebhookName.mockReturnValue('setup');
			mockContext.getNodeWebhookUrl.mockReturnValue('http://localhost:5678/webhook/abc/chat');
			mockContext.getWebhookResourceUrl.mockReturnValue('http://localhost:5678/webhook/abc/chat');
			mockContext.getInstanceId.mockReturnValue('instance-1');
			mockContext.getNode.mockReturnValue({
				id: 'node-1',
				name: 'Chat Trigger',
				type: '@n8n/n8n-nodes-langchain.chatTrigger',
				typeVersion: 1.4,
				webhookId: 'webhook-1',
			} as never);
			vi.mocked(establishChatSessionIdentity).mockResolvedValue({
				visitor,
				authToken: 'outer-token',
				expiresIn: 3600,
			});
			vi.mocked(resolveInnerFrameIdentity).mockResolvedValue({
				visitor,
				authToken: 'as-token',
			});

			mockRequest.headers = {
				'x-forwarded-proto': 'http',
				host: 'localhost:5678',
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
			expect(renderedTemplate()).toBe('chat-shell');
			expect(renderedView()).toMatchObject({
				iframeSrc: '/webhook/abc/chat?n8nShellInner=1',
				sandbox: 'allow-scripts allow-forms allow-modals allow-popups',
			});
			// The frame must have no origin of its own.
			expect(renderedView().sandbox).not.toContain('allow-same-origin');
			expect(renderedView().sandbox).not.toContain('allow-popups-to-escape-sandbox');
		});

		it('renders the author chat for the frame own request', async () => {
			mockRequest.query = { n8nShellInner: '1' };
			mockRequest.headers = {
				'x-forwarded-proto': 'http',
				host: 'localhost:5678',
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

		// The AS handshake must run on the outer, top-level document (real cookies) and
		// never on the sandboxed frame's own request — a redirect to sign-in/consent from
		// inside that opaque-origin frame would render editor-ui inside it and crash.
		it('does not render the shell while the outer AS handshake is still in flight', async () => {
			vi.mocked(establishChatSessionIdentity).mockResolvedValue(null);

			const result = await renderSetupPage();

			expect(result).toEqual({ noWebhookResponse: true });
			expect(mockResponse.send).not.toHaveBeenCalled();
			expect(resolveInnerFrameIdentity).not.toHaveBeenCalled();
		});

		it("fails the frame's own request instead of starting a new OAuth flow when the one-hop cookie is missing", async () => {
			mockRequest.query = { n8nShellInner: '1' };
			mockRequest.headers = {
				'x-forwarded-proto': 'http',
				host: 'localhost:5678',
				'sec-fetch-dest': 'iframe',
			};
			vi.mocked(resolveInnerFrameIdentity).mockResolvedValue(null);

			const result = await renderSetupPage();

			expect(result).toEqual({ noWebhookResponse: true });
			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(establishChatSessionIdentity).not.toHaveBeenCalled();
		});

		// Honouring the flag on a top-level navigation would let a visitor skip the
		// trusted document, and with it the connect UI that lives there.
		it('still renders the shell for a hand-typed inner URL', async () => {
			mockRequest.query = { n8nShellInner: '1' };
			mockRequest.headers = {
				'x-forwarded-proto': 'http',
				host: 'localhost:5678',
				'sec-fetch-dest': 'document',
			};

			await renderSetupPage();

			expect(renderedTemplate()).toBe('chat-shell');
			expect(renderedView().iframeSrc).toBeTruthy();
		});

		// The page used to bounce a visitor with no editor session to `/signin` before the
		// AS ever saw them, which defeated the whole point of end-user credentials for
		// external visitors. The flow authenticates them instead.
		it('begins the OAuth2 flow for a visitor with no session', async () => {
			mockRequest.headers = { 'x-forwarded-proto': 'http', host: 'localhost:5678' };

			const result = await renderSetupPage();

			expect(result).toEqual({ noWebhookResponse: true });
			expect(establishChatSessionIdentity).toHaveBeenCalledWith(
				mockContext,
				'http://localhost:5678/webhook/abc/chat',
			);
			expect(mockContext.validateCookieAuth).not.toHaveBeenCalled();
			expect(everySentResponse()).not.toContain('/signin');
		});

		it('renders the page unsplit when the flag is off', async () => {
			vi.stubEnv('N8N_ENV_FEAT_CHAT_TRIGGER_OAUTH2', 'false');

			await renderSetupPage();

			expect(mockResponse.setHeader).not.toHaveBeenCalled();
			expect(establishChatSessionIdentity).not.toHaveBeenCalled();
			expect(renderedPage()).toContain('createChat');
			expect(renderedPage()).not.toContain('n8nShellInner');
			// The unsplit render is the page itself, not a shell around a frame.
			expect(mockResponse.render).not.toHaveBeenCalled();
			expect(renderedPage()).not.toContain('n8nChatRefresh');
		});

		it.each(['none', 'basicAuth'])(
			'renders the page unsplit for authentication %s',
			async (authentication) => {
				await renderSetupPage(authentication);

				expect(mockResponse.setHeader).not.toHaveBeenCalled();
				expect(establishChatSessionIdentity).not.toHaveBeenCalled();
				expect(renderedPage()).toContain('createChat');
				expect(renderedPage()).not.toContain('n8nShellInner');
				expect(mockResponse.render).not.toHaveBeenCalled();
				expect(renderedPage()).not.toContain('n8nChatRefresh');
			},
		);

		it('carries the refresh endpoint and schedule into the shell', async () => {
			await renderSetupPage();

			expect(renderedTemplate()).toBe('chat-shell');
			expect(renderedView()).toMatchObject({
				refreshUrl: '/webhook/abc/chat?n8nChatRefresh=1',
				// The session's duration, passed straight through — no timestamp of ours
				// for the page's clock to disagree with.
				refreshExpiresIn: 3600,
			});
		});

		// The leg answers with JSON, not a page, and authenticates from its own httpOnly
		// cookie — so it must be handled before either render branch decides anything.
		it('routes the refresh leg ahead of the shell render', async () => {
			mockRequest.query = { n8nChatRefresh: '1' };
			mockRequest.headers = {
				'x-forwarded-proto': 'http',
				host: 'localhost:5678',
				'x-n8n-chat-refresh': '1',
				'sec-fetch-site': 'same-origin',
			};

			const result = await renderSetupPage();

			expect(result).toEqual({ noWebhookResponse: true });
			expect(handleChatTokenRefresh).toHaveBeenCalledWith(
				mockContext,
				'http://localhost:5678/webhook/abc/chat',
			);
			expect(establishChatSessionIdentity).not.toHaveBeenCalled();
			expect(resolveInnerFrameIdentity).not.toHaveBeenCalled();
			expect(mockResponse.send).not.toHaveBeenCalled();
			expect(mockResponse.render).not.toHaveBeenCalled();
		});

		// Without the custom header the request is forgeable by shape alone, so it must
		// fall through to the ordinary shell render rather than reach the leg.
		it('does not route the refresh leg without the custom header', async () => {
			mockRequest.query = { n8nChatRefresh: '1' };

			await renderSetupPage();

			expect(handleChatTokenRefresh).not.toHaveBeenCalled();
			expect(establishChatSessionIdentity).toHaveBeenCalled();
		});

		// The builder opens the test URL from the canvas, so it must split exactly as
		// production does for the flow to be testable end to end.
		it('splits the page in test mode too', async () => {
			mockContext.getMode.mockReturnValue('manual');
			mockRequest.originalUrl = '/webhook-test/abc/chat';

			await renderSetupPage();

			expect(renderedView()).toMatchObject({
				iframeSrc: '/webhook-test/abc/chat?n8nShellInner=1',
			});
		});

		describe('connect status', () => {
			it('embeds no connect script or dialog when the workflow needs no end-user credentials', async () => {
				mockContext.checkTriggerCredentialStatus.mockResolvedValue({
					readyToExecute: true,
					credentials: [],
				});

				await renderSetupPage();

				expect(renderedView()).toMatchObject({ hasCredentials: false });
				expect(renderedView().credentials).toBeUndefined();
			});

			it('embeds no connect script or dialog when the credential check reports nothing (dynamic credentials off)', async () => {
				mockContext.checkTriggerCredentialStatus.mockResolvedValue(undefined);

				await renderSetupPage();

				expect(renderedView()).toMatchObject({ hasCredentials: false });
				expect(renderedView().credentials).toBeUndefined();
			});

			it('embeds the credential and visitor data for a single required credential, with no dialog', async () => {
				mockContext.checkTriggerCredentialStatus.mockResolvedValue({
					readyToExecute: false,
					credentials: [
						{
							credentialId: 'cred-1',
							credentialName: 'Slack account',
							credentialType: 'slackOAuth2Api',
							status: 'missing',
							authorizationUrl: 'https://n8n.example.com/credentials/cred-1/authorize',
						},
					],
				});

				await renderSetupPage();

				expect(renderedView()).toMatchObject({
					hasCredentials: true,
					ready: false,
					visitorEmail: 'visitor@example.com',
					barText: 'Connect Slack account to start this chat',
					// One required account connects straight from the bar, so the template
					// keeps the no-dialog shortcut — but still renders the dialog, since it
					// is the only place carrying Disconnect once that account is connected.
					useDialog: false,
					total: 1,
					connectedCount: 0,
				});
				expect(renderedView().credentials).toMatchObject([
					{
						id: 'cred-1',
						name: 'Slack account',
						connected: false,
						authorizationUrl: 'https://n8n.example.com/credentials/cred-1/authorize',
					},
				]);
			});

			// Matches the message-send path: a readiness check we cannot answer must not
			// render a chat that looks usable and then fails on the first send.
			it('fails closed with 503 when the readiness check throws on the shell GET', async () => {
				const error = new Error('could not decrypt credential context');
				mockContext.checkTriggerCredentialStatus.mockRejectedValue(error);

				const result = await renderSetupPage();

				expect(mockResponse.status).toHaveBeenCalledWith(503);
				expect(mockContext.logger.error).toHaveBeenCalledWith(
					'Chat trigger credential readiness check failed',
				);
				expect(mockContext.logger.error).not.toHaveBeenCalledWith(
					expect.anything(),
					expect.objectContaining({ error: expect.anything() }),
				);
				expect(result).toEqual({ noWebhookResponse: true });
				expect(mockResponse.render).not.toHaveBeenCalled();
			});

			it('renders the "Connect your accounts" dialog when two or more end-user credentials are required', async () => {
				mockContext.checkTriggerCredentialStatus.mockResolvedValue({
					readyToExecute: false,
					credentials: [
						{
							credentialId: 'cred-1',
							credentialName: 'Slack account',
							credentialType: 'slackOAuth2Api',
							status: 'missing',
							authorizationUrl: 'https://n8n.example.com/credentials/cred-1/authorize',
						},
						{
							credentialId: 'cred-2',
							credentialName: 'Google account',
							credentialType: 'googleOAuth2Api',
							status: 'missing',
							authorizationUrl: 'https://n8n.example.com/credentials/cred-2/authorize',
						},
					],
				});

				await renderSetupPage();

				expect(renderedView()).toMatchObject({
					hasCredentials: true,
					useDialog: true,
					total: 2,
					connectedCount: 0,
					footerText: '0 of 2 accounts connected',
					barText: '2 accounts needed to start this chat',
				});
			});

			it("never checks credential status for the frame's own request", async () => {
				mockRequest.query = { n8nShellInner: '1' };
				mockRequest.headers = {
					'x-forwarded-proto': 'http',
					host: 'localhost:5678',
					'sec-fetch-dest': 'iframe',
				};

				await renderSetupPage();

				expect(mockContext.checkTriggerCredentialStatus).not.toHaveBeenCalled();
			});
		});
	});
});
