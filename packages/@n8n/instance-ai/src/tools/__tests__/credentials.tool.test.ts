import type { InstanceAiPermissions } from '@n8n/api-types';

import type { InstanceAiContext, CredentialSummary, CredentialDetail } from '../../types';
import { createCredentialsTool } from '../credentials.tool';

// ── Helpers ──────────────────────────────────────────────────────────────────

function createMockContext(
	overrides: Partial<Omit<InstanceAiContext, 'permissions'>> & {
		permissions?: Partial<InstanceAiPermissions>;
	} = {},
): InstanceAiContext {
	return {
		userId: 'user-1',
		workflowService: {} as InstanceAiContext['workflowService'],
		executionService: {} as InstanceAiContext['executionService'],
		nodeService: {} as InstanceAiContext['nodeService'],
		dataTableService: {} as InstanceAiContext['dataTableService'],
		credentialService: {
			list: jest.fn().mockResolvedValue([]),
			get: jest.fn().mockResolvedValue({}),
			delete: jest.fn().mockResolvedValue(undefined),
			test: jest.fn().mockResolvedValue({ success: true }),
			searchCredentialTypes: jest.fn().mockResolvedValue([]),
			getDocumentationUrl: jest.fn().mockResolvedValue(null),
			getCredentialFields: jest.fn().mockResolvedValue([]),
		},
		permissions: {},
		...overrides,
	} as unknown as InstanceAiContext;
}

function noSuspendCtx() {
	return { agent: { resumeData: undefined, suspend: undefined } } as never;
}

function suspendCtx(suspendFn: jest.Mock = jest.fn()) {
	return { agent: { resumeData: undefined, suspend: suspendFn } } as never;
}

function resumeCtx(resumeData: {
	approved: boolean;
	credentials?: Record<string, string>;
	autoSetup?: { credentialType: string };
}) {
	return { agent: { resumeData, suspend: jest.fn() } } as never;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('credentials tool', () => {
	// ── list ────────────────────────────────────────────────────────────────

	describe('list action', () => {
		it('should call credentialService.list and return paginated results', async () => {
			const credentials: CredentialSummary[] = [
				{ id: '1', name: 'Slack Token', type: 'slackApi' },
				{ id: '2', name: 'GitHub Token', type: 'githubApi' },
				{ id: '3', name: 'Notion Key', type: 'notionApi' },
			];
			const context = createMockContext();
			(context.credentialService.list as jest.Mock).mockResolvedValue(credentials);

			const tool = createCredentialsTool(context);
			const result = await tool.execute!({ action: 'list' as const }, noSuspendCtx());

			expect(context.credentialService.list).toHaveBeenCalledWith({ type: undefined });
			expect(result).toEqual({
				credentials: [
					{ id: '1', name: 'Slack Token', type: 'slackApi' },
					{ id: '2', name: 'GitHub Token', type: 'githubApi' },
					{ id: '3', name: 'Notion Key', type: 'notionApi' },
				],
				total: 3,
				hasMore: false,
			});
		});

		it('should filter by type when provided', async () => {
			const credentials: CredentialSummary[] = [{ id: '1', name: 'Slack Token', type: 'slackApi' }];
			const context = createMockContext();
			(context.credentialService.list as jest.Mock).mockResolvedValue(credentials);

			const tool = createCredentialsTool(context);
			await tool.execute!({ action: 'list' as const, type: 'slackApi' }, noSuspendCtx());

			expect(context.credentialService.list).toHaveBeenCalledWith({ type: 'slackApi' });
		});

		it('should paginate with offset and limit', async () => {
			const credentials: CredentialSummary[] = Array.from({ length: 10 }, (_, i) => ({
				id: String(i),
				name: `Cred ${i}`,
				type: 'testType',
			}));
			const context = createMockContext();
			(context.credentialService.list as jest.Mock).mockResolvedValue(credentials);

			const tool = createCredentialsTool(context);
			const result = await tool.execute!(
				{ action: 'list' as const, offset: 3, limit: 2 },
				noSuspendCtx(),
			);

			expect(result).toEqual({
				credentials: [
					{ id: '3', name: 'Cred 3', type: 'testType' },
					{ id: '4', name: 'Cred 4', type: 'testType' },
				],
				total: 10,
				hasMore: true,
				hint: expect.stringContaining('Showing 2 of 10'),
			});
		});

		it('should use default limit of 50 and offset of 0', async () => {
			const credentials: CredentialSummary[] = Array.from({ length: 60 }, (_, i) => ({
				id: String(i),
				name: `Cred ${i}`,
				type: 'testType',
			}));
			const context = createMockContext();
			(context.credentialService.list as jest.Mock).mockResolvedValue(credentials);

			const tool = createCredentialsTool(context);
			const result = await tool.execute!({ action: 'list' as const }, noSuspendCtx());

			expect((result as { credentials: unknown[] }).credentials).toHaveLength(50);
			expect((result as { total: number }).total).toBe(60);
		});

		it('should filter by query (case-insensitive name substring)', async () => {
			const credentials: CredentialSummary[] = [
				{ id: '1', name: 'Slack Work', type: 'slackApi' },
				{ id: '2', name: 'Slack Personal', type: 'slackApi' },
				{ id: '3', name: 'Notion Key', type: 'notionApi' },
			];
			const context = createMockContext();
			(context.credentialService.list as jest.Mock).mockResolvedValue(credentials);

			const tool = createCredentialsTool(context);
			const result = await tool.execute!(
				{ action: 'list' as const, name: 'slack' },
				noSuspendCtx(),
			);

			expect(result).toEqual({
				credentials: [
					{ id: '1', name: 'Slack Work', type: 'slackApi' },
					{ id: '2', name: 'Slack Personal', type: 'slackApi' },
				],
				total: 2,
				hasMore: false,
			});
		});

		it('should find a named credential beyond the default limit when query is used', async () => {
			const credentials: CredentialSummary[] = Array.from({ length: 60 }, (_, i) => ({
				id: String(i),
				name: i === 55 ? 'Production Notion' : `Cred ${i}`,
				type: 'notionApi',
			}));
			const context = createMockContext();
			(context.credentialService.list as jest.Mock).mockResolvedValue(credentials);

			const tool = createCredentialsTool(context);
			const result = await tool.execute!(
				{ action: 'list' as const, name: 'production' },
				noSuspendCtx(),
			);

			expect(result).toEqual({
				credentials: [{ id: '55', name: 'Production Notion', type: 'notionApi' }],
				total: 1,
				hasMore: false,
			});
		});

		it('should include a hint when the page is truncated and no narrowing filter was used', async () => {
			const credentials: CredentialSummary[] = Array.from({ length: 60 }, (_, i) => ({
				id: String(i),
				name: `Cred ${i}`,
				type: 'testType',
			}));
			const context = createMockContext();
			(context.credentialService.list as jest.Mock).mockResolvedValue(credentials);

			const tool = createCredentialsTool(context);
			const result = (await tool.execute!({ action: 'list' as const }, noSuspendCtx())) as {
				credentials: unknown[];
				total: number;
				hasMore: boolean;
				hint?: string;
			};

			expect(result.total).toBe(60);
			expect(result.hasMore).toBe(true);
			expect(result.hint).toContain('Showing 50 of 60');
			expect(result.hint).toContain('`name`');
			expect(result.hint).toContain('`type`');
			expect(result.hint).toContain('`offset`');
		});

		it('should not include a hint when a narrowing filter (type) was provided', async () => {
			const credentials: CredentialSummary[] = Array.from({ length: 60 }, (_, i) => ({
				id: String(i),
				name: `Cred ${i}`,
				type: 'slackApi',
			}));
			const context = createMockContext();
			(context.credentialService.list as jest.Mock).mockResolvedValue(credentials);

			const tool = createCredentialsTool(context);
			const result = (await tool.execute!(
				{ action: 'list' as const, type: 'slackApi' },
				noSuspendCtx(),
			)) as { hasMore: boolean; hint?: string };

			expect(result.hasMore).toBe(true);
			expect(result.hint).toBeUndefined();
		});

		it('should only return id, name, and type fields', async () => {
			const credentials = [
				{ id: '1', name: 'Slack Token', type: 'slackApi', extraField: 'should-be-stripped' },
			];
			const context = createMockContext();
			(context.credentialService.list as jest.Mock).mockResolvedValue(credentials);

			const tool = createCredentialsTool(context);
			const result = await tool.execute!({ action: 'list' as const }, noSuspendCtx());

			expect((result as { credentials: unknown[] }).credentials).toEqual([
				{ id: '1', name: 'Slack Token', type: 'slackApi' },
			]);
		});
	});

	// ── get ─────────────────────────────────────────────────────────────────

	describe('get action', () => {
		it('should call credentialService.get with the credential ID', async () => {
			const detail: CredentialDetail = {
				id: '42',
				name: 'My Notion Key',
				type: 'notionApi',
				nodesWithAccess: [{ nodeType: 'n8n-nodes-base.notion' }],
			};
			const context = createMockContext();
			(context.credentialService.get as jest.Mock).mockResolvedValue(detail);

			const tool = createCredentialsTool(context);
			const result = await tool.execute!(
				{ action: 'get' as const, credentialId: '42' },
				noSuspendCtx(),
			);

			expect(context.credentialService.get).toHaveBeenCalledWith('42');
			expect(result).toEqual(detail);
		});
	});

	// ── delete ──────────────────────────────────────────────────────────────

	describe('delete action', () => {
		it('should return denied when permission is blocked', async () => {
			const context = createMockContext({
				permissions: { deleteCredential: 'blocked' },
			});

			const tool = createCredentialsTool(context);
			const result = await tool.execute!(
				{ action: 'delete' as const, credentialId: '1' },
				noSuspendCtx(),
			);

			expect(result).toEqual({
				success: false,
				denied: true,
				reason: 'Action blocked by admin',
			});
			expect(context.credentialService.delete).not.toHaveBeenCalled();
		});

		it('should execute immediately when permission is always_allow', async () => {
			const context = createMockContext({
				permissions: { deleteCredential: 'always_allow' },
			});

			const tool = createCredentialsTool(context);
			const result = await tool.execute!(
				{ action: 'delete' as const, credentialId: '1' },
				noSuspendCtx(),
			);

			expect(context.credentialService.delete).toHaveBeenCalledWith('1');
			expect(result).toEqual({ success: true });
		});

		it('should suspend for confirmation when permission needs approval', async () => {
			const context = createMockContext({
				permissions: { deleteCredential: 'require_approval' },
			});
			const suspendFn = jest.fn();

			const tool = createCredentialsTool(context);
			await tool.execute!(
				{ action: 'delete' as const, credentialId: '1', credentialName: 'My Cred' },
				suspendCtx(suspendFn),
			);

			expect(suspendFn).toHaveBeenCalledTimes(1);
			expect(suspendFn.mock.calls[0][0]).toEqual(
				expect.objectContaining({
					requestId: expect.any(String),
					message: 'Delete credential "My Cred"? This cannot be undone.',
					severity: 'destructive',
				}),
			);
			expect(context.credentialService.delete).not.toHaveBeenCalled();
		});

		it('should use credentialId in message when credentialName is not provided', async () => {
			const context = createMockContext({
				permissions: { deleteCredential: 'require_approval' },
			});
			const suspendFn = jest.fn();

			const tool = createCredentialsTool(context);
			await tool.execute!(
				{ action: 'delete' as const, credentialId: 'cred-99' },
				suspendCtx(suspendFn),
			);

			expect(suspendFn).toHaveBeenCalledTimes(1);
			expect(suspendFn.mock.calls[0][0]).toEqual(
				expect.objectContaining({
					message: 'Delete credential "cred-99"? This cannot be undone.',
				}),
			);
		});

		it('should suspend by default when permissions are not explicitly set', async () => {
			const context = createMockContext({ permissions: {} });
			const suspendFn = jest.fn();

			const tool = createCredentialsTool(context);
			await tool.execute!({ action: 'delete' as const, credentialId: '1' }, suspendCtx(suspendFn));

			expect(suspendFn).toHaveBeenCalled();
			expect(context.credentialService.delete).not.toHaveBeenCalled();
		});

		it('should delete after user approves on resume', async () => {
			const context = createMockContext({
				permissions: { deleteCredential: 'require_approval' },
			});

			const tool = createCredentialsTool(context);
			const result = await tool.execute!(
				{ action: 'delete' as const, credentialId: '1' },
				resumeCtx({ approved: true }),
			);

			expect(context.credentialService.delete).toHaveBeenCalledWith('1');
			expect(result).toEqual({ success: true });
		});

		it('should return denied when user denies on resume', async () => {
			const context = createMockContext({
				permissions: { deleteCredential: 'require_approval' },
			});

			const tool = createCredentialsTool(context);
			const result = await tool.execute!(
				{ action: 'delete' as const, credentialId: '1' },
				resumeCtx({ approved: false }),
			);

			expect(result).toEqual({
				success: false,
				denied: true,
				reason: 'User denied the action',
			});
			expect(context.credentialService.delete).not.toHaveBeenCalled();
		});
	});

	// ── search-types ────────────────────────────────────────────────────────

	describe('search-types action', () => {
		it('should call credentialService.searchCredentialTypes', async () => {
			const searchResults = [
				{ type: 'slackApi', displayName: 'Slack API' },
				{ type: 'slackOAuth2Api', displayName: 'Slack OAuth2 API' },
			];
			const context = createMockContext();
			(context.credentialService.searchCredentialTypes as jest.Mock).mockResolvedValue(
				searchResults,
			);

			const tool = createCredentialsTool(context);
			const result = await tool.execute!(
				{ action: 'search-types' as const, query: 'slack' },
				noSuspendCtx(),
			);

			expect(context.credentialService.searchCredentialTypes).toHaveBeenCalledWith('slack');
			expect(result).toEqual({ results: searchResults });
		});

		it('should filter out generic auth types', async () => {
			const searchResults = [
				{ type: 'slackApi', displayName: 'Slack API' },
				{ type: 'httpHeaderAuth', displayName: 'Header Auth' },
				{ type: 'httpBearerAuth', displayName: 'Bearer Auth' },
				{ type: 'httpBasicAuth', displayName: 'Basic Auth' },
				{ type: 'httpQueryAuth', displayName: 'Query Auth' },
				{ type: 'httpCustomAuth', displayName: 'Custom Auth' },
				{ type: 'httpDigestAuth', displayName: 'Digest Auth' },
				{ type: 'oAuth1Api', displayName: 'OAuth1' },
				{ type: 'oAuth2Api', displayName: 'OAuth2' },
			];
			const context = createMockContext();
			(context.credentialService.searchCredentialTypes as jest.Mock).mockResolvedValue(
				searchResults,
			);

			const tool = createCredentialsTool(context);
			const result = await tool.execute!(
				{ action: 'search-types' as const, query: 'auth' },
				noSuspendCtx(),
			);

			expect((result as { results: unknown[] }).results).toEqual([
				{ type: 'slackApi', displayName: 'Slack API' },
			]);
		});

		it('should return empty results when searchCredentialTypes is not available', async () => {
			const context = createMockContext();
			context.credentialService.searchCredentialTypes = undefined;

			const tool = createCredentialsTool(context);
			const result = await tool.execute!(
				{ action: 'search-types' as const, query: 'slack' },
				noSuspendCtx(),
			);

			expect(result).toEqual({ results: [] });
		});
	});

	// ── setup ───────────────────────────────────────────────────────────────

	describe('setup action', () => {
		it('should suspend with credentialRequests on first call', async () => {
			const existingCreds: CredentialSummary[] = [
				{ id: 'c1', name: 'Existing Slack', type: 'slackApi' },
			];
			const context = createMockContext();
			(context.credentialService.list as jest.Mock).mockResolvedValue(existingCreds);

			const suspendFn = jest.fn();
			const tool = createCredentialsTool(context);
			await tool.execute!(
				{
					action: 'setup' as const,
					credentials: [{ credentialType: 'slackApi', reason: 'For sending messages' }],
				},
				suspendCtx(suspendFn),
			);

			expect(context.credentialService.list).toHaveBeenCalledWith({ type: 'slackApi' });
			expect(suspendFn).toHaveBeenCalledTimes(1);
			expect(suspendFn.mock.calls[0][0]).toEqual(
				expect.objectContaining({
					requestId: expect.any(String),
					message: 'Select or create a slackApi credential',
					severity: 'info',
					credentialRequests: [
						{
							credentialType: 'slackApi',
							reason: 'For sending messages',
							existingCredentials: [{ id: 'c1', name: 'Existing Slack' }],
						},
					],
				}),
			);
		});

		it('should include suggestedName in credentialRequests when provided', async () => {
			const context = createMockContext();
			(context.credentialService.list as jest.Mock).mockResolvedValue([]);

			const suspendFn = jest.fn();
			const tool = createCredentialsTool(context);
			await tool.execute!(
				{
					action: 'setup' as const,
					credentials: [
						{
							credentialType: 'slackApi',
							reason: 'For notifications',
							suggestedName: 'Slack Bot Token',
						},
					],
				},
				suspendCtx(suspendFn),
			);

			expect(suspendFn).toHaveBeenCalledTimes(1);
			expect(suspendFn.mock.calls[0][0]).toEqual(
				expect.objectContaining({
					credentialRequests: [
						expect.objectContaining({
							suggestedName: 'Slack Bot Token',
						}),
					],
				}),
			);
		});

		it('should use plural message for multiple credentials', async () => {
			const context = createMockContext();
			(context.credentialService.list as jest.Mock).mockResolvedValue([]);

			const suspendFn = jest.fn();
			const tool = createCredentialsTool(context);
			await tool.execute!(
				{
					action: 'setup' as const,
					credentials: [{ credentialType: 'slackApi' }, { credentialType: 'notionApi' }],
				},
				suspendCtx(suspendFn),
			);

			expect(suspendFn).toHaveBeenCalledTimes(1);
			expect(suspendFn.mock.calls[0][0]).toEqual(
				expect.objectContaining({
					message: 'Select or create credentials: slackApi, notionApi',
				}),
			);
		});

		it('should include projectId in suspend payload when provided', async () => {
			const context = createMockContext();
			(context.credentialService.list as jest.Mock).mockResolvedValue([]);

			const suspendFn = jest.fn();
			const tool = createCredentialsTool(context);
			await tool.execute!(
				{
					action: 'setup' as const,
					credentials: [{ credentialType: 'slackApi' }],
					projectId: 'proj-1',
				},
				suspendCtx(suspendFn),
			);

			expect(suspendFn).toHaveBeenCalledTimes(1);
			expect(suspendFn.mock.calls[0][0]).toEqual(expect.objectContaining({ projectId: 'proj-1' }));
		});

		it('should include credentialFlow in suspend payload for finalize stage', async () => {
			const context = createMockContext();
			(context.credentialService.list as jest.Mock).mockResolvedValue([]);

			const suspendFn = jest.fn();
			const tool = createCredentialsTool(context);
			await tool.execute!(
				{
					action: 'setup' as const,
					credentials: [{ credentialType: 'slackApi' }],
					credentialFlow: { stage: 'finalize' },
				},
				suspendCtx(suspendFn),
			);

			expect(suspendFn).toHaveBeenCalledTimes(1);
			expect(suspendFn.mock.calls[0][0]).toEqual(
				expect.objectContaining({
					message: expect.stringContaining('Your workflow is verified'),
					credentialFlow: { stage: 'finalize' },
				}),
			);
		});

		it('should return credentials when user approves with selections', async () => {
			const context = createMockContext();

			const tool = createCredentialsTool(context);
			const result = await tool.execute!(
				{
					action: 'setup' as const,
					credentials: [{ credentialType: 'slackApi' }],
				},
				resumeCtx({ approved: true, credentials: { slackApi: 'cred-123' } }),
			);

			expect(result).toEqual({
				success: true,
				credentials: { slackApi: 'cred-123' },
			});
		});

		it('should return deferred when user does not approve (skips)', async () => {
			const context = createMockContext();

			const tool = createCredentialsTool(context);
			const result = await tool.execute!(
				{
					action: 'setup' as const,
					credentials: [{ credentialType: 'slackApi' }],
				},
				resumeCtx({ approved: false }),
			);

			expect(result).toEqual({
				success: true,
				deferred: true,
				reason: expect.stringContaining('User skipped credential setup'),
			});
		});

		it('should return needsBrowserSetup when autoSetup is present', async () => {
			const context = createMockContext();
			(context.credentialService.getDocumentationUrl as jest.Mock).mockResolvedValue(
				'https://docs.example.com/slack',
			);
			(context.credentialService.getCredentialFields as jest.Mock).mockResolvedValue([
				{ name: 'apiKey', displayName: 'API Key', type: 'string', required: true },
			]);

			const tool = createCredentialsTool(context);
			const result = await tool.execute!(
				{
					action: 'setup' as const,
					credentials: [{ credentialType: 'slackApi' }],
				},
				resumeCtx({ approved: true, autoSetup: { credentialType: 'slackApi' } }),
			);

			expect(result).toEqual({
				success: false,
				needsBrowserSetup: true,
				credentialType: 'slackApi',
				docsUrl: 'https://docs.example.com/slack',
				requiredFields: [
					{ name: 'apiKey', displayName: 'API Key', type: 'string', required: true },
				],
			});
		});

		it('should handle autoSetup when getDocumentationUrl is not available', async () => {
			const context = createMockContext();
			context.credentialService.getDocumentationUrl = undefined;
			context.credentialService.getCredentialFields = undefined;

			const tool = createCredentialsTool(context);
			const result = await tool.execute!(
				{
					action: 'setup' as const,
					credentials: [{ credentialType: 'slackApi' }],
				},
				resumeCtx({ approved: true, autoSetup: { credentialType: 'slackApi' } }),
			);

			expect(result).toEqual({
				success: false,
				needsBrowserSetup: true,
				credentialType: 'slackApi',
				docsUrl: undefined,
				requiredFields: undefined,
			});
		});

		it('should default reason when not provided in credential requests', async () => {
			const context = createMockContext();
			(context.credentialService.list as jest.Mock).mockResolvedValue([]);

			const suspendFn = jest.fn();
			const tool = createCredentialsTool(context);
			await tool.execute!(
				{
					action: 'setup' as const,
					credentials: [{ credentialType: 'slackApi' }],
				},
				suspendCtx(suspendFn),
			);

			expect(suspendFn).toHaveBeenCalledTimes(1);
			expect(suspendFn.mock.calls[0][0]).toEqual(
				expect.objectContaining({
					credentialRequests: [
						expect.objectContaining({
							reason: 'Required for slackApi',
						}),
					],
				}),
			);
		});
	});

	// ── test ────────────────────────────────────────────────────────────────

	describe('test action', () => {
		it('should call credentialService.test and return result', async () => {
			const context = createMockContext();
			(context.credentialService.test as jest.Mock).mockResolvedValue({
				success: true,
				message: 'Connection successful',
			});

			const tool = createCredentialsTool(context);
			const result = await tool.execute!(
				{ action: 'test' as const, credentialId: '42' },
				noSuspendCtx(),
			);

			expect(context.credentialService.test).toHaveBeenCalledWith('42');
			expect(result).toEqual({ success: true, message: 'Connection successful' });
		});

		it('should handle errors from credentialService.test', async () => {
			const context = createMockContext();
			(context.credentialService.test as jest.Mock).mockRejectedValue(
				new Error('Connection refused'),
			);

			const tool = createCredentialsTool(context);
			const result = await tool.execute!(
				{ action: 'test' as const, credentialId: '42' },
				noSuspendCtx(),
			);

			expect(result).toEqual({
				success: false,
				message: 'Connection refused',
			});
		});

		it('should handle non-Error throws from credentialService.test', async () => {
			const context = createMockContext();
			(context.credentialService.test as jest.Mock).mockRejectedValue('string error');

			const tool = createCredentialsTool(context);
			const result = await tool.execute!(
				{ action: 'test' as const, credentialId: '42' },
				noSuspendCtx(),
			);

			expect(result).toEqual({
				success: false,
				message: 'Credential test failed',
			});
		});
	});
});
