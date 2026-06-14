import type { ToolMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { Command } from '@langchain/langgraph';
import { createResultError, createResultOk } from 'n8n-workflow';
import type { MockedFunction } from 'vitest';

import type { SsrfGuard } from '@/tools/utils/ssrf-guard';
import type { WebFetchSecurityManager } from '@/tools/utils/web-fetch-security';
import { normalizeHost, fetchUrl, extractReadableContent } from '@/tools/utils/web-fetch.utils';
import { createWebFetchTool } from '@/tools/web-fetch.tool';

// Mock the LangGraph interrupt
const mockInterrupt = vi.fn();

vi.mock('@langchain/langgraph', async () => ({
	...(await vi.importActual<object>('@langchain/langgraph')),
	interrupt: (...args: unknown[]) => mockInterrupt(...args) as unknown,
}));

// Mock the web-fetch utilities
vi.mock('@/tools/utils/web-fetch.utils', () => ({
	normalizeHost: vi.fn((url: string) => new URL(url).hostname.toLowerCase()),
	fetchUrl: vi.fn(),
	extractReadableContent: vi.fn(),
	isUrlInUserMessages: vi.fn(),
}));

const mockFetchUrl = fetchUrl as MockedFunction<typeof fetchUrl>;
const mockExtractReadableContent = extractReadableContent as MockedFunction<
	typeof extractReadableContent
>;
const mockNormalizeHost = normalizeHost as MockedFunction<typeof normalizeHost>;

/** Build a mock SSRF guard whose IP checks pass by default; override per test. */
function makeSsrfGuard(overrides: Partial<SsrfGuard> = {}): SsrfGuard {
	return {
		validateUrl: vi.fn(async () => createResultOk(undefined)),
		validateRedirectSync: vi.fn(),
		createSecureLookup: vi.fn(() => (() => {}) as never),
		...overrides,
	};
}

function getMessageContent(command: Command): string {
	const update = command.update as { messages: ToolMessage[] };
	return update.messages[0].content as string;
}

function getStateUpdates(command: Command): Record<string, unknown> {
	const update = command.update as Record<string, unknown>;
	const { messages: _, ...stateUpdates } = update;
	return stateUpdates;
}

function createMockSecurityManager(
	overrides: Partial<WebFetchSecurityManager> = {},
): WebFetchSecurityManager {
	return {
		isHostAllowed: vi.fn().mockReturnValue(true),
		approveDomain: vi.fn(),
		approveAllDomains: vi.fn(),
		hasBudget: vi.fn().mockReturnValue(true),
		recordFetch: vi.fn(),
		getStateUpdates: vi.fn().mockReturnValue({ webFetchCount: 1 }),
		...overrides,
	};
}

describe('web_fetch tool', () => {
	const mockConfig: RunnableConfig = {
		callbacks: [],
		toolCall: { id: 'test-tool-call-id', name: 'web_fetch' },
	} as RunnableConfig;

	let security: WebFetchSecurityManager;
	let ssrf: SsrfGuard;

	beforeEach(() => {
		vi.resetAllMocks();
		mockNormalizeHost.mockImplementation((url: string) => new URL(url).hostname.toLowerCase());
		security = createMockSecurityManager();
		ssrf = makeSsrfGuard();
	});

	describe('SSRF blocking', () => {
		it('should block URLs that fail SSRF check', async () => {
			ssrf = makeSsrfGuard({
				validateUrl: vi.fn(async () => createResultError(new Error('blocked'))),
			});

			const { tool } = createWebFetchTool(() => security, ssrf);
			const command = await tool.invoke({ url: 'http://localhost:3000' }, mockConfig);
			const content = getMessageContent(command);

			expect(content).toContain('private or internal address');
			expect(ssrf.validateUrl).toHaveBeenCalledWith('http://localhost:3000');
		});
	});

	describe('per-turn budget', () => {
		it('should block when fetch budget is exceeded', async () => {
			security = createMockSecurityManager({
				hasBudget: vi.fn().mockReturnValue(false),
			});

			const { tool } = createWebFetchTool(() => security, ssrf);
			const command = await tool.invoke({ url: 'https://example.com/page' }, mockConfig);
			const content = getMessageContent(command);

			expect(content).toContain('Maximum of 3 web fetches per turn reached');
		});
	});

	describe('approval flow', () => {
		beforeEach(() => {
			// Host not allowed (so approval is required)
			security = createMockSecurityManager({
				isHostAllowed: vi.fn().mockReturnValue(false),
				getStateUpdates: vi.fn().mockReturnValue({ webFetchCount: 1 }),
			});
		});

		it('should trigger interrupt for unapproved domain', async () => {
			// Make interrupt return an allow_once decision
			mockInterrupt.mockReturnValue({
				requestId: expect.any(String),
				url: 'https://example.com/docs',
				action: 'allow_once',
			});

			// We need to make interrupt return matching requestId
			let capturedRequestId: string;
			mockInterrupt.mockImplementation((payload: { requestId: string }) => {
				capturedRequestId = payload.requestId;
				return {
					requestId: capturedRequestId,
					url: 'https://example.com/docs',
					action: 'allow_once',
				};
			});

			mockFetchUrl.mockResolvedValue({
				status: 'success',
				body: '<html><body><p>Content</p></body></html>',
				finalUrl: 'https://example.com/docs',
				httpStatus: 200,
				contentType: 'text/html',
			});

			mockExtractReadableContent.mockResolvedValue({
				title: 'Test Page',
				content: 'Extracted content',
				truncated: false,
			});

			const { tool } = createWebFetchTool(() => security, ssrf);
			const command = await tool.invoke({ url: 'https://example.com/docs' }, mockConfig);

			expect(mockInterrupt).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'web_fetch_approval',
					url: 'https://example.com/docs',
					domain: 'example.com',
				}),
			);

			const content = getMessageContent(command);
			expect(content).toContain('web_fetch_result');
		});

		it('should skip interrupt for pre-approved domain', async () => {
			security = createMockSecurityManager({
				isHostAllowed: vi.fn().mockReturnValue(true),
			});

			mockFetchUrl.mockResolvedValue({
				status: 'success',
				body: '<html><body><p>Content</p></body></html>',
				finalUrl: 'https://example.com/docs',
				httpStatus: 200,
				contentType: 'text/html',
			});

			mockExtractReadableContent.mockResolvedValue({
				title: 'Test Page',
				content: 'Extracted content',
				truncated: false,
			});

			const { tool } = createWebFetchTool(() => security, ssrf);
			const command = await tool.invoke({ url: 'https://example.com/docs' }, mockConfig);

			expect(mockInterrupt).not.toHaveBeenCalled();

			const content = getMessageContent(command);
			expect(content).toContain('Test Page');
		});

		it('should return deny message when user denies', async () => {
			mockInterrupt.mockImplementation((payload: { requestId: string }) => ({
				requestId: payload.requestId,
				url: 'https://example.com/docs',
				action: 'deny',
			}));

			const { tool } = createWebFetchTool(() => security, ssrf);
			const command = await tool.invoke({ url: 'https://example.com/docs' }, mockConfig);
			const content = getMessageContent(command);

			expect(content).toContain('denied');
			expect(content).toContain('example.com');
		});

		it('should add domain to approvedDomains on allow_domain', async () => {
			security = createMockSecurityManager({
				isHostAllowed: vi.fn().mockReturnValue(false),
				getStateUpdates: vi.fn().mockReturnValue({
					webFetchCount: 1,
					approvedDomains: ['example.com'],
				}),
			});
			mockInterrupt.mockImplementation((payload: { requestId: string }) => ({
				requestId: payload.requestId,
				url: 'https://example.com/docs',
				action: 'allow_domain',
			}));

			mockFetchUrl.mockResolvedValue({
				status: 'success',
				body: '<html><body><p>Content</p></body></html>',
				finalUrl: 'https://example.com/docs',
				httpStatus: 200,
				contentType: 'text/html',
			});

			mockExtractReadableContent.mockResolvedValue({
				title: 'Test',
				content: 'Content',
				truncated: false,
			});

			const { tool } = createWebFetchTool(() => security, ssrf);
			const command = await tool.invoke({ url: 'https://example.com/docs' }, mockConfig);
			const stateUpdates = getStateUpdates(command);

			expect(stateUpdates.approvedDomains).toEqual(['example.com']);
			expect(stateUpdates.webFetchCount).toBe(1);
			expect(security.approveDomain).toHaveBeenCalledWith('example.com');
			expect(security.recordFetch).toHaveBeenCalled();
		});

		it('should NOT add domain to approvedDomains on allow_once', async () => {
			mockInterrupt.mockImplementation((payload: { requestId: string }) => ({
				requestId: payload.requestId,
				url: 'https://example.com/docs',
				action: 'allow_once',
			}));

			mockFetchUrl.mockResolvedValue({
				status: 'success',
				body: '<html><body><p>Content</p></body></html>',
				finalUrl: 'https://example.com/docs',
				httpStatus: 200,
				contentType: 'text/html',
			});

			mockExtractReadableContent.mockResolvedValue({
				title: 'Test',
				content: 'Content',
				truncated: false,
			});

			const { tool } = createWebFetchTool(() => security, ssrf);
			const command = await tool.invoke({ url: 'https://example.com/docs' }, mockConfig);
			const stateUpdates = getStateUpdates(command);

			expect(stateUpdates.approvedDomains).toBeUndefined();
			expect(stateUpdates.webFetchCount).toBe(1);
			expect(security.approveDomain).not.toHaveBeenCalled();
		});

		it('should reject stale/mismatched resume payload (url mismatch)', async () => {
			mockInterrupt.mockReturnValue({
				requestId: 'any-id',
				url: 'https://different-site.com/page',
				action: 'allow_once',
			});

			const { tool } = createWebFetchTool(() => security, ssrf);
			const command = await tool.invoke({ url: 'https://example.com/docs' }, mockConfig);
			const content = getMessageContent(command);

			expect(content).toContain('did not match');
		});
	});

	describe('content fetching', () => {
		beforeEach(() => {
			security = createMockSecurityManager({
				isHostAllowed: vi.fn().mockReturnValue(true),
			});
		});

		it('should handle PDF content type', async () => {
			mockFetchUrl.mockResolvedValue({
				status: 'unsupported',
				reason: 'pdf',
			});

			const { tool } = createWebFetchTool(() => security, ssrf);
			const command = await tool.invoke({ url: 'https://example.com/doc.pdf' }, mockConfig);
			const content = getMessageContent(command);

			expect(content).toContain('not supported');
			expect(content).toContain('pdf');
		});

		it('should handle empty body', async () => {
			mockFetchUrl.mockResolvedValue({
				status: 'success',
				body: undefined,
				finalUrl: 'https://example.com/empty',
				httpStatus: 200,
				contentType: 'text/html',
			});

			const { tool } = createWebFetchTool(() => security, ssrf);
			const command = await tool.invoke({ url: 'https://example.com/empty' }, mockConfig);
			const content = getMessageContent(command);

			expect(content).toContain('no content');
		});

		it('should return structured content on success', async () => {
			mockFetchUrl.mockResolvedValue({
				status: 'success',
				body: '<html><body><p>Content</p></body></html>',
				finalUrl: 'https://example.com/page',
				httpStatus: 200,
				contentType: 'text/html',
			});

			mockExtractReadableContent.mockResolvedValue({
				title: 'Test Page',
				content: 'Extracted readable content',
				truncated: false,
			});

			const { tool } = createWebFetchTool(() => security, ssrf);
			const command = await tool.invoke({ url: 'https://example.com/page' }, mockConfig);
			const content = getMessageContent(command);

			expect(content).toContain('<web_fetch_result>');
			expect(content).toContain('<url>https://example.com/page</url>');
			expect(content).toContain('<title>Test Page</title>');
			expect(content).toContain('Extracted readable content');
			expect(content).toContain('</web_fetch_result>');
		});

		it('should include truncation note when content is truncated', async () => {
			mockFetchUrl.mockResolvedValue({
				status: 'success',
				body: '<html><body><p>Long content</p></body></html>',
				finalUrl: 'https://example.com/long',
				httpStatus: 200,
				contentType: 'text/html',
			});

			mockExtractReadableContent.mockResolvedValue({
				title: 'Long Page',
				content: 'Truncated content',
				truncated: true,
				truncateReason: 'Content truncated to 30000 characters',
			});

			const { tool } = createWebFetchTool(() => security, ssrf);
			const command = await tool.invoke({ url: 'https://example.com/long' }, mockConfig);
			const content = getMessageContent(command);

			expect(content).toContain('<note>Content truncated to 30000 characters</note>');
		});

		it('should increment webFetchCount on success', async () => {
			mockFetchUrl.mockResolvedValue({
				status: 'success',
				body: '<html><body><p>Content</p></body></html>',
				finalUrl: 'https://example.com/page',
				httpStatus: 200,
				contentType: 'text/html',
			});

			mockExtractReadableContent.mockResolvedValue({
				title: 'Page',
				content: 'Content',
				truncated: false,
			});

			const { tool } = createWebFetchTool(() => security, ssrf);
			const command = await tool.invoke({ url: 'https://example.com/page' }, mockConfig);
			const stateUpdates = getStateUpdates(command);

			expect(stateUpdates.webFetchCount).toBe(1);
			expect(security.recordFetch).toHaveBeenCalled();
		});
	});

	describe('redirect handling', () => {
		beforeEach(() => {
			security = createMockSecurityManager({
				isHostAllowed: vi.fn().mockReturnValue(true),
			});
		});

		it('should block redirect to private address', async () => {
			security = createMockSecurityManager({
				isHostAllowed: vi.fn().mockReturnValue(true),
			});

			mockFetchUrl.mockResolvedValue({
				status: 'redirect_new_host',
				finalUrl: 'http://localhost:3000/internal',
			});

			// SSRF validation passes for the original URL but blocks the redirect target.
			ssrf = makeSsrfGuard({
				validateUrl: vi.fn(async (url: string | URL) =>
					String(url).includes('localhost')
						? createResultError(new Error('blocked'))
						: createResultOk(undefined),
				),
			});

			const { tool } = createWebFetchTool(() => security, ssrf);
			const command = await tool.invoke({ url: 'https://example.com/redirect' }, mockConfig);
			const content = getMessageContent(command);

			expect(content).toContain('private address');
		});

		it('should trigger interrupt for redirect to unapproved domain and succeed on approval', async () => {
			security = createMockSecurityManager({
				isHostAllowed: vi
					.fn()
					.mockReturnValueOnce(true) // original host
					.mockReturnValueOnce(false), // redirect host
			});

			mockFetchUrl
				.mockResolvedValueOnce({
					status: 'redirect_new_host',
					finalUrl: 'https://other-domain.com/page',
				})
				.mockResolvedValueOnce({
					status: 'success',
					body: '<html><body><p>Redirected content</p></body></html>',
					finalUrl: 'https://other-domain.com/page',
					httpStatus: 200,
					contentType: 'text/html',
				});

			mockInterrupt.mockReturnValue({
				requestId: 'any-id',
				url: 'https://other-domain.com/page',
				action: 'allow_once',
			});

			mockExtractReadableContent.mockResolvedValue({
				title: 'Redirected Page',
				content: 'Redirected content',
				truncated: false,
			});

			const { tool } = createWebFetchTool(() => security, ssrf);
			const command = await tool.invoke({ url: 'https://example.com/redirect' }, mockConfig);

			expect(mockInterrupt).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'web_fetch_approval',
					url: 'https://other-domain.com/page',
					domain: 'other-domain.com',
				}),
			);

			const content = getMessageContent(command);
			expect(content).toContain('web_fetch_result');
			expect(content).toContain('Redirected content');
		});

		it('should return deny message when user denies redirect domain', async () => {
			security = createMockSecurityManager({
				isHostAllowed: vi
					.fn()
					.mockReturnValueOnce(true) // original host
					.mockReturnValueOnce(false), // redirect host
			});

			mockFetchUrl.mockResolvedValueOnce({
				status: 'redirect_new_host',
				finalUrl: 'https://other-domain.com/page',
			});

			mockInterrupt.mockReturnValue({
				requestId: 'any-id',
				url: 'https://other-domain.com/page',
				action: 'deny',
			});

			const { tool } = createWebFetchTool(() => security, ssrf);
			const command = await tool.invoke({ url: 'https://example.com/redirect' }, mockConfig);
			const content = getMessageContent(command);

			expect(content).toContain('denied');
			expect(content).toContain('other-domain.com');
		});

		it('should add redirect host to approvedDomains on allow_domain', async () => {
			security = createMockSecurityManager({
				isHostAllowed: vi
					.fn()
					.mockReturnValueOnce(true) // original host
					.mockReturnValueOnce(false), // redirect host
				getStateUpdates: vi.fn().mockReturnValue({
					webFetchCount: 1,
					approvedDomains: ['other-domain.com'],
				}),
			});

			mockFetchUrl
				.mockResolvedValueOnce({
					status: 'redirect_new_host',
					finalUrl: 'https://other-domain.com/page',
				})
				.mockResolvedValueOnce({
					status: 'success',
					body: '<html><body><p>Content</p></body></html>',
					finalUrl: 'https://other-domain.com/page',
					httpStatus: 200,
					contentType: 'text/html',
				});

			mockInterrupt.mockReturnValue({
				requestId: 'any-id',
				url: 'https://other-domain.com/page',
				action: 'allow_domain',
			});

			mockExtractReadableContent.mockResolvedValue({
				title: 'Test',
				content: 'Content',
				truncated: false,
			});

			const { tool } = createWebFetchTool(() => security, ssrf);
			const command = await tool.invoke({ url: 'https://example.com/redirect' }, mockConfig);
			const stateUpdates = getStateUpdates(command);

			expect(stateUpdates.approvedDomains).toEqual(['other-domain.com']);
			expect(security.approveDomain).toHaveBeenCalledWith('other-domain.com');
		});

		it('should skip interrupt when redirect domain is in allowlist', async () => {
			security = createMockSecurityManager({
				isHostAllowed: vi.fn().mockReturnValue(true),
			});

			mockFetchUrl
				.mockResolvedValueOnce({
					status: 'redirect_new_host',
					finalUrl: 'https://docs.example.com/page',
				})
				.mockResolvedValueOnce({
					status: 'success',
					body: '<html><body><p>Content</p></body></html>',
					finalUrl: 'https://docs.example.com/page',
					httpStatus: 200,
					contentType: 'text/html',
				});

			mockExtractReadableContent.mockResolvedValue({
				title: 'Docs',
				content: 'Documentation content',
				truncated: false,
			});

			const { tool } = createWebFetchTool(() => security, ssrf);
			const command = await tool.invoke({ url: 'https://example.com/redirect' }, mockConfig);

			expect(mockInterrupt).not.toHaveBeenCalled();

			const content = getMessageContent(command);
			expect(content).toContain('web_fetch_result');
		});
	});

	describe('error handling', () => {
		it('should reject invalid URL input', async () => {
			const { tool } = createWebFetchTool(() => security, ssrf);
			await expect(tool.invoke({ url: 'not-a-url' }, mockConfig)).rejects.toThrow();
		});

		it('should propagate GraphInterrupt errors', async () => {
			security = createMockSecurityManager({
				isHostAllowed: vi.fn().mockReturnValue(false),
			});
			const graphInterruptError = new Error('GraphInterrupt');
			graphInterruptError.name = 'GraphInterrupt';
			mockInterrupt.mockImplementation(() => {
				throw graphInterruptError;
			});

			const { tool } = createWebFetchTool(() => security, ssrf);
			await expect(tool.invoke({ url: 'https://example.com/page' }, mockConfig)).rejects.toThrow(
				'GraphInterrupt',
			);
		});
	});

	describe('URL provenance and approval', () => {
		it('should allow URLs found in user messages without approval', async () => {
			security = createMockSecurityManager({
				isHostAllowed: vi.fn().mockReturnValue(true),
			});

			mockFetchUrl.mockResolvedValue({
				status: 'success',
				body: '<html><body><p>Content</p></body></html>',
				finalUrl: 'https://example.com/page',
				httpStatus: 200,
				contentType: 'text/html',
			});

			mockExtractReadableContent.mockResolvedValue({
				title: 'Test',
				content: 'Content',
				truncated: false,
			});

			const { tool } = createWebFetchTool(() => security, ssrf);
			const command = await tool.invoke({ url: 'https://example.com/page' }, mockConfig);
			const content = getMessageContent(command);

			expect(content).toContain('web_fetch_result');
			expect(mockInterrupt).not.toHaveBeenCalled();
		});

		it('should skip domain approval for user-sent URLs on non-allowlisted domains', async () => {
			// isHostAllowed returns true because isUrlInUserMessages is checked inside the manager
			security = createMockSecurityManager({
				isHostAllowed: vi.fn().mockReturnValue(true),
			});

			mockFetchUrl.mockResolvedValue({
				status: 'success',
				body: '<html><body><p>Content</p></body></html>',
				finalUrl: 'https://unknown-site.com/page',
				httpStatus: 200,
				contentType: 'text/html',
			});

			mockExtractReadableContent.mockResolvedValue({
				title: 'Test',
				content: 'Content',
				truncated: false,
			});

			const { tool } = createWebFetchTool(() => security, ssrf);
			const command = await tool.invoke({ url: 'https://unknown-site.com/page' }, mockConfig);
			const content = getMessageContent(command);

			// User explicitly sent this URL, so no approval needed
			expect(mockInterrupt).not.toHaveBeenCalled();
			expect(content).toContain('web_fetch_result');
		});

		it('should require approval for URLs not sent by user', async () => {
			security = createMockSecurityManager({
				isHostAllowed: vi.fn().mockReturnValue(false),
			});

			mockInterrupt.mockImplementation((payload: { requestId: string }) => ({
				requestId: payload.requestId,
				url: 'https://example.com/ai-found',
				action: 'allow_once',
			}));

			mockFetchUrl.mockResolvedValue({
				status: 'success',
				body: '<html><body><p>Content</p></body></html>',
				finalUrl: 'https://example.com/ai-found',
				httpStatus: 200,
				contentType: 'text/html',
			});

			mockExtractReadableContent.mockResolvedValue({
				title: 'Test',
				content: 'Content',
				truncated: false,
			});

			const { tool } = createWebFetchTool(() => security, ssrf);
			const command = await tool.invoke({ url: 'https://example.com/ai-found' }, mockConfig);
			const content = getMessageContent(command);

			expect(mockInterrupt).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'web_fetch_approval',
					url: 'https://example.com/ai-found',
					domain: 'example.com',
				}),
			);
			expect(content).toContain('web_fetch_result');
		});
	});

	describe('approval action validation', () => {
		beforeEach(() => {
			// Host not allowed (so approval is required)
			security = createMockSecurityManager({
				isHostAllowed: vi.fn().mockReturnValue(false),
			});
		});

		it('should reject invalid approval action values', async () => {
			mockInterrupt.mockImplementation((payload: { requestId: string }) => ({
				requestId: payload.requestId,
				url: 'https://example.com/page',
				action: 'invalid_action',
			}));

			const { tool } = createWebFetchTool(() => security, ssrf);
			const command = await tool.invoke({ url: 'https://example.com/page' }, mockConfig);
			const content = getMessageContent(command);

			expect(content).toContain('Invalid approval action');
		});

		it('should accept allow_once action', async () => {
			mockInterrupt.mockImplementation((payload: { requestId: string }) => ({
				requestId: payload.requestId,
				url: 'https://example.com/page',
				action: 'allow_once',
			}));

			mockFetchUrl.mockResolvedValue({
				status: 'success',
				body: '<html><body><p>Content</p></body></html>',
				finalUrl: 'https://example.com/page',
				httpStatus: 200,
				contentType: 'text/html',
			});

			mockExtractReadableContent.mockResolvedValue({
				title: 'Test',
				content: 'Content',
				truncated: false,
			});

			const { tool } = createWebFetchTool(() => security, ssrf);
			const command = await tool.invoke({ url: 'https://example.com/page' }, mockConfig);
			const content = getMessageContent(command);

			expect(content).toContain('web_fetch_result');
		});

		it('should accept allow_all action and set allDomainsApproved', async () => {
			security = createMockSecurityManager({
				isHostAllowed: vi.fn().mockReturnValue(false),
				getStateUpdates: vi.fn().mockReturnValue({
					webFetchCount: 1,
					approvedDomains: ['example.com'],
					allDomainsApproved: true,
				}),
			});
			mockInterrupt.mockImplementation((payload: { requestId: string }) => ({
				requestId: payload.requestId,
				url: 'https://example.com/page',
				action: 'allow_all',
			}));

			mockFetchUrl.mockResolvedValue({
				status: 'success',
				body: '<html><body><p>Content</p></body></html>',
				finalUrl: 'https://example.com/page',
				httpStatus: 200,
				contentType: 'text/html',
			});

			mockExtractReadableContent.mockResolvedValue({
				title: 'Test',
				content: 'Content',
				truncated: false,
			});

			const { tool } = createWebFetchTool(() => security, ssrf);
			const command = await tool.invoke({ url: 'https://example.com/page' }, mockConfig);
			const content = getMessageContent(command);
			const stateUpdates = getStateUpdates(command);

			expect(content).toContain('web_fetch_result');
			expect(stateUpdates.allDomainsApproved).toBe(true);
			expect(security.approveAllDomains).toHaveBeenCalled();
		});
	});

	describe('allDomainsApproved bypass', () => {
		it('should skip domain approval interrupt when allDomainsApproved is true', async () => {
			security = createMockSecurityManager({
				isHostAllowed: vi.fn().mockReturnValue(true),
			});

			mockFetchUrl.mockResolvedValue({
				status: 'success',
				body: '<html><body><p>Content</p></body></html>',
				finalUrl: 'https://example.com/page',
				httpStatus: 200,
				contentType: 'text/html',
			});

			mockExtractReadableContent.mockResolvedValue({
				title: 'Test',
				content: 'Content',
				truncated: false,
			});

			const { tool } = createWebFetchTool(() => security, ssrf);
			const command = await tool.invoke({ url: 'https://example.com/page' }, mockConfig);
			const content = getMessageContent(command);

			expect(mockInterrupt).not.toHaveBeenCalled();
			expect(content).toContain('web_fetch_result');
		});

		it('should skip redirect domain approval when allDomainsApproved is true', async () => {
			security = createMockSecurityManager({
				isHostAllowed: vi.fn().mockReturnValue(true),
			});

			mockFetchUrl
				.mockResolvedValueOnce({
					status: 'redirect_new_host',
					finalUrl: 'https://other-domain.com/page',
				})
				.mockResolvedValueOnce({
					status: 'success',
					body: '<html><body><p>Redirected</p></body></html>',
					finalUrl: 'https://other-domain.com/page',
					httpStatus: 200,
					contentType: 'text/html',
				});

			mockExtractReadableContent.mockResolvedValue({
				title: 'Test',
				content: 'Redirected content',
				truncated: false,
			});

			const { tool } = createWebFetchTool(() => security, ssrf);
			const command = await tool.invoke({ url: 'https://example.com/redirect' }, mockConfig);
			const content = getMessageContent(command);

			expect(mockInterrupt).not.toHaveBeenCalled();
			expect(content).toContain('web_fetch_result');
		});
	});
});
