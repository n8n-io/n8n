import { zodToJsonSchema } from '@n8n/agents';
import {
	buildCredentialDestinationGrantKey,
	type InstanceAiCredentialSetupHint,
	type InstanceAiPermissions,
} from '@n8n/api-types';
import { generateWorkflowCode } from '@n8n/workflow-sdk';
import type { Mock } from 'vitest';

import { executeTool } from '../../__tests__/tool-test-utils';
import { WorkflowEditorLockedError } from '../../errors/workflow-editor-locked.error';
import { WorkflowSaveConflictError } from '../../errors/workflow-save-conflict.error';
import type { InstanceAiContext } from '../../types';
import {
	analyzeWorkflow,
	applyNodeChanges,
	buildCompletedReport,
} from '../workflows/setup-workflow.service';
import { FULL_PAYLOAD_TOO_LARGE_NOTE, STRUCTURE_ONLY_NOTE } from '../workflows/summarize-workflow';
import {
	getWorkflowSourceFileBinding,
	refreshWorkflowSourceFileBindingFromSave,
	saveWorkflowSourceFileBinding,
} from '../workflows/workflow-file-bindings';
import { createWorkflowsTool, type WorkflowAction, workflowsResumeSchema } from '../workflows.tool';

// Mock the setup-workflow.service module to avoid pulling in heavy dependencies
vi.mock('../workflows/setup-workflow.service', () => ({
	analyzeWorkflow: vi.fn().mockResolvedValue([]),
	applyCredentialHints: vi.fn(),
	applyNodeCredentials: vi.fn().mockResolvedValue({ failed: [] }),
	applyNodeParameters: vi.fn().mockResolvedValue({ failed: [] }),
	applyNodeChanges: vi.fn().mockResolvedValue({ applied: [], failed: [] }),
	buildCompletedReport: vi.fn().mockReturnValue([]),
}));

// Mock code generation used by get-as-code while keeping shared SDK helpers real.
vi.mock('@n8n/workflow-sdk', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@n8n/workflow-sdk')>();
	return {
		...actual,
		generateWorkflowCode: vi.fn().mockReturnValue('// generated code'),
	};
});

const emptyList = { workflows: [], total: 0, totalInScope: 0 };

function templatedSetupFixture(
	options: {
		nodeUrl?: string;
		testUrl?: string;
		serviceOrigin?: string | null;
	} = {},
) {
	const nodeUrl = options.nodeUrl ?? 'https://api.example.com/v1/account';
	const serviceOrigin =
		options.serviceOrigin === undefined ? 'https://api.example.com' : options.serviceOrigin;
	const recipe: InstanceAiCredentialSetupHint = {
		template: { headers: { Authorization: 'Bearer {{api_key}}' } },
		placeholders: [{ name: 'api_key', title: 'API key' }],
		...(options.testUrl ? { testUrl: options.testUrl } : {}),
	};
	const request = {
		node: {
			name: 'Fetch account',
			type: 'n8n-nodes-base.httpRequest',
			parameters: { url: nodeUrl },
		},
		credentialType: 'httpTemplatedCustomAuth',
		needsAction: true,
		setupHint: {
			...recipe,
			...(serviceOrigin ? { serviceHost: new URL(serviceOrigin).hostname, serviceOrigin } : {}),
		},
	};
	return {
		recipe,
		request,
		input: {
			action: 'setup' as const,
			workflowId: 'wf1',
			credentialHints: [{ ...recipe, nodeName: request.node.name }],
		},
	};
}

function createMockContext(
	overrides: Partial<Omit<InstanceAiContext, 'permissions'>> & {
		permissions?: Partial<InstanceAiPermissions>;
	} = {},
): InstanceAiContext {
	return {
		userId: 'user-1',
		workflowService: {
			list: vi.fn().mockResolvedValue(emptyList),
			get: vi.fn().mockResolvedValue({
				id: 'wf1',
				name: 'Test WF',
				versionId: 'v1',
				activeVersionId: null,
				isArchived: false,
				createdAt: '2024-01-01',
				updatedAt: '2024-01-01',
				nodes: [],
				connections: {},
			}),
			getAsWorkflowJSON: vi.fn().mockResolvedValue({
				name: 'Test WF',
				nodes: [],
				connections: {},
			}),
			getPinnedDataSummary: vi.fn().mockResolvedValue([]),
			createFromWorkflowJSON: vi.fn(),
			updateFromWorkflowJSON: vi.fn(),
			archive: vi.fn(),
			unarchive: vi.fn(),
			publish: vi.fn().mockResolvedValue({ activeVersionId: 'v1' }),
			unpublish: vi.fn(),
		},
		executionService: {
			list: vi.fn(),
			run: vi.fn(),
			getStatus: vi.fn(),
			getResult: vi.fn(),
			stop: vi.fn(),
			getDebugInfo: vi.fn(),
			getNodeOutput: vi.fn(),
		},
		credentialService: {
			list: vi.fn(),
			get: vi.fn(),
			delete: vi.fn(),
			test: vi.fn(),
		},
		nodeService: {
			listAvailable: vi.fn(),
			getDescription: vi.fn(),
			listSearchable: vi.fn(),
		},
		dataTableService: {
			list: vi.fn(),
			create: vi.fn(),
			delete: vi.fn(),
			getSchema: vi.fn(),
			addColumn: vi.fn(),
			deleteColumn: vi.fn(),
			renameColumn: vi.fn(),
			queryRows: vi.fn(),
			insertRows: vi.fn(),
			updateRows: vi.fn(),
			deleteRows: vi.fn(),
		},
		permissions: {},
		...overrides,
	} as unknown as InstanceAiContext;
}

type SafeParseResult = { success: true; data: unknown } | { success: false; error: unknown };

function getInputSchema(tool: unknown): { safeParse: (input: unknown) => SafeParseResult } {
	return (tool as { inputSchema: { safeParse: (input: unknown) => SafeParseResult } }).inputSchema;
}

function getDescription(tool: unknown): string {
	return (tool as { description: string }).description;
}

/** Parse through the tool's real input schema, so assertions see what the handler would get —
 *  zod strips fields the schema does not declare rather than rejecting them. */
function parseInput(tool: unknown, input: unknown): Record<string, unknown> {
	const schema = (tool as { inputSchema: { parse: (input: unknown) => Record<string, unknown> } })
		.inputSchema;
	return schema.parse(input);
}

describe('workflows tool', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('exports the resume schema without unsupported URI formats', () => {
		expect(JSON.stringify(zodToJsonSchema(workflowsResumeSchema))).not.toContain('"format":"uri"');
	});

	describe('surface filtering', () => {
		const builderWorkflowActions = [
			'list',
			'get',
			'get-json',
		] as const satisfies readonly WorkflowAction[];

		it('should support get-as-code on full surface', async () => {
			const context = createMockContext();
			const tool = createWorkflowsTool(context, 'full');

			const result = await executeTool(
				tool,
				{ action: 'get-as-code', workflowId: 'w1' } as never,
				{} as never,
			);

			expect(result).toEqual({
				workflowId: 'w1',
				name: 'Test WF',
				nodeCount: 0,
				nodes: [],
				code: '// generated code',
			});
		});

		it('should describe only explicitly allowed actions', () => {
			const context = createMockContext();
			const tool = createWorkflowsTool(context, {
				allowedActions: builderWorkflowActions,
				descriptionPrefix: 'Inspect workflows during build',
			});

			expect(getDescription(tool)).toContain('Inspect workflows during build');
			expect(getDescription(tool)).not.toContain('set up');
			expect(getDescription(tool)).not.toContain('publish');
			expect(getDescription(tool)).not.toContain('archive');
		});

		it.each([
			[{ action: 'list' }],
			[{ action: 'get', workflowId: 'w1' }],
			[{ action: 'get-json', workflowId: 'w1' }],
		])('should support explicitly allowed action %p', (input) => {
			const context = createMockContext();
			const tool = createWorkflowsTool(context, {
				allowedActions: builderWorkflowActions,
			});
			const schema = getInputSchema(tool);

			expect(schema.safeParse(input).success).toBe(true);
		});

		it.each([
			[{ action: 'setup', workflowId: 'w1' }],
			[{ action: 'publish', workflowId: 'w1' }],
			[{ action: 'unpublish', workflowId: 'w1' }],
			[{ action: 'delete', workflowId: 'w1' }],
			[{ action: 'unarchive', workflowId: 'w1' }],
			[{ action: 'get-as-code', workflowId: 'w1' }],
			[
				{
					action: 'update',
					workflowId: 'w1',
					workflow: { name: 'WF', nodes: [], connections: {} },
				},
			],
			[{ action: 'list-versions', workflowId: 'w1' }],
			[{ action: 'restore-version', workflowId: 'w1', versionId: 'v1' }],
			[{ action: 'update-version', workflowId: 'w1', versionId: 'v1', name: 'v1' }],
		])('should reject action %p when it is not explicitly allowed', (input) => {
			const context = createMockContext();
			context.workflowService.listVersions = vi.fn();
			context.workflowService.getVersion = vi.fn();
			context.workflowService.restoreVersion = vi.fn();
			context.workflowService.updateVersion = vi.fn();
			const tool = createWorkflowsTool(context, {
				allowedActions: builderWorkflowActions,
			});
			const schema = getInputSchema(tool);

			expect(schema.safeParse(input).success).toBe(false);
		});

		it('should reject builder-disallowed publish at the schema boundary', () => {
			const context = createMockContext();
			const tool = createWorkflowsTool(context, {
				allowedActions: builderWorkflowActions,
			});
			const schema = getInputSchema(tool);

			expect(schema.safeParse({ action: 'publish', workflowId: 'w1' }).success).toBe(false);
			expect(context.workflowService.publish).not.toHaveBeenCalled();
		});

		it('should allow code inspection but reject raw workflow actions on orchestrator surface', () => {
			const context = createMockContext();
			const tool = createWorkflowsTool(context, 'orchestrator');
			const schema = getInputSchema(tool);

			expect(schema.safeParse({ action: 'get-json', workflowId: 'w1' }).success).toBe(false);
			expect(schema.safeParse({ action: 'get-as-code', workflowId: 'w1' }).success).toBe(true);
			expect(
				schema.safeParse({
					action: 'update',
					workflowId: 'w1',
					workflow: { name: 'WF', nodes: [], connections: {} },
				}).success,
			).toBe(false);
			expect(getDescription(tool)).toContain('TypeScript SDK code');
			expect(getDescription(tool)).not.toContain('WorkflowJSON');
		});
	});

	describe('version actions', () => {
		it('should support version actions when listVersions exists', async () => {
			const context = createMockContext();
			const versions = [{ id: 'v1', versionId: 1 }];
			context.workflowService.listVersions = vi.fn().mockResolvedValue(versions);
			context.workflowService.getVersion = vi.fn();
			context.workflowService.restoreVersion = vi.fn();

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(
				tool,
				{ action: 'list-versions', workflowId: 'w1' } as never,
				{} as never,
			);

			expect(result).toEqual({ versions });
		});

		it('should support update-version when updateVersion exists', async () => {
			const context = createMockContext({
				permissions: { updateWorkflow: 'always_allow' },
			});
			context.workflowService.listVersions = vi.fn();
			context.workflowService.getVersion = vi.fn();
			context.workflowService.restoreVersion = vi.fn();
			context.workflowService.updateVersion = vi.fn().mockResolvedValue({ success: true });

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(
				tool,
				{
					action: 'update-version',
					workflowId: 'w1',
					versionId: '1',
					name: 'v1',
				} as never,
				{} as never,
			);

			expect(result).toEqual({ success: true });
		});

		it('should block update-version when updateWorkflow permission is blocked', async () => {
			const context = createMockContext({
				permissions: { updateWorkflow: 'blocked' },
			});
			context.workflowService.updateVersion = vi.fn();

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(
				tool,
				{
					action: 'update-version',
					workflowId: 'w1',
					versionId: '1',
					name: 'v1',
				} as never,
				{} as never,
			);

			expect(result).toEqual({
				success: false,
				denied: true,
				reason: 'Action blocked by admin',
			});
			expect(context.workflowService.updateVersion).not.toHaveBeenCalled();
		});

		it('should suspend update-version for approval by default', async () => {
			const context = createMockContext();
			context.workflowService.updateVersion = vi.fn();
			const suspend = vi.fn();

			const tool = createWorkflowsTool(context, 'full');
			await executeTool(
				tool,
				{
					action: 'update-version',
					workflowId: 'w1',
					versionId: '1',
					name: 'v1',
					description: null,
				} as never,
				{ suspend, resumeData: undefined } as never,
			);

			expect(suspend).toHaveBeenCalledWith(
				expect.objectContaining({
					message: 'Update version 1 — set name to "v1", description to (cleared)',
					severity: 'info',
				}),
			);
			expect(context.workflowService.updateVersion).not.toHaveBeenCalled();
		});

		it('should update-version when approval resumes approved', async () => {
			const context = createMockContext();
			context.workflowService.updateVersion = vi.fn().mockResolvedValue({ success: true });

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(
				tool,
				{
					action: 'update-version',
					workflowId: 'w1',
					versionId: '1',
					name: 'v1',
				} as never,
				{ resumeData: { approved: true } } as never,
			);

			expect(result).toEqual({ success: true });
			expect(context.workflowService.updateVersion).toHaveBeenCalledWith('w1', '1', {
				name: 'v1',
				description: undefined,
			});
		});

		it('should not update-version when approval resumes denied', async () => {
			const context = createMockContext();
			context.workflowService.updateVersion = vi.fn();

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(
				tool,
				{
					action: 'update-version',
					workflowId: 'w1',
					versionId: '1',
					name: 'v1',
				} as never,
				{ resumeData: { approved: false } } as never,
			);

			expect(result).toEqual({
				success: false,
				denied: true,
				reason: 'User denied the action',
			});
			expect(context.workflowService.updateVersion).not.toHaveBeenCalled();
		});
	});

	describe('list action', () => {
		it('should call workflowService.list with options', async () => {
			const workflows = [
				{
					id: 'wf1',
					name: 'Test Workflow',
					versionId: 'v1',
					activeVersionId: null,
					isArchived: false,
					createdAt: '2024-01-01',
					updatedAt: '2024-01-01',
				},
			];
			const context = createMockContext();
			(context.workflowService.list as Mock).mockResolvedValue({
				workflows,
				total: 1,
				totalInScope: 1,
			});

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(
				tool,
				{ action: 'list', query: 'test', limit: 10 },
				{} as never,
			);

			expect(context.workflowService.list).toHaveBeenCalledWith({ limit: 10, query: 'test' });
			expect(result).toEqual({ workflows, total: 1, totalInScope: 1 });
		});

		it('should pass archived status when listing archived workflows', async () => {
			const context = createMockContext();
			(context.workflowService.list as Mock).mockResolvedValue(emptyList);

			const tool = createWorkflowsTool(context, 'full');
			await executeTool(tool, { action: 'list', status: 'archived' }, {} as never);

			expect(context.workflowService.list).toHaveBeenCalledWith({ status: 'archived' });
		});

		it('should pass all status when listing all workflows', async () => {
			const context = createMockContext();
			(context.workflowService.list as Mock).mockResolvedValue(emptyList);

			const tool = createWorkflowsTool(context, 'full');
			await executeTool(tool, { action: 'list', status: 'all' }, {} as never);

			expect(context.workflowService.list).toHaveBeenCalledWith({ status: 'all' });
		});

		it('warns that a name filter hid workflows in scope', async () => {
			const context = createMockContext();
			(context.workflowService.list as Mock).mockResolvedValue({
				workflows: [
					{
						id: 'wf1',
						name: 'PRD Per-Page Action',
						versionId: 'v1',
						activeVersionId: null,
						isArchived: false,
						createdAt: '2024-01-01',
						updatedAt: '2024-01-01',
					},
				],
				total: 1,
				totalInScope: 3,
			});

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool<{
				total: number;
				totalInScope: number;
				note: string;
			}>(tool, { action: 'list', query: 'PRD' }, {} as never);

			expect(result.total).toBe(1);
			expect(result.totalInScope).toBe(3);
			expect(result.note).toContain('matched 1 of 3 workflows in scope');
			expect(result.note).toContain('2 are hidden');
		});

		it('warns when the limit truncated the result', async () => {
			const context = createMockContext();
			(context.workflowService.list as Mock).mockResolvedValue({
				workflows: [
					{
						id: 'wf1',
						name: 'Trigger',
						versionId: 'v1',
						activeVersionId: null,
						isArchived: false,
						createdAt: '2024-01-01',
						updatedAt: '2024-01-01',
					},
				],
				total: 12,
				totalInScope: 12,
			});

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool<{ note: string }>(
				tool,
				{ action: 'list', limit: 1 },
				{} as never,
			);

			expect(result.note).toContain('Showing 1 of 12 matching workflows');
		});

		it('targets one project when given a projectId', async () => {
			const context = createMockContext();
			(context.workflowService.list as Mock).mockResolvedValue(emptyList);

			const tool = createWorkflowsTool(context, 'full');
			await executeTool(tool, { action: 'list', projectId: 'other-project' }, {} as never);

			expect(context.workflowService.list).toHaveBeenCalledWith({
				projectId: 'other-project',
			});
		});

		it('tells the caller to read project membership per workflow, not by subtracting counts', async () => {
			const context = createMockContext();
			(context.workflowService.list as Mock).mockResolvedValue({
				workflows: [
					{
						id: 'wf1',
						name: 'My workflow',
						versionId: 'v1',
						activeVersionId: null,
						isArchived: false,
						createdAt: '2024-01-01',
						updatedAt: '2024-01-01',
						project: { id: 'p1', name: 'Personal' },
					},
					{
						id: 'wf2',
						name: 'My workflow 2',
						versionId: 'v2',
						activeVersionId: null,
						isArchived: false,
						createdAt: '2024-01-01',
						updatedAt: '2024-01-01',
						project: { id: 'p2', name: 'Primary' },
					},
				],
				total: 2,
				totalInScope: 2,
			});

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool<{ note: string }>(
				tool,
				{ action: 'list', scope: 'instance' },
				{} as never,
			);

			expect(result.note).toContain('span 2 projects');
			expect(result.note).toContain('never infer it by subtracting');
		});

		// Attribution rides on the query shape, so an instance-wide list still tags every
		// row even when they all turn out to belong to one project. Saying that result
		// spans projects would be a claim the rows do not support.
		it('does not claim a single-project result spans projects', async () => {
			const context = createMockContext();
			(context.workflowService.list as Mock).mockResolvedValue({
				workflows: [
					{
						id: 'wf1',
						name: 'My workflow',
						versionId: 'v1',
						activeVersionId: null,
						isArchived: false,
						createdAt: '2024-01-01',
						updatedAt: '2024-01-01',
						project: { id: 'p1', name: 'Personal' },
					},
					{
						id: 'wf2',
						name: 'My workflow 2',
						versionId: 'v2',
						activeVersionId: null,
						isArchived: false,
						createdAt: '2024-01-01',
						updatedAt: '2024-01-01',
						project: { id: 'p1', name: 'Personal' },
					},
				],
				total: 2,
				totalInScope: 2,
			});

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool<{ note?: string }>(
				tool,
				{ action: 'list', scope: 'instance' },
				{} as never,
			);

			expect(result.note).toBeUndefined();
		});

		it('adds no note when the unfiltered list is complete', async () => {
			const context = createMockContext();
			(context.workflowService.list as Mock).mockResolvedValue(emptyList);

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(tool, { action: 'list' }, {} as never);

			expect(result).toEqual({ workflows: [], total: 0, totalInScope: 0 });
		});

		describe('folder scope', () => {
			it('does not advertise folder fields while folder exploration is off', () => {
				const context = createMockContext();
				const schema = getInputSchema(createWorkflowsTool(context, 'full'));

				const parsed = schema.safeParse({ action: 'list', folderPath: 'Triggers' });

				// Either rejected or stripped — an agent with the flag off must never be able to pass it.
				expect(parsed.success && 'folderPath' in (parsed.data as object)).toBe(false);
			});

			it('advertises folderPath, folderId and recursive while folder exploration is on', () => {
				const context = createMockContext({ folderExplorationEnabled: true });
				const schema = getInputSchema(createWorkflowsTool(context, 'full'));

				const parsed = schema.safeParse({
					action: 'list',
					folderPath: 'Clients/Acme',
					folderId: 'f1',
					recursive: false,
				});

				expect(parsed.success).toBe(true);
				expect(parsed.success && parsed.data).toMatchObject({
					folderPath: 'Clients/Acme',
					folderId: 'f1',
					recursive: false,
				});
			});

			it('still builds the orchestrator surface with folder exploration on', () => {
				const context = createMockContext({ folderExplorationEnabled: true });

				expect(() => createWorkflowsTool(context, 'orchestrator')).not.toThrow();
			});

			it('forwards folderPath and omits recursive when not given', async () => {
				const context = createMockContext({ folderExplorationEnabled: true });
				(context.workflowService.list as Mock).mockResolvedValue(emptyList);

				const tool = createWorkflowsTool(context, 'full');
				await executeTool(tool, { action: 'list', folderPath: 'Clients/Acme' }, {} as never);

				expect(context.workflowService.list).toHaveBeenCalledWith({ folderPath: 'Clients/Acme' });
			});

			it('forwards folderId and recursive: false', async () => {
				const context = createMockContext({ folderExplorationEnabled: true });
				(context.workflowService.list as Mock).mockResolvedValue(emptyList);

				const tool = createWorkflowsTool(context, 'full');
				await executeTool(tool, { action: 'list', folderId: 'f1', recursive: false }, {} as never);

				expect(context.workflowService.list).toHaveBeenCalledWith({
					folderId: 'f1',
					recursive: false,
				});
			});

			it('forwards an empty folderPath so the adapter reports the miss', async () => {
				const context = createMockContext({ folderExplorationEnabled: true });
				(context.workflowService.list as Mock).mockResolvedValue(emptyList);

				const tool = createWorkflowsTool(context, 'full');
				await executeTool(tool, { action: 'list', folderPath: '' }, {} as never);

				expect(context.workflowService.list).toHaveBeenCalledWith({ folderPath: '' });
			});

			it('forwards an empty folderId so the adapter reports the miss', async () => {
				const context = createMockContext({ folderExplorationEnabled: true });
				(context.workflowService.list as Mock).mockResolvedValue(emptyList);

				const tool = createWorkflowsTool(context, 'full');
				await executeTool(tool, { action: 'list', folderId: '' }, {} as never);

				expect(context.workflowService.list).toHaveBeenCalledWith({ folderId: '' });
			});

			const folderRow = {
				id: 'wf1',
				name: 'Slack inbound',
				versionId: 'v1',
				activeVersionId: null,
				isArchived: false,
				createdAt: '2024-01-01',
				updatedAt: '2024-01-01',
				folder: { id: 'f1', name: 'Triggers', path: 'Triggers' },
			};

			it('puts the unresolved-folder note first and forbids a query substitute', async () => {
				const context = createMockContext({ folderExplorationEnabled: true });
				(context.workflowService.list as Mock).mockResolvedValue({
					workflows: [],
					total: 0,
					totalInScope: 0,
					folderResolution: {
						requested: 'Trigger',
						reason: 'not-found',
						candidates: ['Clients/Acme', 'Triggers'],
					},
				});

				const tool = createWorkflowsTool(context, 'full');
				const result = await executeTool<{
					note: string;
					folderResolution: { reason: string };
				}>(tool, { action: 'list', folderPath: 'Trigger', limit: 1 }, {} as never);

				expect(result.note.startsWith('Folder "Trigger" was not found')).toBe(true);
				expect(result.note).toContain('Clients/Acme');
				expect(result.note).toContain('Triggers');
				expect(result.note).toContain('Do NOT substitute a `query` name filter');
				expect(result.folderResolution).toEqual(expect.objectContaining({ reason: 'not-found' }));
			});

			it('names an ambiguous folder and lists only the colliding paths', async () => {
				const context = createMockContext({ folderExplorationEnabled: true });
				(context.workflowService.list as Mock).mockResolvedValue({
					workflows: [],
					total: 0,
					totalInScope: 0,
					folderResolution: {
						requested: 'Acme',
						reason: 'ambiguous',
						candidates: ['Archive/Acme', 'Clients/Acme'],
					},
				});

				const tool = createWorkflowsTool(context, 'full');
				const result = await executeTool<{ note: string }>(
					tool,
					{ action: 'list', folderPath: 'Acme' },
					{} as never,
				);

				expect(result.note).toContain('matches more than one folder');
				expect(result.note).toContain('Archive/Acme');
				expect(result.note).toContain('Clients/Acme');
			});

			it('explains identical ambiguous paths as a cross-project collision', async () => {
				const context = createMockContext({ folderExplorationEnabled: true });
				(context.workflowService.list as Mock).mockResolvedValue({
					workflows: [],
					total: 0,
					totalInScope: 0,
					folderResolution: {
						requested: 'Clients/Acme',
						reason: 'ambiguous',
						candidates: ['Clients/Acme', 'Clients/Acme'],
					},
				});

				const tool = createWorkflowsTool(context, 'full');
				const result = await executeTool<{ note: string }>(
					tool,
					{ action: 'list', folderPath: 'Clients/Acme' },
					{} as never,
				);

				expect(result.note).toContain('more than one project');
				expect(result.note).toContain('projectId');
			});

			it('asks for a projectId when the listing spans too many projects to scan', async () => {
				const context = createMockContext({ folderExplorationEnabled: true });
				(context.workflowService.list as Mock).mockResolvedValue({
					workflows: [],
					total: 0,
					totalInScope: 0,
					folderResolution: { requested: 'Clients', reason: 'scope-too-wide', candidates: [] },
				});

				const tool = createWorkflowsTool(context, 'full');
				const result = await executeTool<{ note: string }>(
					tool,
					{ action: 'list', scope: 'instance', folderPath: 'Clients' },
					{} as never,
				);

				expect(result.note).toContain('spans too many projects');
				expect(result.note).toContain('workspace(action="list-projects")');
				expect(result.note).toContain('narrow to one project');
			});

			it('keeps the folder note ahead of the name-filter note', async () => {
				const context = createMockContext({ folderExplorationEnabled: true });
				(context.workflowService.list as Mock).mockResolvedValue({
					workflows: [],
					total: 1,
					totalInScope: 3,
					folderResolution: { requested: 'Trigger', reason: 'not-found', candidates: [] },
				});

				const tool = createWorkflowsTool(context, 'full');
				const result = await executeTool<{ note: string }>(
					tool,
					{ action: 'list', folderPath: 'Trigger', query: 'x' },
					{} as never,
				);

				expect(result.note.startsWith('Folder "')).toBe(true);
				expect(result.note).toContain('matched 1 of 3');
			});

			it('says folders are unavailable when the instance does not support them', async () => {
				const context = createMockContext({ folderExplorationEnabled: true });
				(context.workflowService.list as Mock).mockResolvedValue({
					workflows: [],
					total: 0,
					totalInScope: 0,
					folderResolution: { requested: 'Acme', reason: 'unsupported', candidates: [] },
				});

				const tool = createWorkflowsTool(context, 'full');
				const result = await executeTool<{ note: string }>(
					tool,
					{ action: 'list', folderPath: 'Acme' },
					{} as never,
				);

				expect(result.note).toContain('Folders are not available on this instance');
				expect(result.note).toContain('ask the user');
			});

			it('passes folder attribution through and adds no folder note when resolved', async () => {
				const context = createMockContext({ folderExplorationEnabled: true });
				(context.workflowService.list as Mock).mockResolvedValue({
					workflows: [folderRow],
					total: 1,
					totalInScope: 1,
				});

				const tool = createWorkflowsTool(context, 'full');
				const result = await executeTool<{ workflows: unknown[]; note?: string }>(
					tool,
					{ action: 'list', folderPath: 'Triggers' },
					{} as never,
				);

				expect(result.workflows).toEqual([folderRow]);
				expect(result.note).toBeUndefined();
			});
		});
	});

	describe('get action', () => {
		const detail = {
			id: 'wf1',
			name: 'Test WF',
			nodes: [
				{
					name: 'Webhook',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 2,
					parameters: { path: 'x', big: 'x'.repeat(5000) },
					position: [0, 0],
				},
				{
					name: 'IF',
					type: 'n8n-nodes-base.if',
					typeVersion: 2.2,
					parameters: { conditions: {} },
					position: [1, 0],
				},
				{ name: 'Set', type: 'n8n-nodes-base.set', parameters: {}, position: [2, 0] },
			],
			connections: {
				Webhook: { main: [[{ node: 'IF', type: 'main', index: 0 }]] },
				IF: {
					main: [
						[{ node: 'Set', type: 'main', index: 0 }],
						[{ node: 'Webhook', type: 'main', index: 0 }],
					],
				},
			},
			versionId: 'v1',
			activeVersionId: null,
			isArchived: false,
			createdAt: '2024-01-01',
			updatedAt: '2024-01-01',
		};

		it('should return the structure as SDK code for large workflows', async () => {
			const context = createMockContext();
			(context.workflowService.get as Mock).mockResolvedValue(detail);

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(tool, { action: 'get', workflowId: 'wf1' }, {} as never);

			expect(context.workflowService.get).toHaveBeenCalledWith('wf1');
			expect(result).toEqual({
				id: 'wf1',
				name: 'Test WF',
				versionId: 'v1',
				activeVersionId: null,
				isArchived: false,
				createdAt: '2024-01-01',
				updatedAt: '2024-01-01',
				nodeCount: 3,
				structure: '// generated code',
				note: STRUCTURE_ONLY_NOTE,
			});
			expect(STRUCTURE_ONLY_NOTE).toContain('get-as-code');
			expect(STRUCTURE_ONLY_NOTE).not.toContain('get-json');
			const codegenInput = vi.mocked(generateWorkflowCode).mock.calls[0][0];
			expect(codegenInput).toMatchObject({ name: 'Test WF' });
			expect(JSON.stringify(codegenInput)).not.toContain('conditions');
		});

		it('should return the complete payload when full is true', async () => {
			const context = createMockContext();
			(context.workflowService.get as Mock).mockResolvedValue(detail);

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(
				tool,
				{ action: 'get', workflowId: 'wf1', full: true },
				{} as never,
			);

			expect(result).toEqual(detail);
		});

		it('should include parameters inline for small workflows', async () => {
			const small = {
				...detail,
				nodes: [
					{
						name: 'Webhook',
						type: 'n8n-nodes-base.webhook',
						parameters: { path: 'x' },
						position: [0, 0],
					},
				],
			};
			const context = createMockContext();
			(context.workflowService.get as Mock).mockResolvedValue(small);

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(tool, { action: 'get', workflowId: 'wf1' }, {} as never);

			expect(result).toEqual(small);
		});

		it('should fall back to a plain structure listing when codegen fails', async () => {
			const context = createMockContext();
			(context.workflowService.get as Mock).mockResolvedValue(detail);
			vi.mocked(generateWorkflowCode).mockImplementationOnce(() => {
				throw new Error('unsupported graph');
			});

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(tool, { action: 'get', workflowId: 'wf1' }, {} as never);

			const structure = (result as { structure: string }).structure;
			expect(structure).toContain('- Webhook (n8n-nodes-base.webhook)');
			expect(structure).toContain('- IF [1]→ Webhook');
			expect(structure).not.toContain('conditions');
		});

		it('should return a version structure summary when versionId is provided', async () => {
			const context = createMockContext();
			context.workflowService.getVersion = vi.fn().mockResolvedValue({
				versionId: 'v1',
				name: 'Checkpoint',
				description: null,
				authors: 'me',
				createdAt: '2024-01-01',
				autosaved: false,
				isActive: false,
				isCurrentDraft: false,
				nodes: [
					{
						name: 'Set',
						type: 'n8n-nodes-base.set',
						parameters: { big: 'blob'.repeat(2000) },
						position: [0, 0],
					},
				],
				connections: {},
			});

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(
				tool,
				{ action: 'get', workflowId: 'wf1', versionId: 'v1' },
				{} as never,
			);

			expect(context.workflowService.getVersion).toHaveBeenCalledWith('wf1', 'v1');
			expect(result).toEqual({
				workflowId: 'wf1',
				versionId: 'v1',
				name: 'Checkpoint',
				description: null,
				authors: 'me',
				createdAt: '2024-01-01',
				autosaved: false,
				isActive: false,
				isCurrentDraft: false,
				nodeCount: 1,
				structure: '// generated code',
				note: STRUCTURE_ONLY_NOTE,
			});
		});

		it('should explain when versionId is passed but version history is unavailable', async () => {
			const context = createMockContext();

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(
				tool,
				{ action: 'get', workflowId: 'wf1', versionId: 'v1' },
				{} as never,
			);

			expect(result).toEqual({
				workflowId: 'wf1',
				versionId: 'v1',
				error: 'Workflow version history is not available on this instance',
			});
		});
	});

	describe('get-json action', () => {
		it('should return full WorkflowJSON with node metadata', async () => {
			const workflow = {
				id: 'wf1',
				name: 'Test WF',
				nodes: [
					{
						id: 'node-1',
						name: 'Agent',
						type: '@n8n/n8n-nodes-langchain.agent',
						typeVersion: 2,
						position: [0, 0],
						parameters: { text: '={{ $json.input }}' },
						credentials: { openAiApi: { id: 'cred-1', name: 'OpenAI' } },
						disabled: false,
					},
				],
				connections: {},
			};
			const context = createMockContext();
			(context.workflowService.getAsWorkflowJSON as Mock).mockResolvedValue(workflow);

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(
				tool,
				{ action: 'get-json', workflowId: 'wf1' },
				{} as never,
			);

			expect(context.workflowService.getAsWorkflowJSON).toHaveBeenCalledWith('wf1', undefined);
			expect(result).toEqual(workflow);
		});

		it('reports pinned nodes next to the JSON when the workflow carries pinned data', async () => {
			const workflow = { id: 'wf1', name: 'Test WF', nodes: [], connections: {} };
			const context = createMockContext();
			(context.workflowService.getAsWorkflowJSON as Mock).mockResolvedValue(workflow);
			(context.workflowService.getPinnedDataSummary as Mock).mockResolvedValue([
				{ nodeName: 'Get Job Alert Emails', itemCount: 1 },
			]);

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(
				tool,
				{ action: 'get-json', workflowId: 'wf1' },
				{} as never,
			);

			expect(result).toMatchObject({
				...workflow,
				pinnedNodes: [{ nodeName: 'Get Job Alert Emails', itemCount: 1 }],
			});
			expect(result).toHaveProperty('pinnedDataNote', expect.stringContaining('pinned data'));
		});

		it('does not fetch a pin report for historical version reads', async () => {
			const context = createMockContext();
			const tool = createWorkflowsTool(context, 'full');

			await executeTool(
				tool,
				{ action: 'get-json', workflowId: 'wf1', versionId: 'v7' },
				{} as never,
			);

			expect(context.workflowService.getPinnedDataSummary).not.toHaveBeenCalled();
		});

		it('should forward versionId to the full fetches', async () => {
			const context = createMockContext();
			const tool = createWorkflowsTool(context, 'full');

			await executeTool(
				tool,
				{ action: 'get-json', workflowId: 'wf1', versionId: 'v7' },
				{} as never,
			);
			await executeTool(
				tool,
				{ action: 'get-as-code', workflowId: 'wf1', versionId: 'v7' },
				{} as never,
			);

			expect((context.workflowService.getAsWorkflowJSON as Mock).mock.calls).toEqual([
				['wf1', 'v7'],
				['wf1', 'v7'],
			]);
		});

		/**
		 * The code returned here is what the agent edits and builds back into the same
		 * saved workflow, so it has to carry node ids or the rebuild re-identifies every
		 * node (INS-970, INS-1120, INS-1179).
		 */
		it('should ask codegen to emit node ids for get-as-code', async () => {
			const context = createMockContext();
			const tool = createWorkflowsTool(context, 'full');

			await executeTool(tool, { action: 'get-as-code', workflowId: 'wf1' }, {} as never);

			expect(vi.mocked(generateWorkflowCode)).toHaveBeenCalledWith(
				expect.objectContaining({ includeNodeIds: true, includePositions: false }),
			);
		});
	});

	describe('get-as-code source file materialization', () => {
		const GENERATED = [
			'const trigger1 = trigger({',
			"  type: 'n8n-nodes-base.manualTrigger',",
			'  version: 1,',
			"  config: { id: 'n1', name: 'Start' }",
			'});',
			"export default workflow('wf1', 'Test WF').add(trigger1);",
		].join('\n');

		function createWorkspaceContext(files: Map<string, string>) {
			const context = createMockContext({
				logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
				workspace: {
					filesystem: {
						readFile: vi.fn(async (path: string) => {
							const content = files.get(path);
							if (content === undefined) throw new Error(`ENOENT ${path}`);
							return await Promise.resolve(content);
						}),
						writeFile: vi.fn(async (path: string, content: string | Buffer) => {
							files.set(path, Buffer.isBuffer(content) ? content.toString('utf-8') : content);
							await Promise.resolve();
						}),
					},
				} as unknown as InstanceAiContext['workspace'],
			});
			(context.workflowService.getAsWorkflowJSON as Mock).mockResolvedValue({
				name: 'Test WF',
				nodes: [
					{
						id: 'n1',
						name: 'Start',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
				connections: {},
			});
			(context.workflowService.get as Mock).mockResolvedValue({
				id: 'wf1',
				name: 'Test WF',
				versionId: 'v1',
				checksum: 'c1',
				activeVersionId: null,
				isArchived: false,
				createdAt: '2024-01-01',
				updatedAt: '2024-01-01',
				nodes: [],
				connections: {},
			});
			vi.mocked(generateWorkflowCode).mockReturnValue(GENERATED);
			return context;
		}

		afterEach(() => {
			vi.mocked(generateWorkflowCode).mockReturnValue('// generated code');
		});

		it('writes a build-ready source file, binds it, and returns a node index', async () => {
			const files = new Map<string, string>();
			const context = createWorkspaceContext(files);
			const tool = createWorkflowsTool(context, 'full');

			const result = await executeTool(
				tool,
				{ action: 'get-as-code', workflowId: 'wf1' },
				{} as never,
			);

			const filePath = 'src/workflows/test-wf.workflow.ts';
			expect(result).toMatchObject({
				workflowId: 'wf1',
				name: 'Test WF',
				filePath,
				status: 'written',
				nodeCount: 1,
				nodes: [{ name: 'Start', type: 'n8n-nodes-base.manualTrigger', line: 3 }],
			});
			expect(files.get(filePath)).toBe(
				`import { workflow, trigger } from '@n8n/workflow-sdk';\n\n${GENERATED}`,
			);
			await expect(getWorkflowSourceFileBinding(context, filePath)).resolves.toMatchObject({
				workflowId: 'wf1',
				workflowVersionId: 'v1',
				workflowChecksum: 'c1',
			});
		});

		it('inlines the source only while it is small', async () => {
			const files = new Map<string, string>();
			const context = createWorkspaceContext(files);
			const tool = createWorkflowsTool(context, 'full');

			const small = await executeTool<{ code?: string }>(
				tool,
				{ action: 'get-as-code', workflowId: 'wf1' },
				{} as never,
			);
			expect(small.code).toContain(GENERATED);

			files.clear();
			const largeTool = createWorkflowsTool(createWorkspaceContext(files), 'full');
			vi.mocked(generateWorkflowCode).mockReturnValue(`${GENERATED}\n// ${'x'.repeat(20_000)}`);
			const large = await executeTool<{ code?: string; status: string }>(
				largeTool,
				{ action: 'get-as-code', workflowId: 'wf1' },
				{} as never,
			);
			expect(large.code).toBeUndefined();
			expect(large.status).toBe('written');
		});

		it('does not rewrite a file that already matches the saved workflow', async () => {
			const files = new Map<string, string>();
			const context = createWorkspaceContext(files);
			const tool = createWorkflowsTool(context, 'full');
			await executeTool(tool, { action: 'get-as-code', workflowId: 'wf1' }, {} as never);
			const writeFile = context.workspace?.filesystem?.writeFile as Mock;
			writeFile.mockClear();

			const result = await executeTool<{ status: string }>(
				tool,
				{ action: 'get-as-code', workflowId: 'wf1' },
				{} as never,
			);

			expect(result.status).toBe('current');
			expect(writeFile).not.toHaveBeenCalled();
		});

		it('reports a conflict instead of clobbering unbuilt edits', async () => {
			const files = new Map<string, string>();
			const context = createWorkspaceContext(files);
			const tool = createWorkflowsTool(context, 'full');
			await executeTool(tool, { action: 'get-as-code', workflowId: 'wf1' }, {} as never);
			const filePath = 'src/workflows/test-wf.workflow.ts';
			const edited = `${files.get(filePath)}\n// local edit`;
			files.set(filePath, edited);

			const result = await executeTool<{ status: string; code?: string }>(
				tool,
				{ action: 'get-as-code', workflowId: 'wf1' },
				{} as never,
			);

			expect(result.status).toBe('conflict');
			expect(result.code).toBeUndefined();
			expect(files.get(filePath)).toBe(edited);
		});

		it('regenerates the file when the saved workflow changed and the file has no local edits', async () => {
			const files = new Map<string, string>();
			const context = createWorkspaceContext(files);
			const tool = createWorkflowsTool(context, 'full');
			await executeTool(tool, { action: 'get-as-code', workflowId: 'wf1' }, {} as never);

			(context.workflowService.get as Mock).mockResolvedValue({
				id: 'wf1',
				name: 'Test WF',
				versionId: 'v2',
				checksum: 'c2',
				activeVersionId: null,
				isArchived: false,
				createdAt: '2024-01-01',
				updatedAt: '2024-01-02',
				nodes: [],
				connections: {},
			});
			const regenerated = GENERATED.replace("name: 'Start'", "name: 'Start (renamed)'");
			vi.mocked(generateWorkflowCode).mockReturnValue(regenerated);

			const result = await executeTool<{ status: string; nodes: Array<{ line: number }> }>(
				tool,
				{ action: 'get-as-code', workflowId: 'wf1' },
				{} as never,
			);

			expect(result.status).toBe('refreshed');
			expect(files.get('src/workflows/test-wf.workflow.ts')).toContain(regenerated);
			await expect(
				getWorkflowSourceFileBinding(context, 'src/workflows/test-wf.workflow.ts'),
			).resolves.toMatchObject({ workflowChecksum: 'c2', workflowVersionId: 'v2' });
		});

		it('indexes the file on disk, not the regenerated code, when it reports a conflict', async () => {
			const files = new Map<string, string>();
			const context = createWorkspaceContext(files);
			const tool = createWorkflowsTool(context, 'full');
			await executeTool(tool, { action: 'get-as-code', workflowId: 'wf1' }, {} as never);
			const filePath = 'src/workflows/test-wf.workflow.ts';
			// Two lines prepended: the node declaration moves from line 3 to line 5 on disk.
			files.set(filePath, `// note\n// note\n${files.get(filePath)}`);

			const result = await executeTool<{ status: string; nodes: Array<{ line: number }> }>(
				tool,
				{ action: 'get-as-code', workflowId: 'wf1' },
				{} as never,
			);

			expect(result.status).toBe('conflict');
			expect(result.nodes[0].line).toBe(5);
		});

		it('keeps the concurrency token on the old version when it reports a conflict', async () => {
			const files = new Map<string, string>();
			const context = createWorkspaceContext(files);
			const tool = createWorkflowsTool(context, 'full');
			const filePath = 'src/workflows/test-wf.workflow.ts';
			await executeTool(tool, { action: 'get-as-code', workflowId: 'wf1' }, {} as never);
			// The agent edits the file without building, then the user edits the canvas.
			files.set(filePath, files.get(filePath)!.replace("name: 'Start'", "name: 'Start (edited)'"));
			(context.workflowService.get as Mock).mockResolvedValue({
				id: 'wf1',
				name: 'Test WF',
				versionId: 'v2',
				checksum: 'c2',
				activeVersionId: null,
				isArchived: false,
				createdAt: '2024-01-01',
				updatedAt: '2024-01-02',
				nodes: [],
				connections: {},
			});

			const result = await executeTool<{ status: string }>(
				tool,
				{ action: 'get-as-code', workflowId: 'wf1' },
				{} as never,
			);

			expect(result.status).toBe('conflict');
			// The file still derives from v1, so a build of it must hit the lost-update guard.
			await expect(getWorkflowSourceFileBinding(context, filePath)).resolves.toMatchObject({
				workflowChecksum: 'c1',
				workflowVersionId: 'v1',
			});
		});

		it('moves the concurrency token forward when only the canvas changed and the source is current', async () => {
			const files = new Map<string, string>();
			const context = createWorkspaceContext(files);
			const tool = createWorkflowsTool(context, 'full');
			const filePath = 'src/workflows/test-wf.workflow.ts';
			await executeTool(tool, { action: 'get-as-code', workflowId: 'wf1' }, {} as never);
			// A node was moved: new version, same generated source (positions are not emitted).
			(context.workflowService.get as Mock).mockResolvedValue({
				id: 'wf1',
				name: 'Test WF',
				versionId: 'v2',
				checksum: 'c2',
				activeVersionId: null,
				isArchived: false,
				createdAt: '2024-01-01',
				updatedAt: '2024-01-02',
				nodes: [],
				connections: {},
			});

			const result = await executeTool<{ status: string }>(
				tool,
				{ action: 'get-as-code', workflowId: 'wf1' },
				{} as never,
			);

			expect(result.status).toBe('current');
			await expect(getWorkflowSourceFileBinding(context, filePath)).resolves.toMatchObject({
				workflowChecksum: 'c2',
				workflowVersionId: 'v2',
			});
		});

		it('retries when the workflow changes between the source read and the checksum read', async () => {
			const files = new Map<string, string>();
			const context = createWorkspaceContext(files);
			const stable = { versionId: 'v2', checksum: 'c2' };
			const detail = (v: { versionId: string; checksum: string }) => ({
				id: 'wf1',
				name: 'Test WF',
				activeVersionId: null,
				isArchived: false,
				createdAt: '2024-01-01',
				updatedAt: '2024-01-01',
				nodes: [],
				connections: {},
				...v,
			});
			(context.workflowService.get as Mock)
				.mockResolvedValueOnce(detail({ versionId: 'v1', checksum: 'c1' }))
				.mockResolvedValueOnce(detail(stable))
				.mockResolvedValue(detail(stable));
			const tool = createWorkflowsTool(context, 'full');

			const result = await executeTool<{ status: string; error?: string }>(
				tool,
				{ action: 'get-as-code', workflowId: 'wf1' },
				{} as never,
			);

			expect(result.error).toBeUndefined();
			expect(result.status).toBe('written');
			await expect(
				getWorkflowSourceFileBinding(context, 'src/workflows/test-wf.workflow.ts'),
			).resolves.toMatchObject({ workflowChecksum: 'c2' });
		});

		it('fails instead of binding a torn snapshot when the workflow keeps changing', async () => {
			const files = new Map<string, string>();
			const context = createWorkspaceContext(files);
			let n = 0;
			(context.workflowService.get as Mock).mockImplementation(async () => {
				n += 1;
				return await Promise.resolve({
					id: 'wf1',
					name: 'Test WF',
					versionId: `v${n}`,
					checksum: `c${n}`,
					activeVersionId: null,
					isArchived: false,
					createdAt: '2024-01-01',
					updatedAt: '2024-01-01',
					nodes: [],
					connections: {},
				});
			});
			const tool = createWorkflowsTool(context, 'full');

			const result = await executeTool<{ error?: string }>(
				tool,
				{ action: 'get-as-code', workflowId: 'wf1' },
				{} as never,
			);

			expect(result.error).toContain('changed while its source was being read');
			expect(files.size).toBe(0);
		});

		it('keeps historical reads inline and unbound', async () => {
			const files = new Map<string, string>();
			const context = createWorkspaceContext(files);
			const tool = createWorkflowsTool(context, 'full');

			const result = await executeTool<{ code?: string; filePath?: string }>(
				tool,
				{ action: 'get-as-code', workflowId: 'wf1', versionId: 'v0' },
				{} as never,
			);

			expect(result.code).toContain(GENERATED);
			expect(result.filePath).toBeUndefined();
			expect(files.size).toBe(0);
		});
	});

	describe('get with full: true', () => {
		it('refuses to inline a workflow above the full-payload limit', async () => {
			const context = createMockContext();
			const nodes = Array.from({ length: 300 }, (_, i) => ({
				id: `n${i}`,
				name: `Node ${i}`,
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				position: [0, 0],
				parameters: { assignments: { assignments: [{ name: 'k', value: 'v'.repeat(400) }] } },
			}));
			(context.workflowService.get as Mock).mockResolvedValue({
				id: 'wf1',
				name: 'Big',
				versionId: 'v1',
				activeVersionId: null,
				isArchived: false,
				createdAt: '2024-01-01',
				updatedAt: '2024-01-01',
				nodes,
				connections: {},
			});
			const tool = createWorkflowsTool(context, 'full');

			const result = await executeTool<{ nodes?: unknown; nodeCount?: number; note?: string }>(
				tool,
				{ action: 'get', workflowId: 'wf1', full: true },
				{} as never,
			);

			expect(result.nodes).toBeUndefined();
			expect(result.nodeCount).toBe(300);
			expect(result.note).toBe(FULL_PAYLOAD_TOO_LARGE_NOTE);
		});
	});

	describe('workflow source binding refresh', () => {
		it('refreshes bound checksum after current-version get-as-code', async () => {
			const context = createMockContext();
			(context.workflowService.get as Mock).mockResolvedValue({
				id: 'wf1',
				name: 'Test WF',
				versionId: 'v-current',
				checksum: 'checksum-current',
				activeVersionId: null,
				isArchived: false,
				createdAt: '2024-01-01',
				updatedAt: '2024-01-01',
				nodes: [],
				connections: {},
			});

			await saveWorkflowSourceFileBinding(context, {
				filePath: 'src/workflows/main.workflow.ts',
				workflowId: 'wf1',
				workflowVersionId: 'v-stale',
				workflowChecksum: 'checksum-stale',
			});

			const tool = createWorkflowsTool(context, 'full');
			await executeTool(tool, { action: 'get-as-code', workflowId: 'wf1' }, {} as never);

			await expect(
				getWorkflowSourceFileBinding(context, 'src/workflows/main.workflow.ts'),
			).resolves.toMatchObject({
				workflowId: 'wf1',
				workflowVersionId: 'v-current',
				workflowChecksum: 'checksum-current',
			});
		});

		it('does not refresh bound checksum for historical get-as-code reads', async () => {
			const context = createMockContext();

			await saveWorkflowSourceFileBinding(context, {
				filePath: 'src/workflows/main.workflow.ts',
				workflowId: 'wf1',
				workflowVersionId: 'v-stale',
				workflowChecksum: 'checksum-stale',
			});

			const tool = createWorkflowsTool(context, 'full');
			await executeTool(
				tool,
				{ action: 'get-as-code', workflowId: 'wf1', versionId: 'v7' },
				{} as never,
			);

			expect(context.workflowService.get).not.toHaveBeenCalled();
			await expect(
				getWorkflowSourceFileBinding(context, 'src/workflows/main.workflow.ts'),
			).resolves.toMatchObject({
				workflowId: 'wf1',
				workflowVersionId: 'v-stale',
				workflowChecksum: 'checksum-stale',
			});
		});

		it('refreshes bound checksum after update', async () => {
			const context = createMockContext({
				permissions: { updateWorkflow: 'always_allow' },
			});
			(context.workflowService.updateFromWorkflowJSON as Mock).mockResolvedValue({
				id: 'wf1',
				versionId: 'v-updated',
				checksum: 'checksum-updated',
			});
			(context.workflowService.get as Mock).mockResolvedValue({
				id: 'wf1',
				name: 'Test WF',
				versionId: 'v-updated',
				checksum: 'checksum-updated',
				activeVersionId: null,
				isArchived: false,
				createdAt: '2024-01-01',
				updatedAt: '2024-01-01',
				nodes: [],
				connections: {},
			});

			await saveWorkflowSourceFileBinding(context, {
				filePath: 'src/workflows/main.workflow.ts',
				workflowId: 'wf1',
				workflowVersionId: 'v-stale',
				workflowChecksum: 'checksum-stale',
			});

			const tool = createWorkflowsTool(context, 'full');
			await executeTool(
				tool,
				{
					action: 'update',
					workflowId: 'wf1',
					workflow: { name: 'Updated WF', nodes: [], connections: {} },
				},
				{ resumeData: { approved: true } } as never,
			);

			await expect(
				getWorkflowSourceFileBinding(context, 'src/workflows/main.workflow.ts'),
			).resolves.toMatchObject({
				workflowId: 'wf1',
				workflowVersionId: 'v-updated',
				workflowChecksum: 'checksum-updated',
			});
		});
	});

	describe('update action', () => {
		const workflowPayload = { name: 'Updated WF', nodes: [], connections: {} };

		it('should suspend for approval before updating a foreign workflow', async () => {
			const context = createMockContext({
				permissions: { updateWorkflow: 'require_approval' },
			});
			(context.workflowService.get as Mock).mockResolvedValue({
				id: 'wf1',
				name: 'Foreign WF',
			});
			const suspend = vi.fn();

			await executeTool(
				createWorkflowsTool(context, 'full'),
				{ action: 'update', workflowId: 'wf1', workflow: workflowPayload },
				{ suspend } as never,
			);

			expect(suspend).toHaveBeenCalledWith(
				expect.objectContaining({
					message: 'Update workflow "Foreign WF" (ID: wf1)?',
					severity: 'warning',
					workflowId: 'wf1',
				}),
			);
			expect(context.workflowService.updateFromWorkflowJSON).not.toHaveBeenCalled();
		});

		describe('stale-save detection', () => {
			const workflowDetail = (checksum: string) => ({
				id: 'wf1',
				name: 'Test WF',
				versionId: 'v1',
				checksum,
				activeVersionId: null,
				isArchived: false,
				createdAt: '2024-01-01',
				updatedAt: '2024-01-01',
				nodes: [],
				connections: {},
			});

			it('expects the checksum the agent last read, so a concurrent save is caught', async () => {
				const context = createMockContext({ permissions: { updateWorkflow: 'always_allow' } });
				(context.workflowService.get as Mock).mockResolvedValue(workflowDetail('checksum-read'));
				(context.workflowService.updateFromWorkflowJSON as Mock).mockResolvedValue(
					workflowDetail('checksum-saved'),
				);
				const tool = createWorkflowsTool(context, 'full');

				await executeTool(tool, { action: 'get', workflowId: 'wf1' }, {} as never);
				await executeTool(
					tool,
					{ action: 'update', workflowId: 'wf1', workflow: workflowPayload },
					{} as never,
				);

				expect(context.workflowService.updateFromWorkflowJSON).toHaveBeenCalledWith(
					'wf1',
					workflowPayload,
					{ expectedChecksum: 'checksum-read' },
				);
			});

			it('expects the checksum current when the agent read the workflow JSON to edit', async () => {
				const context = createMockContext({ permissions: { updateWorkflow: 'always_allow' } });
				(context.workflowService.get as Mock).mockResolvedValue(workflowDetail('checksum-read'));
				(context.workflowService.updateFromWorkflowJSON as Mock).mockResolvedValue(
					workflowDetail('checksum-saved'),
				);
				const tool = createWorkflowsTool(context, 'full');

				await executeTool(tool, { action: 'get-json', workflowId: 'wf1' }, {} as never);
				await executeTool(
					tool,
					{ action: 'update', workflowId: 'wf1', workflow: workflowPayload },
					{} as never,
				);

				expect(context.workflowService.updateFromWorkflowJSON).toHaveBeenCalledWith(
					'wf1',
					workflowPayload,
					{ expectedChecksum: 'checksum-read' },
				);
			});

			it('does not expect a checksum after reading a past version', async () => {
				const context = createMockContext({ permissions: { updateWorkflow: 'always_allow' } });
				(context.workflowService.get as Mock).mockResolvedValue(workflowDetail('checksum-read'));
				(context.workflowService.updateFromWorkflowJSON as Mock).mockResolvedValue(
					workflowDetail('checksum-saved'),
				);
				const tool = createWorkflowsTool(context, 'full');

				await executeTool(
					tool,
					{ action: 'get-json', workflowId: 'wf1', versionId: 'v-old' },
					{} as never,
				);
				await executeTool(
					tool,
					{ action: 'update', workflowId: 'wf1', workflow: workflowPayload },
					{} as never,
				);

				expect(context.workflowService.updateFromWorkflowJSON).toHaveBeenCalledWith(
					'wf1',
					workflowPayload,
				);
			});

			it('expects the checksum read in an earlier turn of the same conversation', async () => {
				// Each run builds its own context, so the expectation has to live on the thread.
				const threads = new Map<string, { metadata: Record<string, unknown> }>();
				const threadMemory = {
					getThread: vi.fn(
						async (threadId: string) => await Promise.resolve(threads.get(threadId) ?? null),
					),
					patchThread: vi.fn(
						async ({
							threadId,
							update,
						}: {
							threadId: string;
							update: (current: { metadata: Record<string, unknown> }) => {
								metadata?: Record<string, unknown>;
							} | null;
						}) => {
							const current = threads.get(threadId) ?? { metadata: {} };
							const patch = update(current);
							if (!patch) return null;
							const next = { ...current, metadata: patch.metadata ?? current.metadata };
							threads.set(threadId, next);
							return await Promise.resolve(next);
						},
					),
				};
				const contextForTurn = () =>
					createMockContext({
						permissions: { updateWorkflow: 'always_allow' },
						threadId: 'thread-1',
						threadMemory,
					});

				const readTurn = contextForTurn();
				(readTurn.workflowService.get as Mock).mockResolvedValue(workflowDetail('checksum-read'));
				await executeTool(
					createWorkflowsTool(readTurn, 'full'),
					{ action: 'get', workflowId: 'wf1' },
					{} as never,
				);

				const updateTurn = contextForTurn();
				(updateTurn.workflowService.get as Mock).mockResolvedValue(workflowDetail('checksum-read'));
				(updateTurn.workflowService.updateFromWorkflowJSON as Mock).mockResolvedValue(
					workflowDetail('checksum-saved'),
				);
				await executeTool(
					createWorkflowsTool(updateTurn, 'full'),
					{ action: 'update', workflowId: 'wf1', workflow: workflowPayload },
					{} as never,
				);

				expect(updateTurn.workflowService.updateFromWorkflowJSON).toHaveBeenCalledWith(
					'wf1',
					workflowPayload,
					{ expectedChecksum: 'checksum-read' },
				);
			});

			it('advances the expectation to the checksum of its own save', async () => {
				const context = createMockContext({ permissions: { updateWorkflow: 'always_allow' } });
				(context.workflowService.get as Mock).mockResolvedValue(workflowDetail('checksum-read'));
				(context.workflowService.updateFromWorkflowJSON as Mock).mockResolvedValue(
					workflowDetail('checksum-saved'),
				);
				const tool = createWorkflowsTool(context, 'full');

				await executeTool(tool, { action: 'get', workflowId: 'wf1' }, {} as never);
				await executeTool(
					tool,
					{ action: 'update', workflowId: 'wf1', workflow: workflowPayload },
					{} as never,
				);
				await executeTool(
					tool,
					{ action: 'update', workflowId: 'wf1', workflow: workflowPayload },
					{} as never,
				);

				expect(context.workflowService.updateFromWorkflowJSON).toHaveBeenLastCalledWith(
					'wf1',
					workflowPayload,
					{ expectedChecksum: 'checksum-saved' },
				);
			});

			it('tracks saves made by other Instance AI paths, so they do not look stale', async () => {
				const context = createMockContext({ permissions: { updateWorkflow: 'always_allow' } });
				(context.workflowService.get as Mock).mockResolvedValue(workflowDetail('checksum-read'));
				(context.workflowService.updateFromWorkflowJSON as Mock).mockResolvedValue(
					workflowDetail('checksum-saved'),
				);
				const tool = createWorkflowsTool(context, 'full');

				await executeTool(tool, { action: 'get', workflowId: 'wf1' }, {} as never);
				// e.g. the setup or apply-credentials flow saving in between
				await refreshWorkflowSourceFileBindingFromSave(context, 'wf1', {
					versionId: 'v-setup',
					checksum: 'checksum-setup',
				});
				await executeTool(
					tool,
					{ action: 'update', workflowId: 'wf1', workflow: workflowPayload },
					{} as never,
				);

				expect(context.workflowService.updateFromWorkflowJSON).toHaveBeenCalledWith(
					'wf1',
					workflowPayload,
					{ expectedChecksum: 'checksum-setup' },
				);
			});

			it('tells the agent to re-read the workflow when its save is stale', async () => {
				const context = createMockContext({ permissions: { updateWorkflow: 'always_allow' } });
				(context.workflowService.get as Mock).mockResolvedValue(workflowDetail('checksum-read'));
				(context.workflowService.updateFromWorkflowJSON as Mock).mockRejectedValue(
					new WorkflowSaveConflictError('wf1'),
				);
				const tool = createWorkflowsTool(context, 'full');

				await executeTool(tool, { action: 'get', workflowId: 'wf1' }, {} as never);
				const result = await executeTool(
					tool,
					{ action: 'update', workflowId: 'wf1', workflow: workflowPayload },
					{} as never,
				);

				expect(result).toMatchObject({ success: false });
				expect((result as { error: string }).error).toMatch(/modified outside this conversation/);
				expect((result as { error: string }).error).toMatch(/action="get"/);
			});
		});

		it('drops invalid node groups before saving and reports coded warnings', async () => {
			const context = createMockContext({ permissions: { updateWorkflow: 'always_allow' } });
			(context.workflowService.updateFromWorkflowJSON as Mock).mockResolvedValue({
				id: 'wf1',
				versionId: 'v2',
				checksum: 'checksum-saved',
			});
			const workflow = {
				name: 'Updated WF',
				nodes: [
					{
						id: 'node-1',
						name: 'Set',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
				connections: {},
				nodeGroups: [
					{
						id: 'group-1',
						name: 'Broken group',
						nodeIds: ['missing-node', 'another-missing-node'],
					},
				],
			};

			const result = await executeTool<{
				success: boolean;
				workflowId?: string;
				warnings?: string[];
			}>(
				createWorkflowsTool(context, 'full'),
				{ action: 'update', workflowId: 'wf1', workflow },
				{} as never,
			);

			expect(result).toMatchObject({ success: true, workflowId: 'wf1' });
			expect(result.warnings).toHaveLength(1);
			expect(result.warnings?.join('\n')).toContain('[NODE_GROUP_DROPPED]');
			expect(result.warnings?.join('\n')).toContain('Broken group');
			expect(result.warnings?.join('\n')).toContain('missing-node');
			expect(result.warnings?.join('\n')).toContain('another-missing-node');
			expect(context.workflowService.updateFromWorkflowJSON).toHaveBeenCalledWith(
				'wf1',
				expect.objectContaining({ nodeGroups: [] }),
			);
		});

		it('saves valid node groups unchanged and returns no node-group warnings', async () => {
			const context = createMockContext({ permissions: { updateWorkflow: 'always_allow' } });
			(context.workflowService.updateFromWorkflowJSON as Mock).mockResolvedValue({
				id: 'wf1',
				versionId: 'v2',
				checksum: 'checksum-saved',
			});
			const workflow = {
				name: 'Updated WF',
				nodes: [
					{
						id: 'a',
						name: 'A',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: 'b',
						name: 'B',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [100, 0],
						parameters: {},
					},
				],
				connections: { A: { main: [[{ node: 'B', type: 'main', index: 0 }]] } },
				nodeGroups: [{ id: 'group-1', name: 'Valid group', nodeIds: ['a', 'b'] }],
			};

			const result = await executeTool<{
				success: boolean;
				workflowId?: string;
				warnings?: string[];
			}>(
				createWorkflowsTool(context, 'full'),
				{ action: 'update', workflowId: 'wf1', workflow },
				{} as never,
			);

			expect(result).toMatchObject({ success: true, workflowId: 'wf1' });
			expect(result.warnings).toBeUndefined();
			expect(context.workflowService.updateFromWorkflowJSON).toHaveBeenCalledWith('wf1', workflow);
		});

		it('normalizes duplicate and blank node IDs before node-group validation', async () => {
			const context = createMockContext({ permissions: { updateWorkflow: 'always_allow' } });
			(context.workflowService.updateFromWorkflowJSON as Mock).mockResolvedValue({
				id: 'wf1',
				versionId: 'v2',
				checksum: 'checksum-saved',
			});
			const workflow = {
				name: 'Updated WF',
				nodes: [
					{
						id: '',
						name: 'A',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: '',
						name: 'B',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [100, 0],
						parameters: {},
					},
				],
				connections: { A: { main: [[{ node: 'B', type: 'main', index: 0 }]] } },
				nodeGroups: [{ id: 'group-1', name: 'Healed group', nodeIds: ['', ''] }],
			};

			const result = await executeTool<{
				success: boolean;
				workflowId?: string;
				warnings?: string[];
			}>(
				createWorkflowsTool(context, 'full'),
				{ action: 'update', workflowId: 'wf1', workflow },
				{} as never,
			);

			const savedWorkflow = (context.workflowService.updateFromWorkflowJSON as Mock).mock
				.calls[0][1] as typeof workflow;
			const nodeIds = savedWorkflow.nodes.map((node) => node.id);
			expect(result).toMatchObject({ success: true, workflowId: 'wf1' });
			expect(result.warnings).toBeUndefined();
			expect(nodeIds.every(Boolean)).toBe(true);
			expect(new Set(nodeIds)).toHaveProperty('size', 2);
			expect(savedWorkflow.nodeGroups).toEqual([{ id: 'group-1', name: 'Healed group', nodeIds }]);
		});

		it('returns a tool error when raw update ID normalization cannot read nodes', async () => {
			const context = createMockContext({ permissions: { updateWorkflow: 'always_allow' } });

			const result = await executeTool(
				createWorkflowsTool(context, 'full'),
				{
					action: 'update',
					workflowId: 'wf1',
					workflow: { name: 'Updated WF', nodes: [null], connections: {} },
				},
				{} as never,
			);

			expect(result).toMatchObject({ success: false });
			expect(context.workflowService.updateFromWorkflowJSON).not.toHaveBeenCalled();
		});

		it('tells the agent what to do when a user is editing the workflow in the editor', async () => {
			const context = createMockContext({ permissions: { updateWorkflow: 'always_allow' } });
			(context.workflowService.updateFromWorkflowJSON as Mock).mockRejectedValue(
				new WorkflowEditorLockedError('wf1'),
			);

			const result = await executeTool(
				createWorkflowsTool(context, 'full'),
				{ action: 'update', workflowId: 'wf1', workflow: workflowPayload },
				{} as never,
			);

			expect(result).toMatchObject({ success: false });
			expect((result as { error: string }).error).toMatch(/being edited by a user/);
			expect((result as { error: string }).error).toMatch(/retry/i);
		});

		it('should update without approval when the workflow was created in this run', async () => {
			const context = createMockContext({
				permissions: { updateWorkflow: 'require_approval' },
				aiCreatedWorkflowIds: new Set(['wf1']),
			});
			(context.workflowService.updateFromWorkflowJSON as Mock).mockResolvedValue({
				id: 'wf1',
				versionId: 'v2',
			});
			const suspend = vi.fn();

			const result = await executeTool(
				createWorkflowsTool(context, 'full'),
				{ action: 'update', workflowId: 'wf1', workflow: workflowPayload },
				{ suspend } as never,
			);

			expect(result).toEqual({ success: true, workflowId: 'wf1' });
			expect(suspend).not.toHaveBeenCalled();
			expect(context.workflowService.updateFromWorkflowJSON).toHaveBeenCalledWith(
				'wf1',
				workflowPayload,
			);
		});

		it('should update without approval when the workflow has a session ownership grant', async () => {
			const context = createMockContext({
				permissions: { updateWorkflow: 'require_approval' },
				sessionApprovedToolKeys: new Set(['workflows:update:wf1']),
			});
			(context.workflowService.updateFromWorkflowJSON as Mock).mockResolvedValue({
				id: 'wf1',
				versionId: 'v2',
			});
			const suspend = vi.fn();

			const result = await executeTool(
				createWorkflowsTool(context, 'full'),
				{ action: 'update', workflowId: 'wf1', workflow: workflowPayload },
				{ suspend } as never,
			);

			expect(result).toEqual({ success: true, workflowId: 'wf1' });
			expect(suspend).not.toHaveBeenCalled();
			expect(context.workflowService.updateFromWorkflowJSON).toHaveBeenCalled();
		});

		it('should still block updates when admin policy denies them for owned workflows', async () => {
			const context = createMockContext({
				permissions: { updateWorkflow: 'blocked' },
				aiCreatedWorkflowIds: new Set(['wf1']),
			});

			const result = await executeTool(
				createWorkflowsTool(context, 'full'),
				{ action: 'update', workflowId: 'wf1', workflow: workflowPayload },
				{} as never,
			);

			expect(result).toEqual({
				success: false,
				denied: true,
				reason: 'Action blocked by admin',
			});
			expect(context.workflowService.updateFromWorkflowJSON).not.toHaveBeenCalled();
		});

		it('should persist a session update grant when resumed with scope=session', async () => {
			const grantSessionToolApproval = vi.fn().mockResolvedValue(undefined);
			const context = createMockContext({
				permissions: { updateWorkflow: 'require_approval' },
				grantSessionToolApproval,
			});
			(context.workflowService.updateFromWorkflowJSON as Mock).mockResolvedValue({
				id: 'wf1',
				versionId: 'v2',
			});

			const result = await executeTool(
				createWorkflowsTool(context, 'full'),
				{ action: 'update', workflowId: 'wf1', workflow: workflowPayload },
				{ resumeData: { approved: true, scope: 'session' } } as never,
			);

			expect(result).toEqual({ success: true, workflowId: 'wf1' });
			expect(grantSessionToolApproval).toHaveBeenCalledWith('workflows:update:wf1');
		});

		it('should not persist a grant for a one-time update approval', async () => {
			const grantSessionToolApproval = vi.fn().mockResolvedValue(undefined);
			const context = createMockContext({
				permissions: { updateWorkflow: 'require_approval' },
				grantSessionToolApproval,
			});
			(context.workflowService.updateFromWorkflowJSON as Mock).mockResolvedValue({
				id: 'wf1',
				versionId: 'v2',
			});

			await executeTool(
				createWorkflowsTool(context, 'full'),
				{ action: 'update', workflowId: 'wf1', workflow: workflowPayload },
				{ resumeData: { approved: true } } as never,
			);

			expect(grantSessionToolApproval).not.toHaveBeenCalled();
		});
	});

	describe('delete action', () => {
		it('should return denied when permission is blocked', async () => {
			const context = createMockContext({
				permissions: { deleteWorkflow: 'blocked' },
			});

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(tool, { action: 'delete', workflowId: 'wf1' }, {} as never);

			expect(result).toEqual({
				success: false,
				denied: true,
				reason: 'Action blocked by admin',
			});
		});

		it('should suspend for confirmation using the looked-up workflow name', async () => {
			const context = createMockContext();
			(context.workflowService.get as Mock).mockResolvedValue({
				id: 'wf1',
				name: 'My WF',
			});
			const suspend = vi.fn();

			const tool = createWorkflowsTool(context, 'full');
			await executeTool(tool, { action: 'delete', workflowId: 'wf1' }, {
				suspend,
				resumeData: undefined,
			} as never);

			expect(context.workflowService.get).toHaveBeenCalledWith('wf1');
			expect(suspend).toHaveBeenCalled();
			expect(suspend.mock.calls[0][0]).toMatchObject({
				message: expect.stringContaining('My WF'),
				severity: 'warning',
			});
		});

		it('should fall back to workflowId in message when lookup fails', async () => {
			const context = createMockContext();
			(context.workflowService.get as Mock).mockRejectedValue(new Error('not found'));
			const suspend = vi.fn();

			const tool = createWorkflowsTool(context, 'full');
			await executeTool(tool, { action: 'delete', workflowId: 'wf1' }, {
				suspend,
				resumeData: undefined,
			} as never);

			expect(suspend).toHaveBeenCalled();
			expect(suspend.mock.calls[0][0]).toMatchObject({
				message: expect.stringContaining('wf1'),
			});
		});

		it('should archive when approved via resume', async () => {
			const context = createMockContext();

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(tool, { action: 'delete', workflowId: 'wf1' }, {
				resumeData: { approved: true },
			} as never);

			expect(context.workflowService.archive).toHaveBeenCalledWith('wf1');
			expect(result).toEqual({ success: true });
		});

		it('should return denied when user rejects', async () => {
			const context = createMockContext();

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(tool, { action: 'delete', workflowId: 'wf1' }, {
				resumeData: { approved: false },
			} as never);

			expect(result).toEqual({
				success: false,
				denied: true,
				reason: 'User denied the action',
			});
		});
	});

	describe('unarchive action', () => {
		it('should return denied when permission is blocked', async () => {
			const context = createMockContext({
				permissions: { deleteWorkflow: 'blocked' },
			});

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(
				tool,
				{ action: 'unarchive', workflowId: 'wf1' },
				{} as never,
			);

			expect(result).toEqual({
				success: false,
				denied: true,
				reason: 'Action blocked by admin',
			});
			expect(context.workflowService.unarchive).not.toHaveBeenCalled();
		});

		it('should suspend for confirmation using the looked-up workflow name', async () => {
			const context = createMockContext();
			(context.workflowService.get as Mock).mockResolvedValue({
				id: 'wf1',
				name: 'Archived WF',
			});
			const suspend = vi.fn();

			const tool = createWorkflowsTool(context, 'full');
			await executeTool(tool, { action: 'unarchive', workflowId: 'wf1' }, {
				suspend,
				resumeData: undefined,
			} as never);

			expect(context.workflowService.get).toHaveBeenCalledWith('wf1');
			expect(suspend).toHaveBeenCalled();
			expect(suspend.mock.calls[0][0]).toMatchObject({
				message: expect.stringContaining('Archived WF'),
				severity: 'warning',
			});
		});

		it('should return the suspension result when approval is pending', async () => {
			const context = createMockContext();
			(context.workflowService.get as Mock).mockResolvedValue({
				id: 'wf1',
				name: 'Archived WF',
			});
			const suspension = { suspended: true };
			const suspend = vi.fn().mockResolvedValue(suspension);

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(tool, { action: 'unarchive', workflowId: 'wf1' }, {
				suspend,
				resumeData: undefined,
			} as never);

			expect(result).toBe(suspension);
			expect(context.workflowService.unarchive).not.toHaveBeenCalled();
		});

		it('should unarchive when approved via resume', async () => {
			const context = createMockContext();

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(tool, { action: 'unarchive', workflowId: 'wf1' }, {
				resumeData: { approved: true },
			} as never);

			expect(context.workflowService.unarchive).toHaveBeenCalledWith('wf1');
			expect(result).toEqual({ success: true });
		});

		it('should return denied when user rejects', async () => {
			const context = createMockContext();

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(tool, { action: 'unarchive', workflowId: 'wf1' }, {
				resumeData: { approved: false },
			} as never);

			expect(result).toEqual({
				success: false,
				denied: true,
				reason: 'User denied the action',
			});
			expect(context.workflowService.unarchive).not.toHaveBeenCalled();
		});
	});

	describe('publish action', () => {
		it('should return denied when permission is blocked', async () => {
			const context = createMockContext({
				permissions: { publishWorkflow: 'blocked' },
			});

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(tool, { action: 'publish', workflowId: 'wf1' }, {} as never);

			expect(result).toEqual({
				success: false,
				denied: true,
				reason: 'Action blocked by admin',
			});
		});

		it('should suspend for confirmation and then publish when approved', async () => {
			const context = createMockContext();
			(context.workflowService.publish as Mock).mockResolvedValue({
				activeVersionId: 'v2',
			});

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(tool, { action: 'publish', workflowId: 'wf1' }, {
				resumeData: { approved: true },
			} as never);

			expect(context.workflowService.publish).toHaveBeenCalledWith('wf1', {
				versionId: undefined,
			});
			expect(result).toEqual({
				success: true,
				activeVersionId: 'v2',
				publishedWorkflowIds: ['wf1'],
			});
		});

		it('should publish direct Execute Workflow dependencies before the main workflow', async () => {
			const context = createMockContext();
			(context.workflowService.getAsWorkflowJSON as Mock).mockResolvedValue({
				name: 'Parent',
				nodes: [
					{
						name: 'Call A',
						type: 'n8n-nodes-base.executeWorkflow',
						parameters: { source: 'database', workflowId: 'sub-a' },
					},
					{
						name: 'Call B',
						type: 'n8n-nodes-base.executeWorkflow',
						parameters: { source: 'database', workflowId: { value: 'sub-b' } },
					},
					{
						name: 'Call A Again',
						type: 'n8n-nodes-base.executeWorkflow',
						parameters: { source: 'database', workflowId: 'sub-a' },
					},
				],
				connections: {},
			});
			(context.workflowService.publish as Mock).mockResolvedValue({
				activeVersionId: 'v-main',
			});

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(tool, { action: 'publish', workflowId: 'wf1' }, {
				resumeData: { approved: true },
			} as never);

			expect(context.workflowService.publish).toHaveBeenNthCalledWith(1, 'sub-a');
			expect(context.workflowService.publish).toHaveBeenNthCalledWith(2, 'sub-b');
			expect(context.workflowService.publish).toHaveBeenNthCalledWith(3, 'wf1', {
				versionId: undefined,
			});
			expect(result).toEqual({
				success: true,
				activeVersionId: 'v-main',
				publishedWorkflowIds: ['sub-a', 'sub-b', 'wf1'],
				supportingWorkflowIds: ['sub-a', 'sub-b'],
			});
		});

		it('should roll back direct Execute Workflow dependencies when the main workflow publish fails', async () => {
			const context = createMockContext();
			(context.workflowService.getAsWorkflowJSON as Mock).mockResolvedValue({
				name: 'Parent',
				nodes: [
					{
						name: 'Call A',
						type: 'n8n-nodes-base.executeWorkflow',
						parameters: { source: 'database', workflowId: 'sub-a' },
					},
					{
						name: 'Call B',
						type: 'n8n-nodes-base.executeWorkflow',
						parameters: { source: 'database', workflowId: 'sub-b' },
					},
				],
				connections: {},
			});
			(context.workflowService.get as Mock).mockImplementation((workflowId: string) => ({
				id: workflowId,
				name: workflowId,
				versionId: `${workflowId}-draft`,
				checksum: `${workflowId}-checksum`,
				activeVersionId: workflowId === 'sub-a' ? 'sub-a-previous' : null,
				isArchived: false,
				createdAt: '2024-01-01',
				updatedAt: '2024-01-01',
				nodes: [],
				connections: {},
			}));
			(context.workflowService.publish as Mock).mockImplementation((workflowId: string) => {
				if (workflowId === 'wf1') throw new Error('Main publish failed');
				return { activeVersionId: `${workflowId}-active` };
			});

			await saveWorkflowSourceFileBinding(context, {
				filePath: 'src/workflows/sub-a.workflow.ts',
				workflowId: 'sub-a',
				workflowVersionId: 'sub-a-previous',
				workflowChecksum: 'sub-a-previous-checksum',
			});
			await saveWorkflowSourceFileBinding(context, {
				filePath: 'src/workflows/sub-b.workflow.ts',
				workflowId: 'sub-b',
				workflowVersionId: 'sub-b-previous',
				workflowChecksum: 'sub-b-previous-checksum',
			});

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(tool, { action: 'publish', workflowId: 'wf1' }, {
				resumeData: { approved: true },
			} as never);

			expect(context.workflowService.publish).toHaveBeenNthCalledWith(1, 'sub-a');
			expect(context.workflowService.publish).toHaveBeenNthCalledWith(2, 'sub-b');
			expect(context.workflowService.publish).toHaveBeenNthCalledWith(3, 'wf1', {
				versionId: undefined,
			});
			expect(context.workflowService.unpublish).toHaveBeenCalledWith('sub-b');
			expect(context.workflowService.publish).toHaveBeenNthCalledWith(4, 'sub-a', {
				versionId: 'sub-a-previous',
			});
			expect(result).toEqual({
				success: false,
				error: 'Main publish failed',
				rolledBackWorkflowIds: ['sub-b', 'sub-a'],
			});
			await expect(
				getWorkflowSourceFileBinding(context, 'src/workflows/sub-a.workflow.ts'),
			).resolves.toMatchObject({
				workflowId: 'sub-a',
				workflowVersionId: 'sub-a-draft',
				workflowChecksum: 'sub-a-checksum',
			});
			await expect(
				getWorkflowSourceFileBinding(context, 'src/workflows/sub-b.workflow.ts'),
			).resolves.toMatchObject({
				workflowId: 'sub-b',
				workflowVersionId: 'sub-b-draft',
				workflowChecksum: 'sub-b-checksum',
			});
		});

		it('should suspend for confirmation using the looked-up workflow name', async () => {
			const context = createMockContext();
			(context.workflowService.get as Mock).mockResolvedValue({
				id: 'wf1',
				name: 'My WF',
			});
			const suspend = vi.fn();

			const tool = createWorkflowsTool(context, 'full');
			await executeTool(tool, { action: 'publish', workflowId: 'wf1' }, {
				suspend,
				resumeData: undefined,
			} as never);

			expect(context.workflowService.get).toHaveBeenCalledWith('wf1');
			expect(suspend).toHaveBeenCalled();
			expect(suspend.mock.calls[0][0]).toMatchObject({
				message: 'Publish My WF (ID: wf1)',
				severity: 'warning',
			});
		});

		it('should include direct Execute Workflow dependencies in publish confirmation', async () => {
			const context = createMockContext();
			(context.workflowService.get as Mock).mockResolvedValue({
				id: 'wf1',
				name: 'My WF',
			});
			(context.workflowService.getAsWorkflowJSON as Mock).mockResolvedValue({
				name: 'Parent',
				nodes: [
					{
						name: 'Call A',
						type: 'n8n-nodes-base.executeWorkflow',
						parameters: { source: 'database', workflowId: 'sub-a' },
					},
				],
				connections: {},
			});
			const suspend = vi.fn();

			const tool = createWorkflowsTool(context, 'full');
			await executeTool(tool, { action: 'publish', workflowId: 'wf1' }, {
				suspend,
				resumeData: undefined,
			} as never);

			expect(suspend.mock.calls[0][0]).toMatchObject({
				message: 'Publish My WF (ID: wf1) and 1 referenced supporting workflow(s)',
				severity: 'warning',
			});
		});
	});

	describe('setup action', () => {
		it('should block setup when updateWorkflow permission is blocked', async () => {
			const context = createMockContext({
				permissions: { updateWorkflow: 'blocked' },
			});

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(tool, { action: 'setup', workflowId: 'wf1' }, {
				resumeData: undefined,
			} as never);

			expect(result).toEqual({
				success: false,
				denied: true,
				reason: 'Action blocked by admin',
			});
			expect(analyzeWorkflow).not.toHaveBeenCalled();
			expect(applyNodeChanges).not.toHaveBeenCalled();
		});

		it('should block setup apply when updateWorkflow permission is blocked', async () => {
			const context = createMockContext({
				permissions: { updateWorkflow: 'blocked' },
			});

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(tool, { action: 'setup', workflowId: 'wf1' }, {
				resumeData: {
					approved: true,
					action: 'apply',
					nodeParameters: { Slack: { channel: '#ops' } },
				},
			} as never);

			expect(result).toEqual({
				success: false,
				denied: true,
				reason: 'Action blocked by admin',
			});
			expect(analyzeWorkflow).not.toHaveBeenCalled();
			expect(applyNodeChanges).not.toHaveBeenCalled();
		});

		// INS-361: without this the analysis auto-applies an existing credential and
		// the card preselects it, contradicting the user's "create a new one".
		it('forwards preferNewCredentials to the setup analysis', async () => {
			(analyzeWorkflow as Mock).mockResolvedValue([]);

			const context = createMockContext();
			const tool = createWorkflowsTool(context, 'full');
			await executeTool(
				tool,
				{ action: 'setup', workflowId: 'wf1', preferNewCredentials: ['slackApi'] },
				{ suspend: vi.fn(), resumeData: undefined } as never,
			);

			expect(analyzeWorkflow).toHaveBeenCalledWith(context, 'wf1', undefined, {
				preferNewCredentialTypes: ['slackApi'],
			});
		});

		it('should analyze workflow and suspend for user setup', async () => {
			const setupRequests = [
				{
					node: { name: 'Slack', type: 'n8n-nodes-base.slack' },
					credentialType: 'slackApi',
					needsAction: true,
				},
			];
			(analyzeWorkflow as Mock).mockResolvedValue(setupRequests);

			const context = createMockContext();
			const suspend = vi.fn();

			const tool = createWorkflowsTool(context, 'full');
			await executeTool(tool, { action: 'setup', workflowId: 'wf1' }, {
				suspend,
				resumeData: undefined,
			} as never);

			expect(analyzeWorkflow).toHaveBeenCalledWith(context, 'wf1', undefined, {});
			expect(suspend).toHaveBeenCalled();
			expect(suspend.mock.calls[0][0]).toMatchObject({
				message: 'Configure credentials for your workflow',
				severity: 'info',
				setupRequests,
				workflowId: 'wf1',
			});
		});

		it('should scope the setup suspend to the thread-bound project even when the model omits projectId', async () => {
			(analyzeWorkflow as Mock).mockResolvedValue([
				{
					node: { name: 'Slack', type: 'n8n-nodes-base.slack' },
					credentialType: 'slackApi',
					needsAction: true,
				},
			]);

			const context = createMockContext({ projectId: 'project-team-1' });
			const suspend = vi.fn();

			const tool = createWorkflowsTool(context, 'full');
			await executeTool(tool, { action: 'setup', workflowId: 'wf1' }, {
				suspend,
				resumeData: undefined,
			} as never);

			expect(suspend.mock.calls[0][0]).toMatchObject({ projectId: 'project-team-1' });
		});

		it('should scope setup requests to nodes changed by the latest build', async () => {
			(analyzeWorkflow as Mock).mockResolvedValue([
				{
					node: { name: 'Google Sheets', type: 'n8n-nodes-base.googleSheets' },
					credentialType: 'googleSheetsOAuth2Api',
					needsAction: true,
				},
				{
					node: { name: 'Slack', type: 'n8n-nodes-base.slack' },
					credentialType: 'slackApi',
					needsAction: true,
				},
			]);

			const context = createMockContext({
				runId: 'run-1',
				workflowBuildContext: {
					threadId: 't1',
					runId: 'run-1',
					taskId: 'task-1',
					workItemId: 'wi-1',
					workflowTaskService: {
						getLatestBuildOutcomeForWorkflow: vi
							.fn()
							.mockResolvedValue({ runId: 'run-1', changedNodeNames: ['Google Sheets'] }),
					},
				} as never,
			});
			const suspend = vi.fn();

			const tool = createWorkflowsTool(context, 'full');
			await executeTool(tool, { action: 'setup', workflowId: 'wf1' }, {
				suspend,
				resumeData: undefined,
			} as never);

			expect(suspend).toHaveBeenCalled();
			expect(suspend.mock.calls[0][0].setupRequests).toEqual([
				expect.objectContaining({ node: expect.objectContaining({ name: 'Google Sheets' }) }),
			]);
		});

		it('should not suspend when only nodes outside the build scope need setup', async () => {
			(analyzeWorkflow as Mock).mockResolvedValue([
				{
					node: { name: 'Slack', type: 'n8n-nodes-base.slack' },
					credentialType: 'slackApi',
					needsAction: true,
				},
			]);

			const context = createMockContext({
				runId: 'run-1',
				workflowBuildContext: {
					threadId: 't1',
					runId: 'run-1',
					taskId: 'task-1',
					workItemId: 'wi-1',
					workflowTaskService: {
						getLatestBuildOutcomeForWorkflow: vi
							.fn()
							.mockResolvedValue({ runId: 'run-1', changedNodeNames: ['Build Message'] }),
					},
				} as never,
			});
			const suspend = vi.fn();

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(tool, { action: 'setup', workflowId: 'wf1' }, {
				suspend,
				resumeData: undefined,
			} as never);

			expect(suspend).not.toHaveBeenCalled();
			expect(result).toMatchObject({ success: true });
			expect((result as { reason: string }).reason).toContain('"Slack"');
			expect((result as { reason: string }).reason).toContain('includeAllNodes');
		});

		it('should cover every node when includeAllNodes is true', async () => {
			(analyzeWorkflow as Mock).mockResolvedValue([
				{
					node: { name: 'Slack', type: 'n8n-nodes-base.slack' },
					credentialType: 'slackApi',
					needsAction: true,
				},
			]);

			const getLatestBuildOutcomeForWorkflow = vi
				.fn()
				.mockResolvedValue({ runId: 'run-1', changedNodeNames: ['Build Message'] });
			const context = createMockContext({
				runId: 'run-1',
				workflowBuildContext: {
					threadId: 't1',
					runId: 'r1',
					taskId: 'task-1',
					workItemId: 'wi-1',
					workflowTaskService: { getLatestBuildOutcomeForWorkflow },
				} as never,
			});
			const suspend = vi.fn();

			const tool = createWorkflowsTool(context, 'full');
			await executeTool(tool, { action: 'setup', workflowId: 'wf1', includeAllNodes: true }, {
				suspend,
				resumeData: undefined,
			} as never);

			expect(getLatestBuildOutcomeForWorkflow).not.toHaveBeenCalled();
			expect(suspend).toHaveBeenCalled();
			expect(suspend.mock.calls[0][0].setupRequests).toEqual([
				expect.objectContaining({ node: expect.objectContaining({ name: 'Slack' }) }),
			]);
		});

		it('should not scope setup when the latest build belongs to an earlier run', async () => {
			// A setup call outside the build's own run is user-initiated ("set up
			// my workflow"), so it must cover the whole workflow.
			(analyzeWorkflow as Mock).mockResolvedValue([
				{
					node: { name: 'Slack', type: 'n8n-nodes-base.slack' },
					credentialType: 'slackApi',
					needsAction: true,
				},
			]);

			const context = createMockContext({
				runId: 'run-2',
				workflowBuildContext: {
					threadId: 't1',
					runId: 'run-2',
					taskId: 'task-1',
					workItemId: 'wi-1',
					workflowTaskService: {
						getLatestBuildOutcomeForWorkflow: vi
							.fn()
							.mockResolvedValue({ runId: 'run-1', changedNodeNames: ['Build Message'] }),
					},
				} as never,
			});
			const suspend = vi.fn();

			const tool = createWorkflowsTool(context, 'full');
			await executeTool(tool, { action: 'setup', workflowId: 'wf1' }, {
				suspend,
				resumeData: undefined,
			} as never);

			expect(suspend).toHaveBeenCalled();
			expect(suspend.mock.calls[0][0].setupRequests).toEqual([
				expect.objectContaining({ node: expect.objectContaining({ name: 'Slack' }) }),
			]);
		});

		it('should not scope setup when the latest build outcome has no changed-node list', async () => {
			(analyzeWorkflow as Mock).mockResolvedValue([
				{
					node: { name: 'Slack', type: 'n8n-nodes-base.slack' },
					credentialType: 'slackApi',
					needsAction: true,
				},
			]);

			const context = createMockContext({
				workflowBuildContext: {
					threadId: 't1',
					runId: 'r1',
					taskId: 'task-1',
					workItemId: 'wi-1',
					workflowTaskService: {
						getLatestBuildOutcomeForWorkflow: vi.fn().mockResolvedValue(undefined),
					},
				} as never,
			});
			const suspend = vi.fn();

			const tool = createWorkflowsTool(context, 'full');
			await executeTool(tool, { action: 'setup', workflowId: 'wf1' }, {
				suspend,
				resumeData: undefined,
			} as never);

			expect(suspend).toHaveBeenCalled();
			expect(suspend.mock.calls[0][0].setupRequests).toEqual([
				expect.objectContaining({ node: expect.objectContaining({ name: 'Slack' }) }),
			]);
		});

		it('should reject a new plain generic credential on an HTTP Request node', async () => {
			(analyzeWorkflow as Mock).mockResolvedValue([
				{
					node: { name: 'Call Replicate', type: 'n8n-nodes-base.httpRequest' },
					credentialType: 'httpBearerAuth',
					existingCredentials: [],
					needsAction: true,
				},
			]);

			const context = createMockContext();
			const suspend = vi.fn();

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(tool, { action: 'setup', workflowId: 'wf1' }, {
				suspend,
				resumeData: undefined,
			} as never);

			expect(suspend).not.toHaveBeenCalled();
			expect(result).toMatchObject({
				error: 'plain_generic_auth',
				nodes: [{ nodeName: 'Call Replicate', credentialType: 'httpBearerAuth' }],
			});
		});

		it('should allow a plain generic credential when explicitly permitted', async () => {
			(analyzeWorkflow as Mock).mockResolvedValue([
				{
					node: { name: 'Call Replicate', type: 'n8n-nodes-base.httpRequest' },
					credentialType: 'httpBearerAuth',
					existingCredentials: [],
					needsAction: true,
				},
			]);

			const context = createMockContext();
			const suspend = vi.fn();

			const tool = createWorkflowsTool(context, 'full');
			await executeTool(tool, { action: 'setup', workflowId: 'wf1', allowPlainGenericAuth: true }, {
				suspend,
				resumeData: undefined,
			} as never);

			expect(suspend).toHaveBeenCalled();
		});

		it('should accept a credential test URL on the workflow service origin', async () => {
			const fixture = templatedSetupFixture({ testUrl: 'https://api.example.com/me' });
			(analyzeWorkflow as Mock).mockResolvedValue([fixture.request]);
			const suspend = vi.fn();

			const tool = createWorkflowsTool(createMockContext(), 'full');
			await executeTool(tool, fixture.input, { suspend, resumeData: undefined } as never);

			expect(suspend).toHaveBeenCalledWith(
				expect.objectContaining({
					workflowId: 'wf1',
					credentialDestination: {
						origin: 'https://api.example.com',
						nodeNames: ['Fetch account'],
					},
				}),
			);
		});

		it('should remember an approved credential destination and open setup', async () => {
			const first = templatedSetupFixture({ testUrl: 'https://api.example.com/me' });
			const second = templatedSetupFixture({ testUrl: 'https://api.example.com/me' });
			(analyzeWorkflow as Mock)
				.mockResolvedValueOnce([first.request])
				.mockResolvedValueOnce([second.request]);
			const grantSessionToolApproval = vi.fn().mockResolvedValue(undefined);
			const context = createMockContext({ grantSessionToolApproval });
			const suspend = vi.fn();
			const tool = createWorkflowsTool(context, 'full');

			await executeTool(tool, first.input, { suspend, resumeData: undefined } as never);
			suspend.mockClear();
			await executeTool(tool, first.input, {
				suspend,
				resumeData: {
					approved: true,
					credentialDestination: { origin: 'https://api.example.com' },
				},
			} as never);

			expect(grantSessionToolApproval).toHaveBeenCalledWith(
				buildCredentialDestinationGrantKey('wf1', 'https://api.example.com'),
			);
			expect(suspend).toHaveBeenCalledWith(
				expect.objectContaining({
					message: 'Configure credentials for your workflow',
					setupRequests: [second.request],
				}),
			);
		});

		it('should reuse approval only for the same workflow credential destination', async () => {
			const fixture = templatedSetupFixture({ testUrl: 'https://api.example.com/me' });
			(analyzeWorkflow as Mock).mockResolvedValue([fixture.request]);
			const context = createMockContext({
				sessionApprovedToolKeys: new Set([
					buildCredentialDestinationGrantKey('wf1', 'https://api.example.com'),
				]),
			});
			const suspend = vi.fn();

			const tool = createWorkflowsTool(context, 'full');
			await executeTool(tool, fixture.input, { suspend, resumeData: undefined } as never);

			expect(suspend).toHaveBeenCalledWith(
				expect.objectContaining({
					message: 'Configure credentials for your workflow',
					setupRequests: [fixture.request],
				}),
			);
		});

		it('should require review again when the credential destination changes', async () => {
			const fixture = templatedSetupFixture({
				nodeUrl: 'https://api-v2.example.com/v1/account',
				testUrl: 'https://api-v2.example.com/me',
				serviceOrigin: 'https://api-v2.example.com',
			});
			(analyzeWorkflow as Mock).mockResolvedValue([fixture.request]);
			const grantSessionToolApproval = vi.fn();
			const suspend = vi.fn();

			const tool = createWorkflowsTool(createMockContext({ grantSessionToolApproval }), 'full');
			const result = await executeTool(tool, fixture.input, {
				suspend,
				resumeData: {
					approved: true,
					credentialDestination: { origin: 'https://api.example.com' },
				},
			} as never);

			expect(result).toMatchObject({ error: 'credential_destination_changed' });
			expect(grantSessionToolApproval).not.toHaveBeenCalled();
			expect(suspend).not.toHaveBeenCalled();
		});

		it('should stop setup when the credential destination is declined', async () => {
			const tool = createWorkflowsTool(createMockContext(), 'full');
			const result = await executeTool(tool, { action: 'setup', workflowId: 'wf1' }, {
				resumeData: {
					approved: false,
					credentialDestination: { origin: 'https://api.example.com' },
				},
			} as never);

			expect(result).toMatchObject({
				success: false,
				denied: true,
				reason: 'User did not approve credential use with https://api.example.com.',
			});
			expect(analyzeWorkflow).not.toHaveBeenCalled();
		});

		it('should reject a credential test URL on a different service origin', async () => {
			const fixture = templatedSetupFixture({ testUrl: 'https://status.example.net/me' });
			(analyzeWorkflow as Mock).mockResolvedValue([fixture.request]);
			const suspend = vi.fn();

			const tool = createWorkflowsTool(createMockContext(), 'full');
			const result = await executeTool(tool, fixture.input, {
				suspend,
				resumeData: undefined,
			} as never);

			expect(result).toMatchObject({ error: 'invalid_credential_hints' });
			expect(suspend).not.toHaveBeenCalled();
		});

		it('should reject a templated setup when the workflow service origin is unavailable', async () => {
			const fixture = templatedSetupFixture({
				nodeUrl: '={{ $json.url }}',
				serviceOrigin: null,
			});
			(analyzeWorkflow as Mock).mockResolvedValue([fixture.request]);
			const suspend = vi.fn();

			const tool = createWorkflowsTool(createMockContext(), 'full');
			const result = await executeTool(tool, fixture.input, {
				suspend,
				resumeData: undefined,
			} as never);

			expect(result).toMatchObject({
				error: 'invalid_credential_hints',
				problems: [expect.stringContaining('no statically derivable HTTP origin')],
			});
			expect(suspend).not.toHaveBeenCalled();
		});

		it('should allow a plain generic type when credentials of it already exist', async () => {
			(analyzeWorkflow as Mock).mockResolvedValue([
				{
					node: { name: 'Call Replicate', type: 'n8n-nodes-base.httpRequest' },
					credentialType: 'httpBearerAuth',
					existingCredentials: [{ id: 'cred-1', name: 'Existing bearer' }],
					needsAction: true,
				},
			]);

			const context = createMockContext();
			const suspend = vi.fn();

			const tool = createWorkflowsTool(context, 'full');
			await executeTool(tool, { action: 'setup', workflowId: 'wf1' }, {
				suspend,
				resumeData: undefined,
			} as never);

			expect(suspend).toHaveBeenCalled();
		});

		it('should not gate plain generic auth on non-HTTP-Request nodes', async () => {
			(analyzeWorkflow as Mock).mockResolvedValue([
				{
					node: { name: 'MCP Client', type: 'n8n-nodes-langchain.mcpClientTool' },
					credentialType: 'httpBearerAuth',
					existingCredentials: [],
					needsAction: true,
				},
			]);

			const context = createMockContext();
			const suspend = vi.fn();

			const tool = createWorkflowsTool(context, 'full');
			await executeTool(tool, { action: 'setup', workflowId: 'wf1' }, {
				suspend,
				resumeData: undefined,
			} as never);

			expect(suspend).toHaveBeenCalled();
		});

		it('should return success when no nodes need setup', async () => {
			(analyzeWorkflow as Mock).mockResolvedValue([]);

			const context = createMockContext();

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(tool, { action: 'setup', workflowId: 'wf1' }, {
				resumeData: undefined,
			} as never);

			expect(result).toEqual({ success: true, reason: 'No nodes require setup.' });
		});

		it('forwards resumeData.nodeParameters to applyNodeChanges on apply', async () => {
			// Regression: even though the FE sends `nodeParameters` in the confirm
			// POST, the e2e test showed the workflow's parameter was empty after
			// apply. This pins down the tool-layer contract between the resume
			// payload and the service call — if this ever drifts we catch it here.
			(analyzeWorkflow as Mock).mockResolvedValue([]);
			(applyNodeChanges as Mock).mockResolvedValue({ applied: ['HTTP Request'], failed: [] });

			const context = createMockContext();
			(context.workflowService.getAsWorkflowJSON as Mock).mockResolvedValue({
				name: 'Test WF',
				nodes: [
					{
						id: 'http',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 4.2,
						position: [0, 0],
						parameters: { method: 'GET', url: '', authentication: 'none' },
					},
				],
				connections: {},
			});

			const tool = createWorkflowsTool(context, 'full');
			await executeTool(tool, { action: 'setup', workflowId: 'wf1' }, {
				resumeData: {
					approved: true,
					action: 'apply',
					nodeParameters: { 'HTTP Request': { url: 'https://example.com/api' } },
				},
			} as never);

			expect(applyNodeChanges).toHaveBeenCalledWith(context, 'wf1', undefined, {
				'HTTP Request': { url: 'https://example.com/api' },
			});
			expect(buildCompletedReport).toHaveBeenCalledWith(
				undefined,
				{ 'HTTP Request': { url: 'https://example.com/api' } },
				['HTTP Request'],
			);
		});

		it('reports a just-applied credential whose test failed as a failed node', async () => {
			// A bound credential is settled (needsAction=false) even when its test
			// fails, so the apply path must re-analyze with includeSettled to keep
			// the failure reportable instead of silently marking the node complete.
			(analyzeWorkflow as Mock).mockResolvedValue([
				{
					node: { name: 'Slack', type: 'n8n-nodes-base.slack' },
					credentialType: 'slackApi',
					needsAction: false,
					credentialTestResult: { success: false, message: 'Invalid token' },
				},
			]);
			(applyNodeChanges as Mock).mockResolvedValue({ applied: ['Slack'], failed: [] });
			(buildCompletedReport as Mock).mockReturnValue([
				{ nodeName: 'Slack', credentialType: 'slackApi' },
			]);

			const context = createMockContext();

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(tool, { action: 'setup', workflowId: 'wf1' }, {
				resumeData: {
					approved: true,
					action: 'apply',
					credentials: { Slack: { slackApi: 'cred-1' } },
				},
			} as never);

			expect(analyzeWorkflow).toHaveBeenCalledWith(context, 'wf1', undefined, {
				includeSettled: true,
				appliedCredentialIds: ['cred-1'],
			});
			expect(result).toMatchObject({
				success: true,
				completedNodes: [],
				failedNodes: [
					{
						nodeName: 'Slack',
						error: 'Credential test failed for slackApi: Invalid token',
					},
				],
			});
			// Settled requests never count as pending, so the apply is not partial.
			expect(result).not.toHaveProperty('partial');
		});

		describe('credentials the user skipped', () => {
			const slackRequest = {
				node: { name: 'Post to Slack', type: 'n8n-nodes-base.slack' },
				credentialType: 'slackApi',
				needsAction: true,
				credentialNeedsAction: true,
			};
			const sheetsRequest = {
				node: { name: 'Log to Sheet', type: 'n8n-nodes-base.googleSheets' },
				credentialType: 'googleSheetsOAuth2Api',
				needsAction: true,
				credentialNeedsAction: true,
			};
			/** Sheets is connected — this card only asks for a parameter on this one node. */
			const sheetsParamRequest = {
				node: { name: 'Log to Sheet', type: 'n8n-nodes-base.googleSheets' },
				credentialType: 'googleSheetsOAuth2Api',
				needsAction: true,
				parameterIssues: { documentId: ['Placeholder "SPREADSHEET_ID"'] },
			};

			/** Mirrors the service wiring: one mutable set, read and written through the context. */
			function createGrantAwareContext(granted: string[] = []) {
				const sessionApprovedToolKeys = new Set(granted);
				return createMockContext({
					sessionApprovedToolKeys,
					grantSessionToolApproval: vi.fn(async (key: string) => {
						await Promise.resolve();
						sessionApprovedToolKeys.add(key);
					}),
					revokeSessionToolApproval: vi.fn(async (key: string) => {
						await Promise.resolve();
						sessionApprovedToolKeys.delete(key);
					}),
				});
			}

			it('leaves skipped credentials out of the setup card', async () => {
				(analyzeWorkflow as Mock).mockResolvedValue([slackRequest, sheetsRequest]);
				const context = createGrantAwareContext(['workflows:setup-skip:cred:slackApi']);
				const suspend = vi.fn();

				const tool = createWorkflowsTool(context, 'full');
				await executeTool(tool, { action: 'setup', workflowId: 'wf1' }, {
					suspend,
					resumeData: undefined,
				} as never);

				expect(suspend.mock.calls[0][0]).toMatchObject({ setupRequests: [sheetsRequest] });
			});

			it('reports instead of suspending when only skipped credentials remain', async () => {
				(analyzeWorkflow as Mock).mockResolvedValue([slackRequest]);
				const context = createGrantAwareContext(['workflows:setup-skip:cred:slackApi']);
				const suspend = vi.fn();

				const tool = createWorkflowsTool(context, 'full');
				const result = await executeTool(tool, { action: 'setup', workflowId: 'wf1' }, {
					suspend,
					resumeData: undefined,
				} as never);

				expect(suspend).not.toHaveBeenCalled();
				expect(result).toMatchObject({
					success: true,
					skippedByUser: [{ nodeName: 'Post to Slack', credentialType: 'slackApi' }],
				});
			});

			it('re-opens a skipped card when the user asks for it', async () => {
				(analyzeWorkflow as Mock).mockResolvedValue([slackRequest]);
				const context = createGrantAwareContext(['workflows:setup-skip:cred:slackApi']);
				const suspend = vi.fn();

				const tool = createWorkflowsTool(context, 'full');
				await executeTool(
					tool,
					{ action: 'setup', workflowId: 'wf1', reopenSkipped: ['Post to Slack'] },
					{
						suspend,
						resumeData: undefined,
					} as never,
				);

				expect(context.revokeSessionToolApproval).toHaveBeenCalledWith(
					'workflows:setup-skip:cred:slackApi',
				);
				expect(suspend.mock.calls[0][0]).toMatchObject({ setupRequests: [slackRequest] });
			});

			it('reports a skipped card and an out-of-scope one separately', async () => {
				// The two filters answer different questions — "did this build touch it" and "did the
				// user decline it" — and the agent has to say different things about each, so neither
				// report may swallow the other.
				(analyzeWorkflow as Mock).mockResolvedValue([slackRequest, sheetsRequest]);
				const context = createGrantAwareContext(['workflows:setup-skip:cred:slackApi']);
				context.runId = 'run-1';
				(context as { workflowBuildContext?: unknown }).workflowBuildContext = {
					threadId: 't1',
					runId: 'run-1',
					taskId: 'task-1',
					workItemId: 'wi-1',
					workflowTaskService: {
						getLatestBuildOutcomeForWorkflow: vi
							.fn()
							.mockResolvedValue({ runId: 'run-1', changedNodeNames: ['Post to Slack'] }),
					},
				};
				const suspend = vi.fn();

				const tool = createWorkflowsTool(context, 'full');
				const result = await executeTool(tool, { action: 'setup', workflowId: 'wf1' }, {
					suspend,
					resumeData: undefined,
				} as never);

				// Slack is in scope but declined; Sheets is pending but untouched by this build.
				expect(suspend).not.toHaveBeenCalled();
				expect(result).toMatchObject({
					success: true,
					skippedByUser: [{ nodeName: 'Post to Slack', reopenWith: 'slackApi' }],
				});
				expect(result).toHaveProperty('reason', expect.stringContaining('already skipped'));
				expect(result).toHaveProperty('reason', expect.stringContaining('"Log to Sheet"'));
			});

			it('still hides a skipped card that the build did change', async () => {
				(analyzeWorkflow as Mock).mockResolvedValue([slackRequest, sheetsRequest]);
				const context = createGrantAwareContext(['workflows:setup-skip:cred:slackApi']);
				context.runId = 'run-1';
				(context as { workflowBuildContext?: unknown }).workflowBuildContext = {
					threadId: 't1',
					runId: 'run-1',
					taskId: 'task-1',
					workItemId: 'wi-1',
					workflowTaskService: {
						getLatestBuildOutcomeForWorkflow: vi.fn().mockResolvedValue({
							runId: 'run-1',
							changedNodeNames: ['Post to Slack', 'Log to Sheet'],
						}),
					},
				};
				const suspend = vi.fn();

				const tool = createWorkflowsTool(context, 'full');
				await executeTool(tool, { action: 'setup', workflowId: 'wf1' }, {
					suspend,
					resumeData: undefined,
				} as never);

				// Being in scope does not override the user's decision.
				expect(suspend.mock.calls[0][0]).toMatchObject({ setupRequests: [sheetsRequest] });
			});

			it('reports a reopen request that names nothing in the workflow', async () => {
				// Otherwise the guidance tells the caller to wait until the user asks — which is
				// exactly what just happened — and the request disappears.
				(analyzeWorkflow as Mock).mockResolvedValue([slackRequest]);
				const context = createGrantAwareContext(['workflows:setup-skip:cred:slackApi']);
				const suspend = vi.fn();

				const tool = createWorkflowsTool(context, 'full');
				const result = await executeTool(
					tool,
					{ action: 'setup', workflowId: 'wf1', reopenSkipped: ['Notion'] },
					{ suspend, resumeData: undefined } as never,
				);

				expect(suspend).not.toHaveBeenCalled();
				expect(result).toMatchObject({
					error: 'unknown_reopen_target',
					unmatchedReopen: ['Notion'],
					reopenable: [{ nodeName: 'Post to Slack', reopenWith: 'slackApi' }],
				});
			});

			it('reports an unknown entry even when another one resolves', async () => {
				// "connect Slack and Notion" with no Notion node: opening the Slack card and
				// suspending would drop half of what the user asked for with nowhere to report it.
				(analyzeWorkflow as Mock).mockResolvedValue([slackRequest, sheetsRequest]);
				const context = createGrantAwareContext(['workflows:setup-skip:cred:slackApi']);
				const suspend = vi.fn();

				const tool = createWorkflowsTool(context, 'full');
				const result = await executeTool(
					tool,
					{ action: 'setup', workflowId: 'wf1', reopenSkipped: ['slackApi', 'Notion'] },
					{ suspend, resumeData: undefined } as never,
				);

				expect(suspend).not.toHaveBeenCalled();
				expect(result).toMatchObject({
					error: 'unknown_reopen_target',
					unmatchedReopen: ['Notion'],
				});
				// Nothing is un-skipped until the whole request is valid, so the retry is clean.
				expect(context.revokeSessionToolApproval).not.toHaveBeenCalled();
			});

			it('tells the caller to drop reopenSkipped when nothing is skipped', async () => {
				(analyzeWorkflow as Mock).mockResolvedValue([slackRequest]);
				const context = createGrantAwareContext();
				const suspend = vi.fn();

				const tool = createWorkflowsTool(context, 'full');
				const result = await executeTool(
					tool,
					{ action: 'setup', workflowId: 'wf1', reopenSkipped: ['Notion'] },
					{ suspend, resumeData: undefined } as never,
				);

				expect(result).toMatchObject({ error: 'unknown_reopen_target', reopenable: [] });
				expect(result).toHaveProperty(
					'message',
					expect.stringContaining('without `reopenSkipped`'),
				);
			});

			it('keeps a skipped parameter card from silencing that credential elsewhere', async () => {
				// The Sheets credential works; the user passed on filling in the document id. A new
				// node that genuinely needs the Sheets credential must still be asked about.
				(analyzeWorkflow as Mock).mockResolvedValue([sheetsParamRequest]);
				const context = createGrantAwareContext();

				const tool = createWorkflowsTool(context, 'full');
				await executeTool(tool, { action: 'setup', workflowId: 'wf1' }, {
					resumeData: { approved: false },
				} as never);

				expect(context.grantSessionToolApproval).toHaveBeenCalledWith(
					'workflows:setup-skip:node:wf1:Log to Sheet',
				);
				expect(context.grantSessionToolApproval).not.toHaveBeenCalledWith(
					'workflows:setup-skip:cred:googleSheetsOAuth2Api',
				);
			});

			it('remembers everything still pending when the user skips the whole card', async () => {
				(analyzeWorkflow as Mock).mockResolvedValue([slackRequest, sheetsRequest]);
				const context = createGrantAwareContext();

				const tool = createWorkflowsTool(context, 'full');
				const result = await executeTool(tool, { action: 'setup', workflowId: 'wf1' }, {
					resumeData: { approved: false },
				} as never);

				expect(context.grantSessionToolApproval).toHaveBeenCalledWith(
					'workflows:setup-skip:cred:slackApi',
				);
				expect(context.grantSessionToolApproval).toHaveBeenCalledWith(
					'workflows:setup-skip:cred:googleSheetsOAuth2Api',
				);
				expect(result).toMatchObject({ success: true, deferred: true });
			});

			it('separates a card the user skipped from one that is merely unconfigured', async () => {
				// The Slack card was dismissed; the Sheets one was left half-filled. Reporting both
				// as "still need configuration" is what made the agent re-open setup.
				(analyzeWorkflow as Mock).mockResolvedValue([slackRequest, sheetsRequest]);
				(applyNodeChanges as Mock).mockResolvedValue({ applied: [], failed: [] });
				(buildCompletedReport as Mock).mockReturnValue([]);
				const context = createGrantAwareContext();

				const tool = createWorkflowsTool(context, 'full');
				const result = await executeTool(tool, { action: 'setup', workflowId: 'wf1' }, {
					resumeData: {
						approved: true,
						action: 'apply',
						skippedNodes: ['Post to Slack'],
					},
				} as never);

				expect(context.grantSessionToolApproval).toHaveBeenCalledWith(
					'workflows:setup-skip:cred:slackApi',
				);
				expect(result).toMatchObject({
					partial: true,
					nodesStillNeedingSetup: [{ nodeName: 'Log to Sheet' }],
					skippedByUser: [{ nodeName: 'Post to Slack', credentialType: 'slackApi' }],
				});
			});

			it('forgets a skip once that credential is configured', async () => {
				(analyzeWorkflow as Mock).mockResolvedValue([{ ...slackRequest, needsAction: false }]);
				(applyNodeChanges as Mock).mockResolvedValue({ applied: ['Post to Slack'], failed: [] });
				(buildCompletedReport as Mock).mockReturnValue([
					{ nodeName: 'Post to Slack', credentialType: 'slackApi' },
				]);
				const context = createGrantAwareContext(['workflows:setup-skip:cred:slackApi']);

				const tool = createWorkflowsTool(context, 'full');
				const result = await executeTool(tool, { action: 'setup', workflowId: 'wf1' }, {
					resumeData: {
						approved: true,
						action: 'apply',
						credentials: { 'Post to Slack': { slackApi: 'cred-1' } },
					},
				} as never);

				expect(context.revokeSessionToolApproval).toHaveBeenCalledWith(
					'workflows:setup-skip:cred:slackApi',
				);
				expect(result).not.toHaveProperty('skippedByUser');
			});

			it('keeps skipped cards out of the panel a trigger test rebuilds', async () => {
				// The re-suspend re-derives the requests from scratch, so it has to partition again —
				// otherwise testing a trigger mid-session puts back the card the user dismissed.
				(analyzeWorkflow as Mock).mockResolvedValue([slackRequest, sheetsRequest]);
				(applyNodeChanges as Mock).mockResolvedValue({ applied: [], failed: [] });
				const context = createGrantAwareContext(['workflows:setup-skip:cred:slackApi']);
				(context.executionService.run as Mock).mockResolvedValue({ status: 'success' });
				const suspend = vi.fn();

				const tool = createWorkflowsTool(context, 'full');
				await executeTool(tool, { action: 'setup', workflowId: 'wf1' }, {
					suspend,
					resumeData: {
						approved: true,
						action: 'test-trigger',
						testTriggerNode: 'Log to Sheet',
					},
				} as never);

				expect(suspend).toHaveBeenCalledTimes(1);
				expect(suspend.mock.calls[0][0]).toMatchObject({ setupRequests: [sheetsRequest] });
			});

			it('revalidates the credential test destination after a trigger test', async () => {
				const fixture = templatedSetupFixture({ testUrl: 'https://status.example.net/me' });
				(analyzeWorkflow as Mock).mockResolvedValue([fixture.request]);
				(applyNodeChanges as Mock).mockResolvedValue({ applied: [], failed: [] });
				const context = createGrantAwareContext();
				(context.executionService.run as Mock).mockResolvedValue({ status: 'success' });
				const suspend = vi.fn();

				const tool = createWorkflowsTool(context, 'full');
				const result = await executeTool(tool, fixture.input, {
					suspend,
					resumeData: {
						approved: true,
						action: 'test-trigger',
						testTriggerNode: 'Fetch account',
					},
				} as never);

				expect(result).toMatchObject({ error: 'invalid_credential_hints' });
				expect(suspend).not.toHaveBeenCalled();
			});

			it('checks refreshed credential test destinations against skipped node URLs', async () => {
				const fixture = templatedSetupFixture({
					testUrl: 'https://api.example.com/v1/action',
				});
				const skippedRequest = {
					node: {
						name: 'Run action',
						type: 'n8n-nodes-base.httpRequest',
						parameters: { url: fixture.recipe.testUrl },
					},
					credentialType: 'httpHeaderAuth',
					needsAction: true,
					credentialNeedsAction: true,
				};
				(analyzeWorkflow as Mock).mockResolvedValue([fixture.request, skippedRequest]);
				(applyNodeChanges as Mock).mockResolvedValue({ applied: [], failed: [] });
				const context = createGrantAwareContext(['workflows:setup-skip:cred:httpHeaderAuth']);
				(context.executionService.run as Mock).mockResolvedValue({ status: 'success' });
				const suspend = vi.fn();

				const tool = createWorkflowsTool(context, 'full');
				const result = await executeTool(tool, fixture.input, {
					suspend,
					resumeData: {
						approved: true,
						action: 'test-trigger',
						testTriggerNode: 'Fetch account',
					},
				} as never);

				expect(result).toMatchObject({ error: 'invalid_credential_hints' });
				expect(suspend).not.toHaveBeenCalled();
			});

			it('keeps another node Slack skip when only a parameter was completed', async () => {
				// "Alert on Slack" was connected already and only needed a channel. Clearing the
				// type-wide record here would re-open the card "Post to Slack" was skipped on.
				const alertParamRequest = {
					node: { name: 'Alert on Slack', type: 'n8n-nodes-base.slack' },
					credentialType: 'slackApi',
					needsAction: false,
				};
				(analyzeWorkflow as Mock).mockResolvedValue([slackRequest, alertParamRequest]);
				(applyNodeChanges as Mock).mockResolvedValue({ applied: ['Alert on Slack'], failed: [] });
				(buildCompletedReport as Mock).mockReturnValue([
					{ nodeName: 'Alert on Slack', parametersSet: ['channel'] },
				]);
				const context = createGrantAwareContext(['workflows:setup-skip:cred:slackApi']);

				const tool = createWorkflowsTool(context, 'full');
				await executeTool(tool, { action: 'setup', workflowId: 'wf1' }, {
					resumeData: {
						approved: true,
						action: 'apply',
						nodeParameters: { 'Alert on Slack': { channel: '#general' } },
					},
				} as never);

				expect(context.revokeSessionToolApproval).not.toHaveBeenCalledWith(
					'workflows:setup-skip:cred:slackApi',
				);
			});
		});

		describe('credential slots the resume just filled', () => {
			// The analysis's credential list view can lag a credential created moments
			// ago; slots this resume bound settle on the apply result instead.
			it('hands just-applied credential ids to the post-apply analysis', async () => {
				(analyzeWorkflow as Mock).mockResolvedValue([]);
				(applyNodeChanges as Mock).mockResolvedValue({ applied: ['Call Replicate'], failed: [] });
				(buildCompletedReport as Mock).mockReturnValue([
					{ nodeName: 'Call Replicate', credentialType: 'httpBearerAuth' },
				]);
				const context = createMockContext();

				const tool = createWorkflowsTool(context, 'full');
				await executeTool(tool, { action: 'setup', workflowId: 'wf1' }, {
					resumeData: {
						approved: true,
						action: 'apply',
						credentials: { 'Call Replicate': { httpBearerAuth: 'cred-new' } },
					},
				} as never);

				expect(analyzeWorkflow).toHaveBeenCalledWith(context, 'wf1', undefined, {
					includeSettled: true,
					appliedCredentialIds: ['cred-new'],
				});
			});

			it('hands just-applied credential ids to the trigger-test analysis', async () => {
				(analyzeWorkflow as Mock).mockResolvedValue([]);
				(applyNodeChanges as Mock).mockResolvedValue({ applied: ['Call Replicate'], failed: [] });
				const context = createMockContext();
				(context.executionService.run as Mock).mockResolvedValue({ status: 'success' });
				const suspend = vi.fn();

				const tool = createWorkflowsTool(context, 'full');
				await executeTool(tool, { action: 'setup', workflowId: 'wf1' }, {
					suspend,
					resumeData: {
						approved: true,
						action: 'test-trigger',
						testTriggerNode: 'Receive Photo Request',
						credentials: { 'Call Replicate': { httpBearerAuth: 'cred-new' } },
					},
				} as never);

				expect(analyzeWorkflow).toHaveBeenCalledWith(
					context,
					'wf1',
					{ 'Receive Photo Request': { status: 'success' } },
					{ appliedCredentialIds: ['cred-new'] },
				);
			});

			it('does not vouch for a credential id whose application failed', async () => {
				(analyzeWorkflow as Mock).mockResolvedValue([]);
				(applyNodeChanges as Mock).mockResolvedValue({
					applied: [],
					failed: [{ nodeName: 'Call Replicate', error: 'Credential not found: cred-gone' }],
				});
				(buildCompletedReport as Mock).mockReturnValue([]);
				const context = createMockContext();

				const tool = createWorkflowsTool(context, 'full');
				await executeTool(tool, { action: 'setup', workflowId: 'wf1' }, {
					resumeData: {
						approved: true,
						action: 'apply',
						credentials: { 'Call Replicate': { httpBearerAuth: 'cred-gone' } },
					},
				} as never);

				expect(analyzeWorkflow).toHaveBeenCalledWith(context, 'wf1', undefined, {
					includeSettled: true,
					appliedCredentialIds: [],
				});
			});
		});
	});

	describe('unpublish action', () => {
		it('should unpublish when approved', async () => {
			const context = createMockContext();

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(tool, { action: 'unpublish', workflowId: 'wf1' }, {
				resumeData: { approved: true },
			} as never);

			expect(context.workflowService.unpublish).toHaveBeenCalledWith('wf1');
			expect(result).toEqual({ success: true });
		});

		it('should suspend for confirmation using the looked-up workflow name', async () => {
			const context = createMockContext();
			(context.workflowService.get as Mock).mockResolvedValue({
				id: 'wf1',
				name: 'My WF',
			});
			const suspend = vi.fn();

			const tool = createWorkflowsTool(context, 'full');
			await executeTool(tool, { action: 'unpublish', workflowId: 'wf1' }, {
				suspend,
				resumeData: undefined,
			} as never);

			expect(context.workflowService.get).toHaveBeenCalledWith('wf1');
			expect(suspend).toHaveBeenCalled();
			expect(suspend.mock.calls[0][0]).toMatchObject({
				message: 'Unpublish My WF (ID: wf1)',
				severity: 'warning',
			});
		});
	});
});

describe('node usage', () => {
	const withNodeUsage = (result: unknown = { workflowsInScope: 0, nodeTypes: [] }) => {
		const context = createMockContext();
		context.workflowService.nodeUsage = vi.fn().mockResolvedValue(result);
		return context;
	};

	describe('capability gate', () => {
		// The host attaches `nodeUsage` only when the dependency index is wired behind it, so the
		// agent must never be offered an action or a filter that would error.
		it('registers the action only when the service exposes nodeUsage', () => {
			expect(
				getInputSchema(createWorkflowsTool(withNodeUsage(), 'full')).safeParse({
					action: 'node-usage',
				}).success,
			).toBe(true);

			expect(
				getInputSchema(createWorkflowsTool(createMockContext(), 'full')).safeParse({
					action: 'node-usage',
				}).success,
			).toBe(false);
		});

		// The field is omitted from the schema rather than ignored downstream, so zod strips it and
		// the handler cannot receive it — which is also what keeps it out of the schema the model reads.
		it('offers the nodeTypes filter on list under the same condition', () => {
			const parseList = (context: InstanceAiContext) =>
				parseInput(createWorkflowsTool(context, 'full'), {
					action: 'list',
					nodeTypes: ['n8n-nodes-base.slack'],
				});

			expect(parseList(withNodeUsage())).toMatchObject({ nodeTypes: ['n8n-nodes-base.slack'] });
			expect(parseList(createMockContext())).not.toHaveProperty('nodeTypes');
		});
	});

	describe('histogram', () => {
		it('returns the counts with the denominator and states the surface limits', async () => {
			const context = withNodeUsage({
				workflowsInScope: 10,
				nodeTypes: [{ nodeType: '@n8n/n8n-nodes-langchain.lmChatAnthropic', workflowCount: 10 }],
			});
			const tool = createWorkflowsTool(context, 'full');

			const result = await executeTool<{
				workflowsInScope: number;
				nodeTypes: Array<{ nodeType: string; workflowCount: number }>;
				note: string;
			}>(tool, { action: 'node-usage' } as never, {} as never);

			expect(result.workflowsInScope).toBe(10);
			expect(result.nodeTypes).toEqual([
				{ nodeType: '@n8n/n8n-nodes-langchain.lmChatAnthropic', workflowCount: 10 },
			]);
			// An absence is evidence, not a gap — and the note has to say so, or a type the project
			// never uses reads as "unknown" rather than "not chosen".
			expect(result.note).toContain('absent from this list is used by no workflow in scope');
			expect(result.note).toContain('Node types only');
		});

		// The claim above is only true of a complete list. On a cut one it is actively wrong, so
		// the note has to withdraw it rather than repeat it.
		it('withdraws the absence claim when the list is cut', async () => {
			const context = withNodeUsage({
				workflowsInScope: 40,
				nodeTypes: [{ nodeType: 'n8n-nodes-base.slack', workflowCount: 9 }],
				truncated: true,
			});
			const tool = createWorkflowsTool(context, 'full');

			const result = await executeTool<{ truncated?: boolean; note: string }>(
				tool,
				{ action: 'node-usage', limit: 1 } as never,
				{} as never,
			);

			expect(result.truncated).toBe(true);
			expect(result.note).toContain('do not read an absence as evidence');
			expect(result.note).not.toContain('used by no workflow in scope');
		});

		it('passes the limit through to the service', async () => {
			const context = withNodeUsage();
			const tool = createWorkflowsTool(context, 'full');

			await executeTool(tool, { action: 'node-usage', limit: 5 } as never, {} as never);

			expect(context.workflowService.nodeUsage).toHaveBeenCalledWith({ limit: 5 });
		});
	});

	describe('workflows for a node type', () => {
		it('names the workflows using a type and reports truncation', async () => {
			const context = withNodeUsage({
				workflowsInScope: 12,
				workflows: [
					{ workflowId: 'wf-1', name: 'Daily sync', updatedAt: '2026-01-01T00:00:00.000Z' },
				],
				truncated: true,
			});
			const tool = createWorkflowsTool(context, 'full');

			const result = await executeTool(
				tool,
				{ action: 'node-usage', nodeType: 'n8n-nodes-base.slack', limit: 1 } as never,
				{} as never,
			);

			expect(context.workflowService.nodeUsage).toHaveBeenCalledWith({
				nodeType: 'n8n-nodes-base.slack',
				limit: 1,
			});
			expect(result).toEqual({
				nodeType: 'n8n-nodes-base.slack',
				workflowsInScope: 12,
				workflows: [
					{ workflowId: 'wf-1', name: 'Daily sync', updatedAt: '2026-01-01T00:00:00.000Z' },
				],
				truncated: true,
			});
		});
	});

	describe('list', () => {
		it('passes nodeTypes through to the service', async () => {
			const context = withNodeUsage();
			const tool = createWorkflowsTool(context, 'full');

			await executeTool(
				tool,
				{ action: 'list', nodeTypes: ['n8n-nodes-base.slack'] } as never,
				{} as never,
			);

			expect(context.workflowService.list).toHaveBeenCalledWith(
				expect.objectContaining({ nodeTypes: ['n8n-nodes-base.slack'] }),
			);
		});
	});
});
