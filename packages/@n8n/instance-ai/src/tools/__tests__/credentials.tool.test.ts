import { isZodSchema } from '@n8n/agents';
import { zodToJsonSchema } from '@n8n/ai-utilities/json-schema';
import type { InstanceAiPermissions } from '@n8n/api-types';
import type { Mock } from 'vitest';

import { executeTool } from '../../__tests__/tool-test-utils';
import { OutsideThreadProjectError } from '../../errors/outside-thread-project.error';
import type { InstanceAiContext, CredentialSummary, CredentialDetail } from '../../types';
import {
	createDeleteCredentialTool,
	createListCredentialsTool,
	createSearchCredentialTypesTool,
	createSetupCredentialsTool,
	createTestCredentialTool,
} from '../credentials.tool';
import { prepareWorkflowSetup } from '../workflows/prepare-workflow-setup';
import type { SetupRequest } from '../workflows/setup-workflow.schema';
import { analyzeWorkflow } from '../workflows/setup-workflow.service';

vi.mock('../workflows/setup-workflow.service', async (importOriginal) => ({
	...(await importOriginal<typeof import('../workflows/setup-workflow.service')>()),
	analyzeWorkflow: vi.fn(async () => await Promise.resolve([])),
}));

vi.mock('../workflows/prepare-workflow-setup', () => ({ prepareWorkflowSetup: vi.fn() }));

// ── Helpers ──────────────────────────────────────────────────────────────────

function createMockContext(
	overrides: Partial<Omit<InstanceAiContext, 'permissions'>> & {
		permissions?: Partial<InstanceAiPermissions>;
	} = {},
): InstanceAiContext {
	return {
		userId: 'user-1',
		credentialDescriptionsEnabled: true,
		workflowService: {} as InstanceAiContext['workflowService'],
		executionService: {} as InstanceAiContext['executionService'],
		nodeService: {} as InstanceAiContext['nodeService'],
		dataTableService: {} as InstanceAiContext['dataTableService'],
		credentialService: {
			list: vi.fn().mockResolvedValue([]),
			get: vi.fn().mockResolvedValue({}),
			delete: vi.fn().mockResolvedValue(undefined),
			test: vi.fn().mockResolvedValue({ success: true }),
			searchCredentialTypes: vi.fn().mockResolvedValue([]),
			getDocumentationUrl: vi.fn().mockResolvedValue(null),
			getCredentialFields: vi.fn().mockResolvedValue([]),
			isTestable: vi.fn().mockResolvedValue(true),
			getCredentialFillState: vi.fn().mockResolvedValue('unknown'),
		},
		permissions: {},
		...overrides,
	} as unknown as InstanceAiContext;
}

function noSuspendCtx() {
	return { resumeData: undefined, suspend: undefined } as never;
}

function suspendCtx(suspendFn: Mock = vi.fn()) {
	return {
		resumeData: undefined,
		suspend: suspendFn,
	} as never;
}

function resumeCtx(resumeData: {
	approved: boolean;
	credentials?: Record<string, string>;
	autoSetup?: { credentialType: string; attemptId?: string };
}) {
	const suspend = vi.fn();
	return { resumeData, suspend } as never;
}

function getInputSchema(tool: unknown): { safeParse: (input: unknown) => { success: boolean } } {
	return (tool as { inputSchema: { safeParse: (input: unknown) => { success: boolean } } })
		.inputSchema;
}

function getDescription(tool: unknown): string {
	return (tool as { description: string }).description;
}

type JsonSchema = NonNullable<ReturnType<typeof zodToJsonSchema>>;

function inputJsonSchema(tool: unknown): JsonSchema {
	const { inputSchema } = tool as { inputSchema: unknown };
	if (!isZodSchema(inputSchema)) throw new Error('expected a Zod input schema');
	const jsonSchema = zodToJsonSchema(inputSchema);
	if (!jsonSchema) throw new Error('expected the input schema to convert');
	return jsonSchema;
}

function property(schema: JsonSchema, name: string): JsonSchema {
	const value = schema.properties?.[name];
	if (typeof value !== 'object') throw new Error(`expected an object schema for "${name}"`);
	return value;
}

function arrayItems(schema: JsonSchema): JsonSchema {
	const value = schema.items;
	if (typeof value !== 'object' || Array.isArray(value)) {
		throw new Error('expected a single items schema');
	}
	return value;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('credential tools', () => {
	it.each([false, undefined])(
		'omits descriptions and selection guidance when the flag is %s',
		async (credentialDescriptionsEnabled) => {
			const context = createMockContext({ credentialDescriptionsEnabled });
			const credential = {
				id: '1',
				name: 'Reporting account',
				type: 'postgres',
				description: 'Read-only reporting account',
			};
			vi.mocked(context.credentialService.list).mockResolvedValue([credential]);
			vi.mocked(context.credentialService.get).mockResolvedValue(credential);
			const tool = createListCredentialsTool(context);

			const listed = await executeTool(tool, {}, noSuspendCtx());
			const fetched = await executeTool(tool, { ids: ['1'] }, noSuspendCtx());

			expect(listed).toMatchObject({ credentials: [{ id: '1', name: 'Reporting account' }] });
			expect(JSON.stringify(listed)).not.toContain('description');
			expect(fetched).toMatchObject({ credentials: [{ id: '1', name: 'Reporting account' }] });
			expect(JSON.stringify(fetched)).not.toContain('description');
			expect(context.credentialService.get).toHaveBeenCalledWith('1');
			expect(getDescription(tool)).not.toContain('read their descriptions');
			expect(credential.description).toBe('Read-only reporting account');
		},
	);

	describe('setup schema', () => {
		it('should describe credentialType with existing "gmailOAuth2" credential type and not "gmailOAuth2Api"', () => {
			const tool = createSetupCredentialsTool(createMockContext());
			const credentialType = property(
				arrayItems(property(inputJsonSchema(tool), 'credentials')),
				'credentialType',
			);

			expect(credentialType.description).toContain('gmailOAuth2"');
			expect(credentialType.description).not.toContain('gmailOAuth2Api');
		});

		it('should require requireUserSelection to be a boolean when provided', () => {
			const tool = createSetupCredentialsTool(createMockContext());
			const schema = getInputSchema(tool);
			const setupInput = {
				credentials: [{ credentialType: 'slackApi', reason: 'Send Slack messages' }],
			};

			expect(schema.safeParse({ ...setupInput, requireUserSelection: true }).success).toBe(true);
			expect(schema.safeParse({ ...setupInput, requireUserSelection: false }).success).toBe(true);
			expect(schema.safeParse({ ...setupInput, requireUserSelection: 'true' }).success).toBe(false);
		});

		it('should resume persisted calls of the former credentials tool', () => {
			const tool = createSetupCredentialsTool(createMockContext());

			expect(tool.legacyNames).toEqual(
				expect.arrayContaining(['credentials', 'workflow_builder_credentials']),
			);
		});
	});

	describe('list action', () => {
		it.each([
			{ label: 'unset', description: null, expected: null },
			{ label: 'omitted', description: undefined, expected: null },
			{ label: 'short', description: 'Reporting database', expected: 'Reporting database' },
			{ label: 'at the preview limit', description: 'x'.repeat(256), expected: 'x'.repeat(256) },
			{
				label: 'with a Unicode character at the boundary',
				description: 'x'.repeat(252) + '😀extra',
				expected: 'x'.repeat(252) + '...',
			},
			{
				label: 'above the preview limit',
				description: 'x'.repeat(257),
				expected: 'x'.repeat(253) + '...',
			},
			{
				label: 'at the storage limit',
				description: 'x'.repeat(512),
				expected: 'x'.repeat(253) + '...',
			},
		])('returns a $label description', async ({ description, expected }) => {
			const context = createMockContext();
			vi.mocked(context.credentialService.list).mockResolvedValue([
				{ id: '1', name: 'Postgres account', type: 'postgres', description },
			]);

			const result = await executeTool(createListCredentialsTool(context), {}, noSuspendCtx());

			expect(result.credentials).toEqual([
				{ id: '1', name: 'Postgres account', type: 'postgres', description: expected },
			]);
		});

		it('should call credentialService.list and return paginated results', async () => {
			const credentials: CredentialSummary[] = [
				{ id: '1', name: 'Slack Token', type: 'slackApi', description: null },
				{ id: '2', name: 'GitHub Token', type: 'githubApi', description: null },
				{ id: '3', name: 'Notion Key', type: 'notionApi', description: null },
			];
			const context = createMockContext();
			(context.credentialService.list as Mock).mockResolvedValue(credentials);

			const tool = createListCredentialsTool(context);
			const result = await executeTool(tool, {}, noSuspendCtx());

			expect(context.credentialService.list).toHaveBeenCalledWith({ type: undefined });
			expect(result).toEqual({
				credentials: [
					{ id: '1', name: 'Slack Token', type: 'slackApi', description: null },
					{ id: '2', name: 'GitHub Token', type: 'githubApi', description: null },
					{ id: '3', name: 'Notion Key', type: 'notionApi', description: null },
				],
				total: 3,
				hasMore: false,
			});
		});

		it('should filter by type when provided', async () => {
			const credentials: CredentialSummary[] = [
				{ id: '1', name: 'Slack Token', type: 'slackApi', description: null },
			];
			const context = createMockContext();
			(context.credentialService.list as Mock).mockResolvedValue(credentials);

			const tool = createListCredentialsTool(context);
			await executeTool(tool, { type: 'slackApi' }, noSuspendCtx());

			expect(context.credentialService.list).toHaveBeenCalledWith({ type: 'slackApi' });
		});

		it('should paginate with offset and limit', async () => {
			const credentials: CredentialSummary[] = Array.from({ length: 10 }, (_, i) => ({
				id: String(i),
				name: `Cred ${i}`,
				type: 'testType',
			}));
			const context = createMockContext();
			(context.credentialService.list as Mock).mockResolvedValue(credentials);

			const tool = createListCredentialsTool(context);
			const result = await executeTool(tool, { offset: 3, limit: 2 }, noSuspendCtx());

			expect(result).toEqual({
				credentials: [
					{ id: '3', name: 'Cred 3', type: 'testType', description: null },
					{ id: '4', name: 'Cred 4', type: 'testType', description: null },
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
			(context.credentialService.list as Mock).mockResolvedValue(credentials);

			const tool = createListCredentialsTool(context);
			const result = await executeTool(tool, {}, noSuspendCtx());

			expect((result as { credentials: unknown[] }).credentials).toHaveLength(50);
			expect((result as { total: number }).total).toBe(60);
		});

		it('should filter by query (case-insensitive name substring)', async () => {
			const credentials: CredentialSummary[] = [
				{ id: '1', name: 'Slack Work', type: 'slackApi', description: null },
				{ id: '2', name: 'Slack Personal', type: 'slackApi', description: null },
				{ id: '3', name: 'Notion Key', type: 'notionApi', description: null },
			];
			const context = createMockContext();
			(context.credentialService.list as Mock).mockResolvedValue(credentials);

			const tool = createListCredentialsTool(context);
			const result = await executeTool(tool, { name: 'slack' }, noSuspendCtx());

			expect(result).toEqual({
				credentials: [
					{ id: '1', name: 'Slack Work', type: 'slackApi', description: null },
					{ id: '2', name: 'Slack Personal', type: 'slackApi', description: null },
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
			(context.credentialService.list as Mock).mockResolvedValue(credentials);

			const tool = createListCredentialsTool(context);
			const result = await executeTool(tool, { name: 'production' }, noSuspendCtx());

			expect(result).toEqual({
				credentials: [
					{ id: '55', name: 'Production Notion', type: 'notionApi', description: null },
				],
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
			(context.credentialService.list as Mock).mockResolvedValue(credentials);

			const tool = createListCredentialsTool(context);
			const result = await executeTool(tool, {}, noSuspendCtx());

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
			(context.credentialService.list as Mock).mockResolvedValue(credentials);

			const tool = createListCredentialsTool(context);
			const result = await executeTool(tool, { type: 'slackApi' }, noSuspendCtx());

			expect(result.hasMore).toBe(true);
			expect(result.hint).toBeUndefined();
		});

		it('returns credential metadata without secret data', async () => {
			const credentials = [
				{ id: '1', name: 'Slack Token', type: 'slackApi', data: { apiKey: 'test-secret' } },
			];
			const context = createMockContext();
			(context.credentialService.list as Mock).mockResolvedValue(credentials);

			const tool = createListCredentialsTool(context);
			const result = await executeTool(tool, {}, noSuspendCtx());

			expect((result as { credentials: unknown[] }).credentials).toEqual([
				{ id: '1', name: 'Slack Token', type: 'slackApi', description: null },
			]);
		});
	});

	// ── list with n8n Connect ───────────────────────────────────────────────

	describe('list action — n8n Connect entry', () => {
		function makeContextWithGateway(isGatewaySupported: boolean | undefined) {
			const context = createMockContext();
			(context.credentialService.list as Mock).mockResolvedValue([
				{ id: 'c1', name: 'My OpenAI', type: 'openAiApi', description: null },
			]);
			if (isGatewaySupported !== undefined) {
				(
					context.credentialService as unknown as {
						isAiGatewayCredentialType: Mock;
					}
				).isAiGatewayCredentialType = vi.fn().mockResolvedValue(isGatewaySupported);
			}
			return context;
		}

		it('prepends a synthetic managed entry when the type is gateway-supported', async () => {
			const context = makeContextWithGateway(true);
			const tool = createListCredentialsTool(context);

			const result = await executeTool(tool, { type: 'openAiApi' }, noSuspendCtx());

			expect((result as { credentials: unknown[] }).credentials).toEqual([
				expect.objectContaining({
					id: '__AI_GATEWAY_MANAGED__',
					type: 'openAiApi',
					description: null,
					__aiGatewayManaged: true,
				}),
				{ id: 'c1', name: 'My OpenAI', type: 'openAiApi', description: null },
			]);
		});

		it('omits the managed entry when the type is not gateway-supported', async () => {
			const context = makeContextWithGateway(false);
			const tool = createListCredentialsTool(context);

			const result = await executeTool(tool, { type: 'cohereApi' }, noSuspendCtx());

			expect((result as { credentials: unknown[] }).credentials).toEqual([
				{ id: 'c1', name: 'My OpenAI', type: 'openAiApi', description: null },
			]);
		});

		it('omits the managed entry when isAiGatewayCredentialType is not implemented', async () => {
			const context = makeContextWithGateway(undefined);
			const tool = createListCredentialsTool(context);

			const result = await executeTool(tool, { type: 'openAiApi' }, noSuspendCtx());

			const creds = (result as { credentials: Array<{ id: unknown }> }).credentials;
			expect(creds.every((c) => c.id !== null)).toBe(true);
		});

		it('omits the managed entry when no type filter is provided', async () => {
			const context = makeContextWithGateway(true);
			const tool = createListCredentialsTool(context);

			const result = await executeTool(tool, {}, noSuspendCtx());

			const creds = (result as { credentials: Array<{ id: unknown }> }).credentials;
			expect(creds.every((c) => c.id !== null)).toBe(true);
		});
	});

	// ── list steering toward existing LLM-provider credentials ─────────────

	describe('list action — existing LLM-provider credential hint', () => {
		const gemini: CredentialSummary = {
			id: 'g1',
			name: 'Google Gemini account',
			type: 'googlePalmApi',
		};
		const slack: CredentialSummary = {
			id: 's1',
			name: 'Slack token',
			type: 'slackApi',
			description: null,
		};

		function makeContextWithStored(stored: CredentialSummary[]) {
			const context = createMockContext();
			(context.credentialService.list as Mock).mockImplementation((options?: { type?: string }) =>
				options?.type ? stored.filter((c) => c.type === options.type) : stored,
			);
			return context;
		}

		it('hints at stored LLM credentials when a filtered LLM-type lookup finds none', async () => {
			const context = makeContextWithStored([gemini, slack]);
			const tool = createListCredentialsTool(context);

			const result = await executeTool(tool, { type: 'openAiApi' }, noSuspendCtx());

			expect(result.credentials).toEqual([]);
			expect(result.hint).toContain('"Google Gemini account" (googlePalmApi, id: g1)');
		});

		it('does not hint when a stored credential of the requested type exists', async () => {
			const openAi: CredentialSummary = {
				id: 'o1',
				name: 'My OpenAI',
				type: 'openAiApi',
				description: null,
			};
			const context = makeContextWithStored([openAi, gemini]);
			const tool = createListCredentialsTool(context);

			const result = await executeTool(tool, { type: 'openAiApi' }, noSuspendCtx());

			expect(result.hint).toBeUndefined();
			expect(context.credentialService.list).toHaveBeenCalledTimes(1);
		});

		it('does not hint or re-list for an empty non-LLM type lookup', async () => {
			const context = makeContextWithStored([gemini]);
			const tool = createListCredentialsTool(context);

			const result = await executeTool(tool, { type: 'notionApi' }, noSuspendCtx());

			expect(result.hint).toBeUndefined();
			expect(context.credentialService.list).toHaveBeenCalledTimes(1);
		});

		it('still hints when the requested type only has the synthetic n8n Connect entry', async () => {
			const context = makeContextWithStored([gemini]);
			(
				context.credentialService as unknown as { isAiGatewayCredentialType: Mock }
			).isAiGatewayCredentialType = vi.fn().mockResolvedValue(true);
			const tool = createListCredentialsTool(context);

			const result = await executeTool(tool, { type: 'openAiApi' }, noSuspendCtx());

			expect(result.credentials).toEqual([
				expect.objectContaining({
					id: '__AI_GATEWAY_MANAGED__',
					type: 'openAiApi',
					__aiGatewayManaged: true,
				}),
			]);
			expect(result.hint).toContain('googlePalmApi');
		});

		it('returns the empty listing without a hint when the unfiltered lookup fails', async () => {
			const context = createMockContext();
			(context.credentialService.list as Mock).mockImplementation((options?: { type?: string }) => {
				if (!options?.type) throw new Error('boom');
				return [];
			});
			const tool = createListCredentialsTool(context);

			const result = await executeTool(tool, { type: 'openAiApi' }, noSuspendCtx());

			expect(result).toEqual({ credentials: [], total: 0, hasMore: false });
		});
	});

	// ── get ─────────────────────────────────────────────────────────────────

	describe('list action — ids', () => {
		it.each([null, undefined, 'x'.repeat(512)])(
			'returns the full description %j without secret data',
			async (description) => {
				const context = createMockContext();
				const credential = {
					id: '1',
					name: 'Postgres account',
					type: 'postgres',
					description,
					data: { password: 'test-secret' },
				};
				vi.mocked(context.credentialService.get).mockResolvedValue(credential);

				const result = await executeTool(
					createListCredentialsTool(context),
					{ ids: ['1'] },
					noSuspendCtx(),
				);

				expect(result).toEqual({
					credentials: [
						{
							id: '1',
							name: 'Postgres account',
							type: 'postgres',
							description: description ?? null,
						},
					],
				});
			},
		);

		it('should return node access and report ids that do not resolve', async () => {
			const detail: CredentialDetail = {
				id: '42',
				name: 'My Notion Key',
				type: 'notionApi',
				nodesWithAccess: [{ nodeType: 'n8n-nodes-base.notion' }],
				description: null,
			};
			const context = createMockContext();
			(context.credentialService.get as Mock).mockImplementation(async (id: string) => {
				if (id === '42') return detail;
				throw new Error('Credential not found');
			});

			const result = await executeTool(
				createListCredentialsTool(context),
				{ ids: ['42', 'missing'], type: 'slackApi' },
				noSuspendCtx(),
			);

			expect(context.credentialService.list).not.toHaveBeenCalled();
			expect(result).toEqual({ credentials: [detail], notFound: ['missing'] });
		});
	});

	// ── delete ──────────────────────────────────────────────────────────────

	describe('delete action', () => {
		it('should return denied when permission is blocked', async () => {
			const context = createMockContext({
				permissions: { deleteCredential: 'blocked' },
			});

			const tool = createDeleteCredentialTool(context);
			const result = await executeTool(tool, { credentialId: '1' }, noSuspendCtx());

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

			const tool = createDeleteCredentialTool(context);
			const result = await executeTool(tool, { credentialId: '1' }, noSuspendCtx());

			expect(context.credentialService.delete).toHaveBeenCalledWith('1');
			expect(result).toEqual({ success: true });
		});

		it('should reject a credential outside the thread project before asking for approval', async () => {
			const assertInThreadProject = vi.fn().mockRejectedValue(new OutsideThreadProjectError());
			const context = createMockContext({ assertInThreadProject });
			const suspendFn = vi.fn();

			const tool = createDeleteCredentialTool(context);
			await expect(
				executeTool(tool, { credentialId: 'cred-1' }, suspendCtx(suspendFn)),
			).rejects.toThrow(OutsideThreadProjectError);

			expect(assertInThreadProject).toHaveBeenCalledWith({ kind: 'credential', id: 'cred-1' });
			expect(suspendFn).not.toHaveBeenCalled();
			expect(context.credentialService.delete).not.toHaveBeenCalled();
		});

		it('should suspend for confirmation when permission needs approval', async () => {
			const context = createMockContext({
				permissions: { deleteCredential: 'require_approval' },
			});
			const suspendFn = vi.fn();

			const tool = createDeleteCredentialTool(context);
			await executeTool(
				tool,
				{ credentialId: '1', credentialName: 'My Cred' },
				suspendCtx(suspendFn),
			);

			expect(suspendFn).toHaveBeenCalledTimes(1);
			expect(suspendFn.mock.calls[0][0]).toEqual(
				expect.objectContaining({
					requestId: expect.any(String),
					message: 'Delete My Cred',
					severity: 'destructive',
				}),
			);
			expect(context.credentialService.delete).not.toHaveBeenCalled();
		});

		it('should use credentialId in message when credentialName is not provided', async () => {
			const context = createMockContext({
				permissions: { deleteCredential: 'require_approval' },
			});
			const suspendFn = vi.fn();

			const tool = createDeleteCredentialTool(context);
			await executeTool(tool, { credentialId: 'cred-99' }, suspendCtx(suspendFn));

			expect(suspendFn).toHaveBeenCalledTimes(1);
			expect(suspendFn.mock.calls[0][0]).toEqual(
				expect.objectContaining({
					message: 'Delete cred-99',
				}),
			);
		});

		it('should suspend by default when permissions are not explicitly set', async () => {
			const context = createMockContext({ permissions: {} });
			const suspendFn = vi.fn();

			const tool = createDeleteCredentialTool(context);
			await executeTool(tool, { credentialId: '1' }, suspendCtx(suspendFn));

			expect(suspendFn).toHaveBeenCalled();
			expect(context.credentialService.delete).not.toHaveBeenCalled();
		});

		it('should delete after user approves on resume', async () => {
			const context = createMockContext({
				permissions: { deleteCredential: 'require_approval' },
			});

			const tool = createDeleteCredentialTool(context);
			const result = await executeTool(tool, { credentialId: '1' }, resumeCtx({ approved: true }));

			expect(context.credentialService.delete).toHaveBeenCalledWith('1');
			expect(result).toEqual({ success: true });
		});

		it('should return denied when user denies on resume', async () => {
			const context = createMockContext({
				permissions: { deleteCredential: 'require_approval' },
			});

			const tool = createDeleteCredentialTool(context);
			const result = await executeTool(tool, { credentialId: '1' }, resumeCtx({ approved: false }));

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
			(context.credentialService.searchCredentialTypes as Mock).mockResolvedValue(searchResults);

			const tool = createSearchCredentialTypesTool(context);
			const result = await executeTool(tool, { query: 'slack' }, noSuspendCtx());

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
			(context.credentialService.searchCredentialTypes as Mock).mockResolvedValue(searchResults);

			const tool = createSearchCredentialTypesTool(context);
			const result = await executeTool(tool, { query: 'auth' }, noSuspendCtx());

			expect((result as { results: unknown[] }).results).toEqual([
				{ type: 'slackApi', displayName: 'Slack API' },
			]);
		});

		it('should return empty results when searchCredentialTypes is not available', async () => {
			const context = createMockContext();
			context.credentialService.searchCredentialTypes = undefined;

			const tool = createSearchCredentialTypesTool(context);
			const result = await executeTool(tool, { query: 'slack' }, noSuspendCtx());

			expect(result).toEqual({ results: [] });
		});

		it('should enumerate Gateway credits types when gatewayCreditsOnly is set, ignoring query', async () => {
			const context = createMockContext();
			context.credentialService.listAiGatewayCredentialTypes = vi
				.fn()
				.mockResolvedValue(['openAiApi', 'anthropicApi']);

			const tool = createSearchCredentialTypesTool(context);
			const result = await executeTool(tool, { gatewayCreditsOnly: true }, noSuspendCtx());

			expect(context.credentialService.listAiGatewayCredentialTypes).toHaveBeenCalled();
			expect(context.credentialService.searchCredentialTypes).not.toHaveBeenCalled();
			expect(result).toEqual({
				results: [
					{ type: 'openAiApi', gatewayCredits: true },
					{ type: 'anthropicApi', gatewayCredits: true },
				],
			});
		});

		it('should return empty results for gatewayCreditsOnly when the accessor is unavailable', async () => {
			const context = createMockContext();
			context.credentialService.listAiGatewayCredentialTypes = undefined;

			const tool = createSearchCredentialTypesTool(context);
			const result = await executeTool(tool, { gatewayCreditsOnly: true }, noSuspendCtx());

			expect(result).toEqual({ results: [] });
		});

		it('should error when query is omitted without gatewayCreditsOnly', async () => {
			const context = createMockContext();

			const tool = createSearchCredentialTypesTool(context);
			const result = await executeTool(tool, {}, noSuspendCtx());

			expect(context.credentialService.searchCredentialTypes).not.toHaveBeenCalled();
			expect(result).toMatchObject({ results: [], error: expect.stringContaining('query') });
		});
	});

	// ── setup ───────────────────────────────────────────────────────────────

	describe('setup action — setup panel announcement', () => {
		beforeEach(() => {
			vi.mocked(analyzeWorkflow).mockReset().mockResolvedValue([]);
			vi.mocked(prepareWorkflowSetup).mockReset();
		});

		function panelContext(overrides: Parameters<typeof createMockContext>[0] = {}) {
			const emitter = {
				emit: vi.fn(() => true),
				announce: vi.fn().mockResolvedValue(undefined),
				merge: vi.fn(() => true),
				lastWorkflowId: vi.fn<() => string | undefined>(() => undefined),
				workflowIds: vi.fn(() => []),
			};
			const context = createMockContext({
				setupItemsEmitter: emitter,
				logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } as never,
				...overrides,
			});
			return { context, emitter };
		}

		it('should accept an optional workflowId on setup', () => {
			const schema = getInputSchema(createSetupCredentialsTool(createMockContext()));
			expect(
				schema.safeParse({
					credentials: [{ credentialType: 'slackApi' }],
					workflowId: 'wf-1',
				}).success,
			).toBe(true);
		});

		it('exposes early setup fields only when the panel is enabled', () => {
			const control = inputJsonSchema(createSetupCredentialsTool(createMockContext()));
			const { context } = panelContext();
			const panel = inputJsonSchema(createSetupCredentialsTool(context));
			const withFolders = inputJsonSchema(
				createSetupCredentialsTool({
					...context,
					folderExplorationEnabled: true,
				}),
			);

			expect(control.properties).not.toHaveProperty('filePath');
			expect(control.properties).not.toHaveProperty('workflowName');
			expect(control.properties).not.toHaveProperty('folderPath');
			expect(panel.properties).toHaveProperty('filePath');
			expect(panel.properties).toHaveProperty('workflowName');
			expect(panel.properties).not.toHaveProperty('folderPath');
			expect(withFolders.properties).toHaveProperty('folderPath');
		});

		it.each([
			{ credentials: [{ credentialType: 'slackApi', preferNew: true }] },
			{ credentials: [] },
		])(
			'prepares source-bound setup without suspending for requirements %j',
			async ({ credentials }) => {
				const { context, emitter } = panelContext({ folderExplorationEnabled: true });
				const suspend = vi.fn();
				const prepared = {
					success: true,
					announced: true,
					preBuild: true,
					workflowId: 'wf-early',
					filePath: 'src/workflows/main.ts',
					message: 'Continue the build',
				};
				vi.mocked(prepareWorkflowSetup).mockResolvedValue(prepared);
				const input = {
					filePath: prepared.filePath,
					workflowName: 'Daily update',
					folderPath: 'Notifications',
					credentials,
				};
				const tool = createSetupCredentialsTool(context);

				expect(getInputSchema(tool).safeParse(input).success).toBe(true);
				const result = await executeTool(tool, input, suspendCtx(suspend));

				expect(result).toEqual(prepared);
				expect(prepareWorkflowSetup).toHaveBeenCalledWith(context, input);
				expect(suspend).not.toHaveBeenCalled();
				expect(emitter.merge).not.toHaveBeenCalled();
			},
		);

		it('does not report early setup as announced when persistence fails', async () => {
			const { context } = panelContext();
			const suspend = vi.fn();
			vi.mocked(prepareWorkflowSetup).mockRejectedValue(new Error('Could not persist setup'));

			const result = await executeTool(
				createSetupCredentialsTool(context),
				{
					filePath: 'src/workflows/main.ts',
					workflowName: 'Daily update',
					credentials: [{ credentialType: 'slackApi' }],
				},
				suspendCtx(suspend),
			);

			expect(result).toEqual({
				success: false,
				announced: false,
				message: 'Could not persist setup',
			});
			expect(suspend).not.toHaveBeenCalled();
		});

		it('validates registered credential types before creating early workflow context', async () => {
			const { context } = panelContext();
			context.credentialService.credentialTypeExists = vi.fn().mockResolvedValue(false);

			const result = await executeTool(
				createSetupCredentialsTool(context),
				{
					filePath: 'src/workflows/main.ts',
					workflowName: 'Daily update',
					credentials: [{ credentialType: 'slackApiTypo' }],
				},
				suspendCtx(),
			);

			expect(result).toMatchObject({ error: 'unknown_credential_type' });
			expect(prepareWorkflowSetup).not.toHaveBeenCalled();
		});

		it('should announce the credentials to the setup panel and return without suspending', async () => {
			const { context, emitter } = panelContext();
			(context.credentialService.list as Mock).mockResolvedValue([
				{ id: 'c1', name: 'Team Slack', type: 'slackApi' },
			]);
			const suspendFn = vi.fn();

			const result = await executeTool<{
				success: boolean;
				announced?: boolean;
				workflowId?: string;
				credentials?: Array<{ credentialType: string; existingCredentials: unknown[] }>;
				message: string;
			}>(
				createSetupCredentialsTool(context),
				{
					workflowId: 'wf-1',
					credentials: [{ credentialType: 'slackApi', reason: 'to post alerts' }],
				},
				suspendCtx(suspendFn),
			);

			expect(suspendFn).not.toHaveBeenCalled();
			expect(analyzeWorkflow).toHaveBeenCalledWith(context, 'wf-1', undefined, {
				includeSettled: true,
			});
			expect(emitter.merge).toHaveBeenCalledWith('wf-1', [
				{
					id: 'wf-1:credential:slackApi',
					kind: 'credential',
					credentialType: 'slackApi',
					reason: 'to post alerts',
				},
			]);
			expect(result).toMatchObject({
				success: true,
				announced: true,
				workflowId: 'wf-1',
				credentials: [
					{ credentialType: 'slackApi', existingCredentials: [{ id: 'c1', name: 'Team Slack' }] },
				],
			});
			expect(result.message).toContain('No card is open');
			expect(result.message).toContain('continue the build');
		});

		it('should fall back to the workflow this run last saved when no workflowId is passed', async () => {
			const { context, emitter } = panelContext();
			emitter.lastWorkflowId.mockReturnValue('wf-new');
			const suspendFn = vi.fn();

			await executeTool(
				createSetupCredentialsTool(context),
				{ credentials: [{ credentialType: 'slackApi' }] },
				suspendCtx(suspendFn),
			);

			expect(suspendFn).not.toHaveBeenCalled();
			expect(emitter.merge).toHaveBeenCalledWith('wf-new', [
				expect.objectContaining({ id: 'wf-new:credential:slackApi' }),
			]);
		});

		it('should keep the card for standalone setup outside any workflow context', async () => {
			const { context, emitter } = panelContext();
			const suspendFn = vi.fn();

			await executeTool(
				createSetupCredentialsTool(context),
				{ credentials: [{ credentialType: 'slackApi' }] },
				suspendCtx(suspendFn),
			);

			expect(emitter.merge).not.toHaveBeenCalled();
			expect(suspendFn).toHaveBeenCalledTimes(1);
		});

		it('should keep the card when the user explicitly asked to pick a credential', async () => {
			const { context, emitter } = panelContext();
			const suspendFn = vi.fn();

			await executeTool(
				createSetupCredentialsTool(context),
				{
					workflowId: 'wf-1',
					credentials: [{ credentialType: 'slackApi' }],
					requireUserSelection: true,
				},
				suspendCtx(suspendFn),
			);

			expect(emitter.merge).not.toHaveBeenCalled();
			expect(suspendFn).toHaveBeenCalledTimes(1);
			expect(suspendFn.mock.calls[0][0]).toEqual(
				expect.objectContaining({ requireUserSelection: true }),
			);
		});

		it('should announce against the saved workflow so generic auth types land on their node rows', async () => {
			const { context, emitter } = panelContext();
			vi.mocked(analyzeWorkflow).mockResolvedValue([
				{
					node: {
						id: 'n1',
						name: 'Fetch Acme',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 4,
						parameters: {},
						position: [0, 0],
					},
					credentialType: 'httpTemplatedCustomAuth',
					isTrigger: false,
					needsAction: true,
					credentialNeedsAction: true,
				} as SetupRequest,
			]);
			const setupHint = {
				template: { headers: { Authorization: 'Bearer {{api_key}}' } },
				placeholders: [{ name: 'api_key', title: 'API key' }],
			};

			await executeTool(
				createSetupCredentialsTool(context),
				{
					workflowId: 'wf-1',
					credentials: [{ credentialType: 'httpTemplatedCustomAuth', setupHint }],
				},
				suspendCtx(),
			);

			expect(emitter.merge).toHaveBeenCalledWith('wf-1', [
				expect.objectContaining({
					id: 'wf-1:credential:httpTemplatedCustomAuth:Fetch Acme',
					nodeBindings: [{ nodeName: 'Fetch Acme' }],
					setupHint,
				}),
			]);
		});

		it('should fall back to node-less rows when the workflow analysis fails', async () => {
			const { context, emitter } = panelContext();
			vi.mocked(analyzeWorkflow).mockRejectedValue(new Error('workflow gone'));

			const result = await executeTool<{ announced?: boolean }>(
				createSetupCredentialsTool(context),
				{
					workflowId: 'wf-1',
					credentials: [{ credentialType: 'slackApi' }],
				},
				suspendCtx(),
			);

			expect(result.announced).toBe(true);
			expect(emitter.merge).toHaveBeenCalledWith('wf-1', [
				expect.objectContaining({ id: 'wf-1:credential:slackApi' }),
			]);
			expect(context.logger.warn).toHaveBeenCalledWith(
				'Failed to announce setup-items, falling back to node-less rows',
				expect.objectContaining({ workflowId: 'wf-1', error: 'workflow gone' }),
			);
		});

		it('should not publish an empty snapshot when only generic auth types fall back', async () => {
			const { context, emitter } = panelContext();
			vi.mocked(analyzeWorkflow).mockRejectedValue(new Error('workflow gone'));

			const result = await executeTool<{ announced?: boolean }>(
				createSetupCredentialsTool(context),
				{
					workflowId: 'wf-1',
					credentials: [{ credentialType: 'httpTemplatedCustomAuth' }],
				},
				suspendCtx(),
			);

			expect(result.announced).toBe(true);
			expect(emitter.merge).not.toHaveBeenCalled();
		});

		it.each(['bound', 'unreadable'])('keeps the card for %s workflows', async (state) => {
			const { context, emitter } = panelContext();
			vi.mocked(analyzeWorkflow).mockResolvedValue([
				{
					node: {
						name: 'Slack',
						type: 'n8n-nodes-base.slack',
						typeVersion: 2,
						id: 'slack-node',
						position: [0, 0],
						parameters: {},
						credentials: { slackApi: { id: 'old-account', name: 'Old account' } },
					},
					credentialType: 'slackApi',
					needsAction: false,
					credentialNeedsAction: false,
					isTrigger: false,
				},
			]);
			if (state === 'unreadable') {
				vi.mocked(analyzeWorkflow).mockRejectedValue(new Error('workflow unavailable'));
			}
			const suspendFn = vi.fn();

			await executeTool(
				createSetupCredentialsTool(context),
				{
					workflowId: 'wf-1',
					credentials: [{ credentialType: 'slackApi', preferNew: true }],
				},
				suspendCtx(suspendFn),
			);

			expect(emitter.merge).not.toHaveBeenCalled();
			expect(suspendFn).toHaveBeenCalledTimes(1);
			expect(suspendFn.mock.calls[0][0]).toEqual(
				expect.objectContaining({
					credentialRequests: [
						expect.objectContaining({ credentialType: 'slackApi', preferNew: true }),
					],
				}),
			);
		});

		it('announces a first account requested through the credential tool without a card', async () => {
			const { context, emitter } = panelContext();
			const suspend = vi.fn();
			const result = await executeTool(
				createSetupCredentialsTool(context),
				{
					workflowId: 'wf-1',
					credentials: [{ credentialType: 'slackApi', preferNew: true }],
				},
				suspendCtx(suspend),
			);
			expect(result).toMatchObject({ success: true, announced: true });
			expect(suspend).not.toHaveBeenCalled();
			expect(emitter.merge).toHaveBeenCalledWith('wf-1', [
				expect.objectContaining({ credentialType: 'slackApi', preferNew: true }),
			]);
		});

		it('should still announce when the emitter fails', async () => {
			const { context, emitter } = panelContext();
			emitter.merge.mockImplementation(() => {
				throw new Error('bus down');
			});
			const suspendFn = vi.fn();

			const result = await executeTool<{ announced?: boolean }>(
				createSetupCredentialsTool(context),
				{
					workflowId: 'wf-1',
					credentials: [{ credentialType: 'slackApi' }],
				},
				suspendCtx(suspendFn),
			);

			expect(result.announced).toBe(true);
			expect(suspendFn).not.toHaveBeenCalled();
			expect(context.logger.warn).toHaveBeenCalledWith(
				'Failed to announce setup-items, falling back to node-less rows',
				expect.objectContaining({ workflowId: 'wf-1', error: 'bus down' }),
			);
		});

		it('should keep the card for the finalize stage', async () => {
			const { context, emitter } = panelContext();
			const suspendFn = vi.fn();

			await executeTool(
				createSetupCredentialsTool(context),
				{
					workflowId: 'wf-1',
					credentials: [{ credentialType: 'slackApi' }],
					credentialFlow: { stage: 'finalize' },
				},
				suspendCtx(suspendFn),
			);

			expect(emitter.merge).not.toHaveBeenCalled();
			expect(suspendFn).toHaveBeenCalledTimes(1);
		});

		it('should still validate credential types before announcing', async () => {
			const { context, emitter } = panelContext();
			context.credentialService.credentialTypeExists = vi.fn().mockResolvedValue(false);

			const result = await executeTool<{ error?: string }>(
				createSetupCredentialsTool(context),
				{
					workflowId: 'wf-1',
					credentials: [{ credentialType: 'slackApiTypo' }],
				},
				suspendCtx(),
			);

			expect(result.error).toBe('unknown_credential_type');
			expect(emitter.merge).not.toHaveBeenCalled();
		});

		it('should keep the card when a workflowId is passed but the setup panel is off', async () => {
			const context = createMockContext();
			const suspendFn = vi.fn();

			await executeTool(
				createSetupCredentialsTool(context),
				{
					workflowId: 'wf-1',
					credentials: [{ credentialType: 'slackApi' }],
				},
				suspendCtx(suspendFn),
			);

			expect(suspendFn).toHaveBeenCalledTimes(1);
		});
	});

	describe('setup action', () => {
		it('should return the Agent credential map for target agent', async () => {
			const context = createMockContext({
				agentBuilderTarget: { agentId: 'agent-1', projectId: 'project-1' },
			});
			(context.credentialService.list as Mock).mockResolvedValue([
				{ id: 'c1', name: 'Notion', type: 'notionApi' },
			]);
			const tool = createSetupCredentialsTool(context);

			const result = await executeTool(
				tool,
				{
					target: 'agent' as const,
					credentials: [{ credentialType: 'notionApi' }],
				},
				suspendCtx(),
			);

			expect(context.credentialService.list).toHaveBeenCalledWith({
				type: 'notionApi',
				projectId: 'project-1',
			});
			expect(result).toMatchObject({
				success: true,
				credentials: { notionApi: { id: 'c1', name: 'Notion' } },
			});
		});

		it('should suspend with credentialRequests on first call', async () => {
			const existingCreds: CredentialSummary[] = [
				{ id: 'c1', name: 'Existing Slack', type: 'slackApi' },
			];
			const context = createMockContext();
			(context.credentialService.list as Mock).mockResolvedValue(existingCreds);

			const suspendFn = vi.fn();
			const tool = createSetupCredentialsTool(context);
			await executeTool(
				tool,
				{
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
			expect(suspendFn.mock.calls[0][0]).not.toHaveProperty('requireUserSelection');
		});

		it('should propagate requireUserSelection when explicitly enabled', async () => {
			const context = createMockContext();
			const suspendFn = vi.fn();
			const tool = createSetupCredentialsTool(context);

			await executeTool(
				tool,
				{
					credentials: [{ credentialType: 'openRouterApi', reason: 'Set up a new account' }],
					requireUserSelection: true,
				},
				suspendCtx(suspendFn),
			);

			expect(suspendFn.mock.calls[0][0]).toEqual(
				expect.objectContaining({ requireUserSelection: true }),
			);
		});

		it('should omit requireUserSelection when explicitly disabled', async () => {
			const context = createMockContext();
			const suspendFn = vi.fn();
			const tool = createSetupCredentialsTool(context);

			await executeTool(
				tool,
				{
					credentials: [{ credentialType: 'slackApi', reason: 'Set up Slack' }],
					requireUserSelection: false,
				},
				suspendCtx(suspendFn),
			);

			expect(suspendFn.mock.calls[0][0]).not.toHaveProperty('requireUserSelection');
		});

		it('should include suggestedName in credentialRequests when provided', async () => {
			const context = createMockContext();
			(context.credentialService.list as Mock).mockResolvedValue([]);

			const suspendFn = vi.fn();
			const tool = createSetupCredentialsTool(context);
			await executeTool(
				tool,
				{
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

		it('should omit automatic test destinations from standalone setup', async () => {
			const context = createMockContext();
			(context.credentialService.list as Mock).mockResolvedValue([]);

			const setupHint = {
				template: { headers: { Authorization: 'Key {{api_key}}' } },
				placeholders: [
					{
						name: 'api_key',
						title: 'fal.ai API key',
						// a format-style info must pass the URL/domain-in-info validation
						info: 'Key ID and secret, separated by a colon',
						type: 'password' as const,
					},
				],
				docsUrl: 'https://fal.ai/dashboard/keys',
				suggestedName: 'fal.ai API Key',
				testUrl: 'https://fal.run/v1/models',
			};

			const suspendFn = vi.fn();
			const tool = createSetupCredentialsTool(context);
			await executeTool(
				tool,
				{
					credentials: [
						{
							credentialType: 'httpTemplatedCustomAuth',
							reason: 'For calling the fal.ai API',
							setupHint,
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
							setupHint: {
								template: setupHint.template,
								placeholders: setupHint.placeholders,
								docsUrl: setupHint.docsUrl,
								suggestedName: setupHint.suggestedName,
							},
						}),
					],
				}),
			);
		});

		it('should offer no existing credentials for Templated Custom Auth', async () => {
			const context = createMockContext();
			(context.credentialService.list as Mock).mockResolvedValue([
				{ id: 'cred-pexels', name: 'Pexels API', type: 'httpTemplatedCustomAuth' },
			]);

			const suspendFn = vi.fn();
			const tool = createSetupCredentialsTool(context);
			await executeTool(
				tool,
				{
					credentials: [
						{
							credentialType: 'httpTemplatedCustomAuth',
							reason: 'For calling the Apify API',
							setupHint: {
								template: { headers: { Authorization: 'Bearer {{api_token}}' } },
								placeholders: [{ name: 'api_token', title: 'API token' }],
							},
						},
					],
				},
				suspendCtx(suspendFn),
			);

			// This card has no node context to assert a candidate targets the same
			// service, so the shared type must not surface stored credentials at all.
			expect(context.credentialService.list).not.toHaveBeenCalled();
			expect(suspendFn.mock.calls[0][0]).toEqual(
				expect.objectContaining({
					credentialRequests: [expect.objectContaining({ existingCredentials: [] })],
				}),
			);
		});

		it('should reject a setupHint whose markers do not match its placeholders', async () => {
			const context = createMockContext();
			(context.credentialService.list as Mock).mockResolvedValue([]);

			const suspendFn = vi.fn();
			const tool = createSetupCredentialsTool(context);
			const result = await executeTool(
				tool,
				{
					credentials: [
						{
							credentialType: 'httpTemplatedCustomAuth',
							reason: 'For calling the fal.ai API',
							setupHint: {
								template: { headers: { Authorization: 'Key {{api_key}}' } },
								placeholders: [{ name: 'other_key', title: 'Other key' }],
							},
						},
					],
				},
				suspendCtx(suspendFn),
			);

			expect(suspendFn).not.toHaveBeenCalled();
			expect(result).toMatchObject({ error: 'invalid_setup_hint' });
		});

		it.each([
			['a URL', 'Find it at https://example.com/tokens'],
			// schemeless domains slip past a scheme-only check
			[
				'a schemeless domain',
				'Your Tavily API key (starts with tvly-). Get it from app.tavily.com/home.',
			],
		])('should reject a setupHint whose placeholder info mentions %s', async (_case, info) => {
			const context = createMockContext();
			(context.credentialService.list as Mock).mockResolvedValue([]);

			const suspendFn = vi.fn();
			const tool = createSetupCredentialsTool(context);
			const result = await executeTool(
				tool,
				{
					credentials: [
						{
							credentialType: 'httpTemplatedCustomAuth',
							setupHint: {
								template: { headers: { Authorization: 'Bearer {{api_key}}' } },
								placeholders: [{ name: 'api_key', title: 'API key', info }],
							},
						},
					],
				},
				suspendCtx(suspendFn),
			);

			expect(suspendFn).not.toHaveBeenCalled();
			expect(result).toMatchObject({ error: 'invalid_setup_hint' });
		});

		it('should reject a setupHint whose placeholders are all plain inputs', async () => {
			const context = createMockContext();
			(context.credentialService.list as Mock).mockResolvedValue([]);

			const suspendFn = vi.fn();
			const tool = createSetupCredentialsTool(context);
			const result = await executeTool(
				tool,
				{
					credentials: [
						{
							credentialType: 'httpTemplatedCustomAuth',
							setupHint: {
								template: { headers: { Authorization: 'Key {{api_key}}', 'X-Org': '{{org}}' } },
								placeholders: [
									{ name: 'api_key', title: 'API key', type: 'plain' as const },
									{ name: 'org', title: 'Organization', type: 'plain' as const },
								],
							},
						},
					],
				},
				suspendCtx(suspendFn),
			);

			expect(suspendFn).not.toHaveBeenCalled();
			expect(result).toMatchObject({ error: 'invalid_setup_hint' });
		});

		it('should reject a setupHint with a duplicate placeholder name', async () => {
			const context = createMockContext();
			(context.credentialService.list as Mock).mockResolvedValue([]);

			const suspendFn = vi.fn();
			const tool = createSetupCredentialsTool(context);
			const result = await executeTool(
				tool,
				{
					credentials: [
						{
							credentialType: 'httpTemplatedCustomAuth',
							setupHint: {
								template: { headers: { Authorization: 'Key {{api_key}}' } },
								// a masked def shadowed by a plain one for the same marker: the
								// form keeps the last (plain) def and shows the secret in clear
								placeholders: [
									{ name: 'api_key', title: 'API key', type: 'password' as const },
									{ name: 'api_key', title: 'API key', type: 'plain' as const },
								],
							},
						},
					],
				},
				suspendCtx(suspendFn),
			);

			expect(suspendFn).not.toHaveBeenCalled();
			expect(result).toMatchObject({ error: 'invalid_setup_hint' });
		});

		it('should reject a setupHint on a credential type other than Templated Custom Auth', async () => {
			const context = createMockContext();
			(context.credentialService.list as Mock).mockResolvedValue([]);

			const suspendFn = vi.fn();
			const tool = createSetupCredentialsTool(context);
			const result = await executeTool(
				tool,
				{
					credentials: [
						{
							credentialType: 'httpHeaderAuth',
							setupHint: {
								template: { headers: { Authorization: 'Key {{api_key}}' } },
								placeholders: [{ name: 'api_key', title: 'API key' }],
							},
						},
					],
				},
				suspendCtx(suspendFn),
			);

			expect(suspendFn).not.toHaveBeenCalled();
			expect(result).toMatchObject({ error: 'invalid_setup_hint' });
		});

		it('should use plural message for multiple credentials', async () => {
			const context = createMockContext();
			(context.credentialService.list as Mock).mockResolvedValue([]);

			const suspendFn = vi.fn();
			const tool = createSetupCredentialsTool(context);
			await executeTool(
				tool,
				{
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

		it("should include the thread's project in the suspend payload", async () => {
			const context = createMockContext({ projectId: 'proj-1' });
			(context.credentialService.list as Mock).mockResolvedValue([]);

			const suspendFn = vi.fn();
			const tool = createSetupCredentialsTool(context);
			await executeTool(
				tool,
				{
					credentials: [{ credentialType: 'slackApi' }],
				},
				suspendCtx(suspendFn),
			);

			expect(suspendFn).toHaveBeenCalledTimes(1);
			expect(suspendFn.mock.calls[0][0]).toEqual(expect.objectContaining({ projectId: 'proj-1' }));
		});

		it("should scope the credential lookup to the thread's project", async () => {
			const context = createMockContext({ projectId: 'proj-1' });
			(context.credentialService.list as Mock).mockResolvedValue([]);

			const tool = createSetupCredentialsTool(context);
			await tool.handler!(
				{
					credentials: [{ credentialType: 'slackApi' }],
				},
				suspendCtx(vi.fn()),
			);

			expect(context.credentialService.list).toHaveBeenCalledWith({
				type: 'slackApi',
				projectId: 'proj-1',
			});
		});

		it('should omit projectId from credential lookup when not provided', async () => {
			const context = createMockContext();
			(context.credentialService.list as Mock).mockResolvedValue([]);

			const tool = createSetupCredentialsTool(context);
			await tool.handler!(
				{
					credentials: [{ credentialType: 'slackApi' }],
				},
				suspendCtx(vi.fn()),
			);

			expect(context.credentialService.list).toHaveBeenCalledWith({ type: 'slackApi' });
		});

		it('should include credentialFlow in suspend payload for finalize stage', async () => {
			const context = createMockContext();
			(context.credentialService.list as Mock).mockResolvedValue([]);

			const suspendFn = vi.fn();
			const tool = createSetupCredentialsTool(context);
			await executeTool(
				tool,
				{
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

			const tool = createSetupCredentialsTool(context);
			const result = await executeTool(
				tool,
				{
					credentials: [{ credentialType: 'slackApi' }],
				},
				resumeCtx({ approved: true, credentials: { slackApi: 'cred-123' } }),
			);

			expect(result).toEqual({
				success: true,
				credentials: { slackApi: 'cred-123' },
				verified: true,
				selections: [
					{ credentialType: 'slackApi', credentialId: 'cred-123', connection: 'passed' },
				],
				message: expect.stringContaining('Credential setup is complete'),
			});
		});

		it('should tell the agent no authorization is needed once every selection passed', async () => {
			const context = createMockContext();

			const tool = createSetupCredentialsTool(context);
			const result = await executeTool(
				tool,
				{
					credentials: [{ credentialType: 'slackApi' }],
				},
				resumeCtx({ approved: true, credentials: { slackApi: 'cred-123' } }),
			);

			expect(result).toHaveProperty('message', expect.stringContaining('OAuth authorization'));
		});

		it('should not claim setup is complete when a selection fails its connection test', async () => {
			const context = createMockContext();
			(context.credentialService.test as Mock).mockResolvedValue({
				success: false,
				message: 'Invalid API Key',
			});

			const tool = createSetupCredentialsTool(context);
			const result = await executeTool(
				tool,
				{
					credentials: [{ credentialType: 'jsonToVideoApi' }],
				},
				resumeCtx({ approved: true, credentials: { jsonToVideoApi: 'cred-1' } }),
			);

			expect(result).toMatchObject({
				success: true,
				verified: false,
				selections: [
					{
						credentialType: 'jsonToVideoApi',
						credentialId: 'cred-1',
						connection: 'failed',
						connectionMessage: 'Invalid API Key',
					},
				],
			});
			expect(result).toHaveProperty('message', expect.stringContaining('Invalid API Key'));
			expect(result).toHaveProperty(
				'message',
				expect.not.stringContaining('Credential setup is complete'),
			);
			// The user very likely has to act on a credential that failed, so the message
			// must not repeat the verified path's "no user action is needed" note.
			expect(result).toHaveProperty('message', expect.not.stringContaining('OAuth authorization'));
		});

		it('should flag a selected credential that has no values filled in', async () => {
			const context = createMockContext();
			(context.credentialService.isTestable as Mock).mockResolvedValue(false);
			(context.credentialService.getCredentialFillState as Mock).mockResolvedValue('blank');

			const tool = createSetupCredentialsTool(context);
			const result = await executeTool(
				tool,
				{
					credentials: [{ credentialType: 'httpHeaderAuth' }],
				},
				resumeCtx({ approved: true, credentials: { httpHeaderAuth: 'cred-empty' } }),
			);

			expect(result).toMatchObject({
				success: true,
				verified: false,
				selections: [
					{
						credentialType: 'httpHeaderAuth',
						credentialId: 'cred-empty',
						connection: 'untested',
						hasNoValues: true,
					},
				],
			});
			expect(result).toHaveProperty('message', expect.stringContaining('no values filled in'));
			expect(context.credentialService.test).not.toHaveBeenCalled();
		});

		it('should report an untestable selection as unverified rather than ready to use', async () => {
			const context = createMockContext();
			(context.credentialService.isTestable as Mock).mockResolvedValue(false);
			(context.credentialService.getCredentialFillState as Mock).mockResolvedValue('filled');

			const tool = createSetupCredentialsTool(context);
			const result = await executeTool(
				tool,
				{
					credentials: [{ credentialType: 'httpHeaderAuth' }],
				},
				resumeCtx({ approved: true, credentials: { httpHeaderAuth: 'cred-other-service' } }),
			);

			expect(result).toMatchObject({
				success: true,
				verified: false,
				selections: [
					{
						credentialType: 'httpHeaderAuth',
						credentialId: 'cred-other-service',
						connection: 'untested',
					},
				],
			});
			expect(result).toHaveProperty('message', expect.stringContaining('could not be verified'));
			expect(result).toHaveProperty('message', expect.stringContaining('preferNew'));
			expect(result).toHaveProperty('message', expect.not.stringContaining('ready to use'));
		});

		it('should still connection-test when the testability lookup fails', async () => {
			const context = createMockContext();
			(context.credentialService.isTestable as Mock).mockRejectedValue(new Error('lookup failed'));

			const tool = createSetupCredentialsTool(context);
			const result = await executeTool(
				tool,
				{
					credentials: [{ credentialType: 'slackApi' }],
				},
				resumeCtx({ approved: true, credentials: { slackApi: 'cred-1' } }),
			);

			expect(context.credentialService.test).toHaveBeenCalledWith('cred-1');
			expect(result).toMatchObject({
				verified: true,
				selections: [{ credentialType: 'slackApi', credentialId: 'cred-1', connection: 'passed' }],
			});
		});

		it('should report an untested selection without a verdict when the fill-state lookup fails', async () => {
			const context = createMockContext();
			(context.credentialService.isTestable as Mock).mockResolvedValue(false);
			(context.credentialService.getCredentialFillState as Mock).mockRejectedValue(
				new Error('decrypt failed'),
			);

			const tool = createSetupCredentialsTool(context);
			const result = await executeTool(
				tool,
				{
					credentials: [{ credentialType: 'httpHeaderAuth' }],
				},
				resumeCtx({ approved: true, credentials: { httpHeaderAuth: 'cred-1' } }),
			);

			expect(result).toMatchObject({
				verified: false,
				selections: [
					{ credentialType: 'httpHeaderAuth', credentialId: 'cred-1', connection: 'untested' },
				],
			});
			expect(result).toHaveProperty(
				'selections',
				expect.not.arrayContaining([expect.objectContaining({ hasNoValues: true })]),
			);
		});

		it('should report an untested selection when the host cannot judge fill state at all', async () => {
			const context = createMockContext();
			(context.credentialService.isTestable as Mock).mockResolvedValue(false);
			// A host that never wired the capability — the tool must not throw on it.
			delete (context.credentialService as { getCredentialFillState?: unknown })
				.getCredentialFillState;

			const tool = createSetupCredentialsTool(context);
			const result = await executeTool(
				tool,
				{
					credentials: [{ credentialType: 'httpHeaderAuth' }],
				},
				resumeCtx({ approved: true, credentials: { httpHeaderAuth: 'cred-1' } }),
			);

			expect(result).toMatchObject({
				verified: false,
				selections: [
					{ credentialType: 'httpHeaderAuth', credentialId: 'cred-1', connection: 'untested' },
				],
			});
		});

		it('should treat a failing connection test call as a failed selection', async () => {
			const context = createMockContext();
			(context.credentialService.test as Mock).mockRejectedValue(new Error('socket hang up'));

			const tool = createSetupCredentialsTool(context);
			const result = await executeTool(
				tool,
				{
					credentials: [{ credentialType: 'slackApi' }],
				},
				resumeCtx({ approved: true, credentials: { slackApi: 'cred-1' } }),
			);

			expect(result).toMatchObject({
				verified: false,
				selections: [
					{
						credentialType: 'slackApi',
						credentialId: 'cred-1',
						connection: 'failed',
						connectionMessage: 'socket hang up',
					},
				],
			});
		});

		it('should report each selection separately when several types are set up at once', async () => {
			const context = createMockContext();
			// Selections are verified in the order of the resume map, so slackApi is asked first.
			(context.credentialService.isTestable as Mock)
				.mockResolvedValueOnce(true)
				.mockResolvedValueOnce(false);
			(context.credentialService.getCredentialFillState as Mock).mockResolvedValue('filled');

			const tool = createSetupCredentialsTool(context);
			const result = await executeTool(
				tool,
				{
					credentials: [{ credentialType: 'slackApi' }, { credentialType: 'httpHeaderAuth' }],
				},
				resumeCtx({
					approved: true,
					credentials: { slackApi: 'cred-1', httpHeaderAuth: 'cred-2' },
				}),
			);

			expect(result).toMatchObject({
				verified: false,
				selections: [
					{ credentialType: 'slackApi', credentialId: 'cred-1', connection: 'passed' },
					{ credentialType: 'httpHeaderAuth', credentialId: 'cred-2', connection: 'untested' },
				],
			});
		});

		it('should not claim credentials are ready when approved with no selections', async () => {
			const context = createMockContext();

			const tool = createSetupCredentialsTool(context);
			const result = await executeTool(
				tool,
				{
					credentials: [{ credentialType: 'slackApi' }],
				},
				resumeCtx({ approved: true, credentials: {} }),
			);

			expect(result).toEqual({
				success: true,
				credentials: {},
				message: expect.stringContaining('without any credential selected'),
			});
		});

		it('should return deferred when user does not approve (skips)', async () => {
			const context = createMockContext();

			const tool = createSetupCredentialsTool(context);
			const result = await executeTool(
				tool,
				{
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
			(context.credentialService.getDocumentationUrl as Mock).mockResolvedValue(
				'https://docs.example.com/slack',
			);
			(context.credentialService.getCredentialFields as Mock).mockResolvedValue([
				{ name: 'apiKey', displayName: 'API Key', type: 'string', required: true },
			]);

			const tool = createSetupCredentialsTool(context);
			const result = await executeTool(
				tool,
				{
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

		it('should mark browser credential setup pending when autoSetup is present', async () => {
			const context = createMockContext();
			const markPending = vi.fn();
			context.browserCredentialSetup = {
				markPending,
				markCreated: vi.fn(),
				markCreateFailed: vi.fn(),
			};

			const tool = createSetupCredentialsTool(context);
			await executeTool(
				tool,
				{
					credentials: [{ credentialType: 'slackApi' }],
				},
				resumeCtx({
					approved: true,
					autoSetup: { credentialType: 'slackApi', attemptId: 'attempt-1' },
				}),
			);

			expect(markPending).toHaveBeenCalledWith('slackApi', 'attempt-1');
		});

		it('should handle autoSetup when getDocumentationUrl is not available', async () => {
			const context = createMockContext();
			context.credentialService.getDocumentationUrl = undefined;
			context.credentialService.getCredentialFields = undefined;

			const tool = createSetupCredentialsTool(context);
			const result = await executeTool(
				tool,
				{
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

		it('should reject a call without credentials', async () => {
			const context = createMockContext();
			const suspendFn = vi.fn();

			const tool = createSetupCredentialsTool(context);
			await expect(
				tool.handler!({ credentialFlow: { stage: 'finalize' } }, suspendCtx(suspendFn)),
			).rejects.toThrow();

			expect(suspendFn).not.toHaveBeenCalled();
			expect(context.credentialService.list).not.toHaveBeenCalled();
		});

		it('should return missing_credentials error when credentials is an empty array', async () => {
			const context = createMockContext();
			const suspendFn = vi.fn();

			const tool = createSetupCredentialsTool(context);
			const result = await tool.handler!({ credentials: [] }, suspendCtx(suspendFn));

			expect(result).toEqual({
				error: 'missing_credentials',
				message: expect.stringContaining('credentials'),
			});
			expect(suspendFn).not.toHaveBeenCalled();
		});

		it('should default reason when not provided in credential requests', async () => {
			const context = createMockContext();
			(context.credentialService.list as Mock).mockResolvedValue([]);

			const suspendFn = vi.fn();
			const tool = createSetupCredentialsTool(context);
			await executeTool(
				tool,
				{
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

		describe('credential type validation', () => {
			function createValidatingContext(existingTypes: string[]) {
				const context = createMockContext();
				context.credentialService.credentialTypeExists = vi
					.fn()
					.mockImplementation(
						async (type: string) => await Promise.resolve(existingTypes.includes(type)),
					);
				return context;
			}

			it('should return unknown_credential_type with suggestions instead of suspending', async () => {
				const context = createValidatingContext(['gmailOAuth2']);
				(context.credentialService.searchCredentialTypes as Mock).mockImplementation(
					async (query: string) =>
						await Promise.resolve(
							query === 'gmail' ? [{ type: 'gmailOAuth2', displayName: 'Gmail OAuth2 API' }] : [],
						),
				);

				const suspendFn = vi.fn();
				const tool = createSetupCredentialsTool(context);
				const result = await executeTool(
					tool,
					{
						credentials: [{ credentialType: 'gmailOAuth2Api', reason: 'Send email' }],
					},
					suspendCtx(suspendFn),
				);

				expect(suspendFn).not.toHaveBeenCalled();
				expect(result).toEqual({
					error: 'unknown_credential_type',
					message: expect.stringContaining('"gmailOAuth2Api"'),
					suggestions: {
						gmailOAuth2Api: [{ type: 'gmailOAuth2', displayName: 'Gmail OAuth2 API' }],
					},
				});
				// The exact name is tried before falling back to the service prefix.
				expect(context.credentialService.searchCredentialTypes).toHaveBeenNthCalledWith(
					1,
					'gmailOAuth2Api',
				);
				expect(context.credentialService.searchCredentialTypes).toHaveBeenNthCalledWith(2, 'gmail');
			});

			it('should omit suggestions when no near-match is found', async () => {
				const context = createValidatingContext([]);

				const tool = createSetupCredentialsTool(context);
				const result = await executeTool(
					tool,
					{
						credentials: [{ credentialType: 'noSuchThingApi' }],
					},
					suspendCtx(),
				);

				expect(result).toEqual({
					error: 'unknown_credential_type',
					message: expect.stringContaining('"noSuchThingApi"'),
				});
			});

			it('should list only the unknown types when known and unknown are mixed', async () => {
				const context = createValidatingContext(['slackApi']);

				const result = await executeTool(
					createSetupCredentialsTool(context),
					{
						credentials: [{ credentialType: 'slackApi' }, { credentialType: 'gmailOAuth2Api' }],
					},
					suspendCtx(),
				);

				expect(result).toMatchObject({ error: 'unknown_credential_type' });
				expect((result as { message: string }).message).not.toContain('"slackApi"');
				expect((result as { message: string }).message).toContain('"gmailOAuth2Api"');
			});

			it('should suspend normally when every requested type exists', async () => {
				const context = createValidatingContext(['slackApi']);

				const suspendFn = vi.fn();
				await executeTool(
					createSetupCredentialsTool(context),
					{
						credentials: [{ credentialType: 'slackApi', reason: 'Send messages' }],
					},
					suspendCtx(suspendFn),
				);

				expect(suspendFn).toHaveBeenCalledTimes(1);
			});

			it('should not look up the templated custom auth type', async () => {
				const context = createValidatingContext([]);

				const suspendFn = vi.fn();
				await executeTool(
					createSetupCredentialsTool(context),
					{
						credentials: [{ credentialType: 'httpTemplatedCustomAuth', reason: 'Custom API' }],
					},
					suspendCtx(suspendFn),
				);

				expect(context.credentialService.credentialTypeExists).not.toHaveBeenCalled();
				expect(suspendFn).toHaveBeenCalledTimes(1);
			});

			it('should treat a failing existence lookup as known and proceed', async () => {
				const context = createMockContext();
				context.credentialService.credentialTypeExists = vi
					.fn()
					.mockRejectedValue(new Error('registry unavailable'));

				const suspendFn = vi.fn();
				await executeTool(
					createSetupCredentialsTool(context),
					{
						credentials: [{ credentialType: 'slackApi' }],
					},
					suspendCtx(suspendFn),
				);

				expect(suspendFn).toHaveBeenCalledTimes(1);
			});
		});
	});

	// ── test ────────────────────────────────────────────────────────────────

	describe('test action', () => {
		it('should call credentialService.test and return result', async () => {
			const context = createMockContext();
			(context.credentialService.test as Mock).mockResolvedValue({
				success: true,
				message: 'Connection successful',
			});

			const tool = createTestCredentialTool(context);
			const result = await executeTool(tool, { credentialId: '42' }, noSuspendCtx());

			expect(context.credentialService.test).toHaveBeenCalledWith('42');
			expect(result).toEqual({ success: true, message: 'Connection successful' });
		});

		it('should handle errors from credentialService.test', async () => {
			const context = createMockContext();
			(context.credentialService.test as Mock).mockRejectedValue(new Error('Connection refused'));

			const tool = createTestCredentialTool(context);
			const result = await executeTool(tool, { credentialId: '42' }, noSuspendCtx());

			expect(result).toEqual({
				success: false,
				message: 'Connection refused',
			});
		});

		it('should handle non-Error throws from credentialService.test', async () => {
			const context = createMockContext();
			(context.credentialService.test as Mock).mockRejectedValue('string error');

			const tool = createTestCredentialTool(context);
			const result = await executeTool(tool, { credentialId: '42' }, noSuspendCtx());

			expect(result).toEqual({
				success: false,
				message: 'Credential test failed',
			});
		});
	});
});
