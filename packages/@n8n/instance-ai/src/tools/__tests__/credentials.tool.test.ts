import type { InstanceAiPermissions } from '@n8n/api-types';

import { executeTool } from '../../__tests__/tool-test-utils';
import type { InstanceAiContext, CredentialSummary, CredentialDetail } from '../../types';
import { createCredentialsTool, type CredentialAction } from '../credentials.tool';

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
	return { resumeData: undefined, suspend: undefined } as never;
}

function suspendCtx(suspendFn: jest.Mock = jest.fn()) {
	return {
		resumeData: undefined,
		suspend: suspendFn,
	} as never;
}

function resumeCtx(resumeData: {
	approved: boolean;
	credentials?: Record<string, string>;
	autoSetup?: { credentialType: string };
}) {
	const suspend = jest.fn();
	return { resumeData, suspend } as never;
}

function getInputSchema(tool: unknown): { safeParse: (input: unknown) => { success: boolean } } {
	return (tool as { inputSchema: { safeParse: (input: unknown) => { success: boolean } } })
		.inputSchema;
}

function getDescription(tool: unknown): string {
	return (tool as { description: string }).description;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('credentials tool', () => {
	describe('action filtering', () => {
		const builderCredentialActions = [
			'list',
			'get',
			'search-types',
			'test',
		] as const satisfies readonly CredentialAction[];

		it('should support setup by default', () => {
			const tool = createCredentialsTool(createMockContext());
			const schema = getInputSchema(tool);

			expect(
				schema.safeParse({
					action: 'setup',
					credentials: [{ credentialType: 'slackApi', reason: 'Send Slack messages' }],
				}).success,
			).toBe(true);
			expect(getDescription(tool)).toContain('set up new credentials');
		});

		it('should describe only explicitly allowed actions', () => {
			const tool = createCredentialsTool(createMockContext(), {
				allowedActions: builderCredentialActions,
				descriptionPrefix: 'Inspect credentials during build',
				descriptionSuffix: 'Setup is handled after workflow verification.',
			});

			expect(getDescription(tool)).toContain('Inspect credentials during build');
			expect(getDescription(tool)).not.toContain('delete');
			expect(getDescription(tool)).not.toContain('set up new credentials');
		});

		it.each([
			[{ action: 'list' }],
			[{ action: 'get', credentialId: 'cred-1' }],
			[{ action: 'search-types', query: 'slack' }],
			[{ action: 'test', credentialId: 'cred-1' }],
		])('should support explicitly allowed action %p', (input) => {
			const tool = createCredentialsTool(createMockContext(), {
				allowedActions: builderCredentialActions,
			});
			const schema = getInputSchema(tool);

			expect(schema.safeParse(input).success).toBe(true);
		});

		it.each([
			[
				{
					action: 'setup',
					credentials: [{ credentialType: 'slackApi', reason: 'Send Slack messages' }],
				},
			],
			[{ action: 'delete', credentialId: 'cred-1' }],
		])('should reject action %p when it is not explicitly allowed', (input) => {
			const tool = createCredentialsTool(createMockContext(), {
				allowedActions: builderCredentialActions,
			});
			const schema = getInputSchema(tool);

			expect(schema.safeParse(input).success).toBe(false);
		});

		it('should reject builder-disallowed setup at the schema boundary', () => {
			const tool = createCredentialsTool(createMockContext(), {
				allowedActions: builderCredentialActions,
			});
			const schema = getInputSchema(tool);

			expect(
				schema.safeParse({
					action: 'setup',
					credentials: [{ credentialType: 'slackApi', reason: 'Send Slack messages' }],
				}).success,
			).toBe(false);
		});
	});

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
			const result = await executeTool(tool, { action: 'list' as const }, noSuspendCtx());

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
			await executeTool(tool, { action: 'list' as const, type: 'slackApi' }, noSuspendCtx());

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
			const result = await executeTool(
				tool,
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
			const result = await executeTool(tool, { action: 'list' as const }, noSuspendCtx());

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
			const result = await executeTool(
				tool,
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
			const result = await executeTool(
				tool,
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
			const result = await executeTool(tool, { action: 'list' as const }, noSuspendCtx());

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
			const result = await executeTool(
				tool,
				{ action: 'list' as const, type: 'slackApi' },
				noSuspendCtx(),
			);

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
			const result = await executeTool(tool, { action: 'list' as const }, noSuspendCtx());

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
			const result = await executeTool(
				tool,
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
			const result = await executeTool(
				tool,
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
			const result = await executeTool(
				tool,
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
			await executeTool(
				tool,
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
			await executeTool(
				tool,
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
			await executeTool(
				tool,
				{ action: 'delete' as const, credentialId: '1' },
				suspendCtx(suspendFn),
			);

			expect(suspendFn).toHaveBeenCalled();
			expect(context.credentialService.delete).not.toHaveBeenCalled();
		});

		it('should delete after user approves on resume', async () => {
			const context = createMockContext({
				permissions: { deleteCredential: 'require_approval' },
			});

			const tool = createCredentialsTool(context);
			const result = await executeTool(
				tool,
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
			const result = await executeTool(
				tool,
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
			const result = await executeTool(
				tool,
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
			const result = await executeTool(
				tool,
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
			const result = await executeTool(
				tool,
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
			await executeTool(
				tool,
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
			await executeTool(
				tool,
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
			await executeTool(
				tool,
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
			await executeTool(
				tool,
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

		it('should scope credential lookup to projectId when provided', async () => {
			const context = createMockContext();
			(context.credentialService.list as jest.Mock).mockResolvedValue([]);

			const tool = createCredentialsTool(context);
			await tool.handler!(
				{
					action: 'setup' as const,
					credentials: [{ credentialType: 'slackApi' }],
					projectId: 'proj-1',
				},
				suspendCtx(jest.fn()),
			);

			expect(context.credentialService.list).toHaveBeenCalledWith({
				type: 'slackApi',
				projectId: 'proj-1',
			});
		});

		it('should omit projectId from credential lookup when not provided', async () => {
			const context = createMockContext();
			(context.credentialService.list as jest.Mock).mockResolvedValue([]);

			const tool = createCredentialsTool(context);
			await tool.handler!(
				{
					action: 'setup' as const,
					credentials: [{ credentialType: 'slackApi' }],
				},
				suspendCtx(jest.fn()),
			);

			expect(context.credentialService.list).toHaveBeenCalledWith({ type: 'slackApi' });
		});

		it('should include credentialFlow in suspend payload for finalize stage', async () => {
			const context = createMockContext();
			(context.credentialService.list as jest.Mock).mockResolvedValue([]);

			const suspendFn = jest.fn();
			const tool = createCredentialsTool(context);
			await executeTool(
				tool,
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
			const result = await executeTool(
				tool,
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
			const result = await executeTool(
				tool,
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
			const result = await executeTool(
				tool,
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
			const result = await executeTool(
				tool,
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

		it('should return missing_credentials error when credentials is undefined', async () => {
			const context = createMockContext();
			const suspendFn = jest.fn();

			const tool = createCredentialsTool(context);
			const result = await tool.handler!(
				{ action: 'setup', credentialFlow: { stage: 'finalize' } },
				suspendCtx(suspendFn),
			);

			expect(result).toEqual({
				error: 'missing_credentials',
				message: expect.stringContaining('credentials'),
			});
			expect(suspendFn).not.toHaveBeenCalled();
			expect(context.credentialService.list).not.toHaveBeenCalled();
		});

		it('should return missing_credentials error when credentials is an empty array', async () => {
			const context = createMockContext();
			const suspendFn = jest.fn();

			const tool = createCredentialsTool(context);
			const result = await tool.handler!(
				{ action: 'setup', credentials: [] },
				suspendCtx(suspendFn),
			);

			expect(result).toEqual({
				error: 'missing_credentials',
				message: expect.stringContaining('credentials'),
			});
			expect(suspendFn).not.toHaveBeenCalled();
		});

		describe('node-bound credentials', () => {
			const notionDescription = {
				name: 'n8n-nodes-base.notion',
				displayName: 'Notion',
				description: '',
				group: [],
				version: 2.2,
				inputs: ['main'],
				outputs: ['main'],
				credentials: [
					{
						name: 'notionApi',
						required: true,
						displayOptions: { show: { authentication: ['apiKey'] } },
					},
					{
						name: 'notionOAuth2Api',
						required: true,
						displayOptions: { show: { authentication: ['oAuth2'] } },
					},
				],
				properties: [
					{
						displayName: 'Authentication',
						name: 'authentication',
						type: 'options',
						options: [
							{ name: 'API Key', value: 'apiKey' },
							{ name: 'OAuth2', value: 'oAuth2' },
						],
						default: 'apiKey',
					},
				],
			};

			function createNodeContext(description: typeof notionDescription) {
				const context = createMockContext();
				(context.nodeService as unknown as { getDescription: jest.Mock }).getDescription = jest
					.fn()
					.mockResolvedValue(description);
				return context;
			}

			it('resolves credentialType from nodeType and prefers the OAuth2 variant', async () => {
				const context = createNodeContext(notionDescription);
				const suspendFn = jest.fn();

				const tool = createCredentialsTool(context);
				await executeTool(
					tool,
					{
						action: 'setup' as const,
						credentials: [{ nodeType: 'n8n-nodes-base.notion' }],
					},
					suspendCtx(suspendFn),
				);

				expect(context.credentialService.list).toHaveBeenCalledWith({
					type: 'notionOAuth2Api',
				});
				expect(suspendFn).toHaveBeenCalledTimes(1);
				expect(suspendFn.mock.calls[0][0]).toEqual(
					expect.objectContaining({
						credentialRequests: [
							expect.objectContaining({
								credentialType: 'notionOAuth2Api',
								nodeType: 'n8n-nodes-base.notion',
							}),
						],
					}),
				);
			});

			it('honors a preferred credentialType when both are provided', async () => {
				const context = createNodeContext(notionDescription);
				const suspendFn = jest.fn();

				const tool = createCredentialsTool(context);
				await executeTool(
					tool,
					{
						action: 'setup' as const,
						credentials: [{ nodeType: 'n8n-nodes-base.notion', credentialType: 'notionApi' }],
					},
					suspendCtx(suspendFn),
				);

				expect(suspendFn.mock.calls[0][0]).toEqual(
					expect.objectContaining({
						credentialRequests: [
							expect.objectContaining({
								credentialType: 'notionApi',
								nodeType: 'n8n-nodes-base.notion',
							}),
						],
					}),
				);
			});

			it('ignores an unsupported preferred credentialType and falls back to OAuth2', async () => {
				const context = createNodeContext(notionDescription);
				const suspendFn = jest.fn();

				const tool = createCredentialsTool(context);
				await executeTool(
					tool,
					{
						action: 'setup' as const,
						credentials: [{ nodeType: 'n8n-nodes-base.notion', credentialType: 'slackApi' }],
					},
					suspendCtx(suspendFn),
				);

				expect(suspendFn.mock.calls[0][0]).toEqual(
					expect.objectContaining({
						credentialRequests: [
							expect.objectContaining({
								credentialType: 'notionOAuth2Api',
								nodeType: 'n8n-nodes-base.notion',
							}),
						],
					}),
				);
			});

			it('falls back to the default authentication value when no OAuth variant exists', async () => {
				const apiKeyOnlyDescription = {
					...notionDescription,
					credentials: [
						{
							name: 'slackApi',
							required: true,
							displayOptions: { show: { authentication: ['accessToken'] } },
						},
						{
							name: 'slackBotApi',
							required: true,
							displayOptions: { show: { authentication: ['botToken'] } },
						},
					],
					properties: [
						{
							displayName: 'Authentication',
							name: 'authentication',
							type: 'options',
							options: [
								{ name: 'Access Token', value: 'accessToken' },
								{ name: 'Bot Token', value: 'botToken' },
							],
							default: 'botToken',
						},
					],
				};
				const context = createNodeContext(apiKeyOnlyDescription);
				const suspendFn = jest.fn();

				const tool = createCredentialsTool(context);
				await executeTool(
					tool,
					{
						action: 'setup' as const,
						credentials: [{ nodeType: 'n8n-nodes-base.slack' }],
					},
					suspendCtx(suspendFn),
				);

				expect(suspendFn.mock.calls[0][0]).toEqual(
					expect.objectContaining({
						credentialRequests: [
							expect.objectContaining({
								credentialType: 'slackBotApi',
							}),
						],
					}),
				);
			});

			it('returns an error when nodeType lookup fails', async () => {
				const context = createMockContext();
				(context.nodeService as unknown as { getDescription: jest.Mock }).getDescription = jest
					.fn()
					.mockRejectedValue(new Error('not found'));

				const tool = createCredentialsTool(context);
				const result = await tool.handler!(
					{
						action: 'setup',
						credentials: [{ nodeType: 'n8n-nodes-base.unknown' }],
					},
					noSuspendCtx(),
				);

				expect(result).toEqual({
					error: 'node_not_found',
					message: expect.stringContaining('n8n-nodes-base.unknown'),
				});
			});

			it('returns an error when the node declares no credentials', async () => {
				const noCredsDescription = { ...notionDescription, credentials: [] };
				const context = createNodeContext(noCredsDescription);

				const tool = createCredentialsTool(context);
				const result = await tool.handler!(
					{
						action: 'setup',
						credentials: [{ nodeType: 'n8n-nodes-base.notion' }],
					},
					noSuspendCtx(),
				);

				expect(result).toEqual({
					error: 'no_credentials_for_node',
					message: expect.stringContaining('n8n-nodes-base.notion'),
				});
			});

			it('returns invalid_request when neither nodeType nor credentialType is provided', async () => {
				const context = createMockContext();
				const tool = createCredentialsTool(context);

				const result = await tool.handler!(
					{
						action: 'setup',
						credentials: [{ reason: 'just because' }],
					},
					noSuspendCtx(),
				);

				expect(result).toEqual({
					error: 'invalid_request',
					message: expect.stringContaining('nodeType or credentialType'),
				});
			});
		});

		it('should default reason when not provided in credential requests', async () => {
			const context = createMockContext();
			(context.credentialService.list as jest.Mock).mockResolvedValue([]);

			const suspendFn = jest.fn();
			const tool = createCredentialsTool(context);
			await executeTool(
				tool,
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
			const result = await executeTool(
				tool,
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
			const result = await executeTool(
				tool,
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
			const result = await executeTool(
				tool,
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
