import type { ToolMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { Command } from '@langchain/langgraph';

import { createWebFetchTool, WEB_FETCH_TOOL } from '@/tools/web-fetch.tool';

// Mock the LangGraph state access and interrupt
const mockGetCurrentTaskInput = jest.fn();
const mockInterrupt = jest.fn();

jest.mock('@langchain/langgraph', () => ({
	...jest.requireActual('@langchain/langgraph'),
	getCurrentTaskInput: (...args: unknown[]) => mockGetCurrentTaskInput(...args),
	interrupt: (...args: unknown[]) => mockInterrupt(...args),
}));

// Mock the web-fetch utilities
jest.mock('@/tools/utils/web-fetch.utils', () => ({
	normalizeHost: jest.fn((url: string) => new URL(url).hostname.toLowerCase()),
	isBlockedUrl: jest.fn(),
	fetchUrl: jest.fn(),
	extractReadableContent: jest.fn(),
}));

import {
	normalizeHost,
	isBlockedUrl,
	fetchUrl,
	extractReadableContent,
} from '@/tools/utils/web-fetch.utils';

const mockIsBlockedUrl = isBlockedUrl as jest.MockedFunction<typeof isBlockedUrl>;
const mockFetchUrl = fetchUrl as jest.MockedFunction<typeof fetchUrl>;
const mockExtractReadableContent = extractReadableContent as jest.MockedFunction<
	typeof extractReadableContent
>;
const mockNormalizeHost = normalizeHost as jest.MockedFunction<typeof normalizeHost>;

function getMessageContent(command: Command): string {
	const update = command.update as { messages: ToolMessage[] };
	return update.messages[0].content as string;
}

function getStateUpdates(command: Command): Record<string, unknown> {
	const update = command.update as Record<string, unknown>;
	const { messages: _, ...stateUpdates } = update;
	return stateUpdates;
}

describe('web_fetch tool', () => {
	const mockConfig: RunnableConfig = {
		callbacks: [],
		toolCall: { id: 'test-tool-call-id', name: 'web_fetch' },
	} as RunnableConfig;

	beforeEach(() => {
		jest.clearAllMocks();
		mockNormalizeHost.mockImplementation((url: string) => new URL(url).hostname.toLowerCase());
		mockGetCurrentTaskInput.mockReturnValue({
			approvedDomains: [],
			webFetchCount: 0,
		});
	});

	describe('createWebFetchTool', () => {
		it('should create a tool with correct name and metadata', () => {
			const result = createWebFetchTool();
			expect(result.toolName).toBe('web_fetch');
			expect(result.displayTitle).toBe('Fetching web content');
			expect(result.tool.name).toBe('web_fetch');
		});
	});

	describe('WEB_FETCH_TOOL constant', () => {
		it('should have correct values', () => {
			expect(WEB_FETCH_TOOL.toolName).toBe('web_fetch');
			expect(WEB_FETCH_TOOL.displayTitle).toBe('Fetching web content');
		});
	});

	describe('SSRF blocking', () => {
		it('should block URLs that fail SSRF check', async () => {
			mockIsBlockedUrl.mockResolvedValue(true);

			const { tool } = createWebFetchTool();
			const command = await tool.invoke({ url: 'http://localhost:3000' }, mockConfig);
			const content = getMessageContent(command);

			expect(content).toContain('private or internal address');
			expect(mockIsBlockedUrl).toHaveBeenCalledWith('http://localhost:3000');
		});
	});

	describe('per-turn budget', () => {
		it('should block when fetch budget is exceeded', async () => {
			mockIsBlockedUrl.mockResolvedValue(false);
			mockGetCurrentTaskInput.mockReturnValue({
				approvedDomains: ['example.com'],
				webFetchCount: 3,
			});

			const { tool } = createWebFetchTool();
			const command = await tool.invoke({ url: 'https://example.com/page' }, mockConfig);
			const content = getMessageContent(command);

			expect(content).toContain('Maximum of 3 web fetches per turn reached');
		});
	});

	describe('approval flow', () => {
		it('should trigger interrupt for unapproved domain', async () => {
			mockIsBlockedUrl.mockResolvedValue(false);
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

			mockExtractReadableContent.mockReturnValue({
				title: 'Test Page',
				content: 'Extracted content',
				truncated: false,
			});

			const { tool } = createWebFetchTool();
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
			mockIsBlockedUrl.mockResolvedValue(false);
			mockGetCurrentTaskInput.mockReturnValue({
				approvedDomains: ['example.com'],
				webFetchCount: 0,
			});

			mockFetchUrl.mockResolvedValue({
				status: 'success',
				body: '<html><body><p>Content</p></body></html>',
				finalUrl: 'https://example.com/docs',
				httpStatus: 200,
				contentType: 'text/html',
			});

			mockExtractReadableContent.mockReturnValue({
				title: 'Test Page',
				content: 'Extracted content',
				truncated: false,
			});

			const { tool } = createWebFetchTool();
			await tool.invoke({ url: 'https://example.com/docs' }, mockConfig);

			expect(mockInterrupt).not.toHaveBeenCalled();
		});

		it('should return deny message when user denies', async () => {
			mockIsBlockedUrl.mockResolvedValue(false);
			mockInterrupt.mockImplementation((payload: { requestId: string }) => ({
				requestId: payload.requestId,
				url: 'https://example.com/docs',
				action: 'deny',
			}));

			const { tool } = createWebFetchTool();
			const command = await tool.invoke({ url: 'https://example.com/docs' }, mockConfig);
			const content = getMessageContent(command);

			expect(content).toContain('denied');
			expect(content).toContain('example.com');
		});

		it('should add domain to approvedDomains on allow_domain', async () => {
			mockIsBlockedUrl.mockResolvedValue(false);
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

			mockExtractReadableContent.mockReturnValue({
				title: 'Test',
				content: 'Content',
				truncated: false,
			});

			const { tool } = createWebFetchTool();
			const command = await tool.invoke({ url: 'https://example.com/docs' }, mockConfig);
			const stateUpdates = getStateUpdates(command);

			expect(stateUpdates.approvedDomains).toEqual(['example.com']);
			expect(stateUpdates.webFetchCount).toBe(1);
		});

		it('should NOT add domain to approvedDomains on allow_once', async () => {
			mockIsBlockedUrl.mockResolvedValue(false);
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

			mockExtractReadableContent.mockReturnValue({
				title: 'Test',
				content: 'Content',
				truncated: false,
			});

			const { tool } = createWebFetchTool();
			const command = await tool.invoke({ url: 'https://example.com/docs' }, mockConfig);
			const stateUpdates = getStateUpdates(command);

			expect(stateUpdates.approvedDomains).toBeUndefined();
			expect(stateUpdates.webFetchCount).toBe(1);
		});

		it('should reject stale/mismatched resume payload (url mismatch)', async () => {
			mockIsBlockedUrl.mockResolvedValue(false);
			mockInterrupt.mockReturnValue({
				requestId: 'any-id',
				url: 'https://different-site.com/page',
				action: 'allow_once',
			});

			const { tool } = createWebFetchTool();
			const command = await tool.invoke({ url: 'https://example.com/docs' }, mockConfig);
			const content = getMessageContent(command);

			expect(content).toContain('did not match');
		});
	});

	describe('content fetching', () => {
		beforeEach(() => {
			mockIsBlockedUrl.mockResolvedValue(false);
			mockGetCurrentTaskInput.mockReturnValue({
				approvedDomains: ['example.com'],
				webFetchCount: 0,
			});
		});

		it('should handle PDF content type', async () => {
			mockFetchUrl.mockResolvedValue({
				status: 'unsupported',
				reason: 'pdf',
			});

			const { tool } = createWebFetchTool();
			const command = await tool.invoke({ url: 'https://example.com/doc.pdf' }, mockConfig);
			const content = getMessageContent(command);

			expect(content).toContain('not supported');
			expect(content).toContain('PDF');
		});

		it('should handle empty body', async () => {
			mockFetchUrl.mockResolvedValue({
				status: 'success',
				body: undefined,
				finalUrl: 'https://example.com/empty',
				httpStatus: 200,
				contentType: 'text/html',
			});

			const { tool } = createWebFetchTool();
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

			mockExtractReadableContent.mockReturnValue({
				title: 'Test Page',
				content: 'Extracted readable content',
				truncated: false,
			});

			const { tool } = createWebFetchTool();
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

			mockExtractReadableContent.mockReturnValue({
				title: 'Long Page',
				content: 'Truncated content',
				truncated: true,
				truncateReason: 'Content truncated to 30000 characters',
			});

			const { tool } = createWebFetchTool();
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

			mockExtractReadableContent.mockReturnValue({
				title: 'Page',
				content: 'Content',
				truncated: false,
			});

			const { tool } = createWebFetchTool();
			const command = await tool.invoke({ url: 'https://example.com/page' }, mockConfig);
			const stateUpdates = getStateUpdates(command);

			expect(stateUpdates.webFetchCount).toBe(1);
		});
	});

	describe('redirect handling', () => {
		beforeEach(() => {
			mockIsBlockedUrl.mockResolvedValue(false);
			mockGetCurrentTaskInput.mockReturnValue({
				approvedDomains: ['example.com'],
				webFetchCount: 0,
			});
		});

		it('should block redirect to private address', async () => {
			mockFetchUrl.mockResolvedValue({
				status: 'redirect_new_host',
				finalUrl: 'http://localhost:3000/internal',
			});

			// isBlockedUrl is called twice: first for the original URL (returns false),
			// then for the redirect URL (returns true)
			mockIsBlockedUrl
				.mockResolvedValueOnce(false) // original URL check
				.mockResolvedValueOnce(true); // redirect URL check

			const { tool } = createWebFetchTool();
			const command = await tool.invoke({ url: 'https://example.com/redirect' }, mockConfig);
			const content = getMessageContent(command);

			expect(content).toContain('private address');
		});

		it('should block redirect to unapproved domain', async () => {
			mockFetchUrl.mockResolvedValue({
				status: 'redirect_new_host',
				finalUrl: 'https://other-domain.com/page',
			});

			const { tool } = createWebFetchTool();
			const command = await tool.invoke({ url: 'https://example.com/redirect' }, mockConfig);
			const content = getMessageContent(command);

			expect(content).toContain('different domain');
			expect(content).toContain('other-domain.com');
		});
	});

	describe('error handling', () => {
		it('should reject invalid URL input', async () => {
			const { tool } = createWebFetchTool();
			await expect(tool.invoke({ url: 'not-a-url' }, mockConfig)).rejects.toThrow();
		});

		it('should propagate GraphInterrupt errors', async () => {
			mockIsBlockedUrl.mockResolvedValue(false);
			const graphInterruptError = new Error('GraphInterrupt');
			graphInterruptError.name = 'GraphInterrupt';
			mockInterrupt.mockImplementation(() => {
				throw graphInterruptError;
			});

			const { tool } = createWebFetchTool();
			await expect(tool.invoke({ url: 'https://example.com/page' }, mockConfig)).rejects.toThrow(
				'GraphInterrupt',
			);
		});
	});
});
