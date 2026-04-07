import { createDomainAccessTracker } from '../../../domain-access';
import type { InstanceAiContext, FetchedPage, InstanceAiWebResearchService } from '../../../types';
import { createFetchUrlTool } from '../fetch-url.tool';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockWebResearchService(url = 'https://example.com'): InstanceAiWebResearchService {
	const mockPage: FetchedPage = {
		url,
		finalUrl: url,
		title: 'Test Page',
		content: '# Test Content',
		truncated: false,
		contentLength: 14,
	};

	return {
		fetchUrl: jest.fn().mockResolvedValue(mockPage),
	};
}

function createMockContext(
	webResearchService?: InstanceAiWebResearchService,
	overrides?: Partial<InstanceAiContext>,
): InstanceAiContext {
	return {
		userId: 'test-user',
		workflowService: {} as InstanceAiContext['workflowService'],
		executionService: {} as InstanceAiContext['executionService'],
		credentialService: {} as InstanceAiContext['credentialService'],
		nodeService: {} as InstanceAiContext['nodeService'],
		dataTableService: {} as InstanceAiContext['dataTableService'],
		webResearchService,
		...overrides,
	};
}

function createMockCtx(overrides?: {
	resumeData?: Record<string, unknown>;
	suspend?: jest.Mock;
}) {
	return {
		agent: {
			resumeData: overrides?.resumeData,
			suspend: overrides?.suspend ?? jest.fn(),
		},
	} as never;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('fetch-url tool', () => {
	describe('schema validation', () => {
		it('accepts a valid URL', () => {
			const tool = createFetchUrlTool(createMockContext());
			const result = tool.inputSchema!.safeParse({ url: 'https://example.com' });
			expect(result.success).toBe(true);
		});

		it('rejects an invalid URL', () => {
			const tool = createFetchUrlTool(createMockContext());
			const result = tool.inputSchema!.safeParse({ url: 'not-a-url' });
			expect(result.success).toBe(false);
		});

		it('accepts optional maxContentLength', () => {
			const tool = createFetchUrlTool(createMockContext());
			const result = tool.inputSchema!.safeParse({
				url: 'https://example.com',
				maxContentLength: 5000,
			});
			expect(result.success).toBe(true);
		});

		it('rejects maxContentLength over 100000', () => {
			const tool = createFetchUrlTool(createMockContext());
			const result = tool.inputSchema!.safeParse({
				url: 'https://example.com',
				maxContentLength: 200_000,
			});
			expect(result.success).toBe(false);
		});
	});

	describe('execute', () => {
		it('delegates to webResearchService.fetchUrl', async () => {
			const service = createMockWebResearchService('https://example.com/docs');
			// Use always_allow so gating doesn't interfere with the basic delegation test
			const context = createMockContext(service, {
				permissions: { fetchUrl: 'always_allow' } as InstanceAiContext['permissions'],
			});
			const tool = createFetchUrlTool(context);

			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const result = await tool.execute!(
				{
					url: 'https://example.com/docs',
					maxContentLength: 10_000,
				},
				createMockCtx(),
			);

			expect(service.fetchUrl).toHaveBeenCalledWith('https://example.com/docs', {
				maxContentLength: 10_000,
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				authorizeUrl: expect.any(Function),
			});
			expect(result).toMatchObject({
				title: 'Test Page',
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				content: expect.stringContaining('# Test Content'),
				truncated: false,
			});
		});

		it('returns graceful error when webResearchService is not configured', async () => {
			const context = createMockContext(undefined);
			const tool = createFetchUrlTool(context);

			const result = await tool.execute!(
				{
					url: 'https://example.com',
				},
				{} as never,
			);

			expect(result).toMatchObject({
				url: 'https://example.com',
				content: 'Web research is not available in this environment.',
				truncated: false,
			});
		});
	});

	describe('domain gating (HITL)', () => {
		it('trusted host fetches immediately without suspension', async () => {
			const tracker = createDomainAccessTracker();
			const service = createMockWebResearchService('https://docs.n8n.io/api/');
			const suspend = jest.fn();
			const context = createMockContext(service, {
				domainAccessTracker: tracker,
				permissions: { fetchUrl: 'require_approval' } as InstanceAiContext['permissions'],
				runId: 'run-1',
			});
			const tool = createFetchUrlTool(context);

			await tool.execute!({ url: 'https://docs.n8n.io/api/' }, createMockCtx({ suspend }));

			expect(suspend).not.toHaveBeenCalled();
			expect(service.fetchUrl).toHaveBeenCalled();
		});

		it('untrusted host suspends for approval', async () => {
			const tracker = createDomainAccessTracker();
			const suspend = jest.fn();
			const service = createMockWebResearchService();
			const context = createMockContext(service, {
				domainAccessTracker: tracker,
				permissions: { fetchUrl: 'require_approval' } as InstanceAiContext['permissions'],
				runId: 'run-1',
			});
			const tool = createFetchUrlTool(context);

			await tool.execute!({ url: 'https://evil-site.com/secrets' }, createMockCtx({ suspend }));

			expect(suspend).toHaveBeenCalledTimes(1);
			const suspendPayload = (suspend.mock.calls as unknown[][])[0][0] as Record<string, unknown>;
			expect(suspendPayload).toEqual(
				expect.objectContaining({
					severity: 'info',
					domainAccess: {
						url: 'https://evil-site.com/secrets',
						host: 'evil-site.com',
					},
				}),
			);
			expect(suspendPayload).toHaveProperty('requestId');
			expect(suspendPayload).toHaveProperty('message');
			expect(service.fetchUrl).not.toHaveBeenCalled();
		});

		it('always_allow permission skips gating', async () => {
			const service = createMockWebResearchService();
			const suspend = jest.fn();
			const context = createMockContext(service, {
				domainAccessTracker: createDomainAccessTracker(),
				permissions: { fetchUrl: 'always_allow' } as InstanceAiContext['permissions'],
				runId: 'run-1',
			});
			const tool = createFetchUrlTool(context);

			await tool.execute!({ url: 'https://evil-site.com/page' }, createMockCtx({ suspend }));

			expect(suspend).not.toHaveBeenCalled();
			expect(service.fetchUrl).toHaveBeenCalled();
		});

		it('denied resume returns denial result', async () => {
			const tracker = createDomainAccessTracker();
			const service = createMockWebResearchService();
			const context = createMockContext(service, {
				domainAccessTracker: tracker,
				permissions: { fetchUrl: 'require_approval' } as InstanceAiContext['permissions'],
				runId: 'run-1',
			});
			const tool = createFetchUrlTool(context);

			const result = await tool.execute!(
				{ url: 'https://example.com/page' },
				createMockCtx({ resumeData: { approved: false } }),
			);

			expect((result as { content: string }).content).toBe('User denied access to this URL.');
			expect(service.fetchUrl).not.toHaveBeenCalled();
		});

		it('allow_domain resume persists host approval', async () => {
			const tracker = createDomainAccessTracker();
			const service = createMockWebResearchService('https://example.com/page');
			const context = createMockContext(service, {
				domainAccessTracker: tracker,
				permissions: { fetchUrl: 'require_approval' } as InstanceAiContext['permissions'],
				runId: 'run-1',
			});
			const tool = createFetchUrlTool(context);

			await tool.execute!(
				{ url: 'https://example.com/page' },
				createMockCtx({
					resumeData: { approved: true, domainAccessAction: 'allow_domain' },
				}),
			);

			expect(service.fetchUrl).toHaveBeenCalled();
			// Should now be allowed on subsequent calls
			expect(tracker.isHostAllowed('example.com')).toBe(true);
		});

		it('allow_once resume sets transient approval for current run only', async () => {
			const tracker = createDomainAccessTracker();
			const service = createMockWebResearchService('https://example.com/page');
			const context = createMockContext(service, {
				domainAccessTracker: tracker,
				permissions: { fetchUrl: 'require_approval' } as InstanceAiContext['permissions'],
				runId: 'run-1',
			});
			const tool = createFetchUrlTool(context);

			await tool.execute!(
				{ url: 'https://example.com/page' },
				createMockCtx({
					resumeData: { approved: true, domainAccessAction: 'allow_once' },
				}),
			);

			expect(service.fetchUrl).toHaveBeenCalled();
			expect(tracker.isHostAllowed('example.com', 'run-1')).toBe(true);
			expect(tracker.isHostAllowed('example.com', 'run-2')).toBe(false);
		});

		it('authorizeUrl callback throws for unapproved cross-host redirect (regression)', async () => {
			// Regression: the adapter cache must NOT swallow authorizeUrl errors.
			// If a cached page redirected to an unapproved host, the error must
			// propagate so the tool can suspend for HITL approval.
			const tracker = createDomainAccessTracker();
			// Approve docs.n8n.io so the initial gating check passes
			tracker.approveDomain('docs.n8n.io');

			let capturedAuthorizeUrl: ((url: string) => Promise<void>) | undefined;
			const service: InstanceAiWebResearchService = {
				fetchUrl: jest.fn().mockImplementation(
					// eslint-disable-next-line @typescript-eslint/require-await
					async (_url: string, opts?: { authorizeUrl?: (url: string) => Promise<void> }) => {
						capturedAuthorizeUrl = opts?.authorizeUrl;
						return {
							url: 'https://docs.n8n.io/page',
							finalUrl: 'https://docs.n8n.io/page',
							title: 'Test',
							content: 'content',
							truncated: false,
							contentLength: 7,
						};
					},
				),
			};
			const context = createMockContext(service, {
				domainAccessTracker: tracker,
				permissions: { fetchUrl: 'require_approval' } as InstanceAiContext['permissions'],
				runId: 'run-1',
			});
			const tool = createFetchUrlTool(context);

			await tool.execute!({ url: 'https://docs.n8n.io/page' }, createMockCtx());

			// The tool should have passed an authorizeUrl callback to the service
			expect(capturedAuthorizeUrl).toBeDefined();

			// Calling authorizeUrl with an unapproved host must throw
			await expect(capturedAuthorizeUrl!('https://evil.com/payload')).rejects.toThrow(
				/evil\.com.*requires approval/,
			);

			// Calling authorizeUrl with an approved host must not throw
			await expect(capturedAuthorizeUrl!('https://docs.n8n.io/other')).resolves.toBeUndefined();
		});
	});
});
