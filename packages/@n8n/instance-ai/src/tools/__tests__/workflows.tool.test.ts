import type { InstanceAiPermissions } from '@n8n/api-types';
import { generateWorkflowCode } from '@n8n/workflow-sdk';
import type { Mock } from 'vitest';

import { executeTool } from '../../__tests__/tool-test-utils';
import type { InstanceAiContext } from '../../types';
import {
	analyzeWorkflow,
	applyNodeChanges,
	buildCompletedReport,
} from '../workflows/setup-workflow.service';
import { STRUCTURE_ONLY_NOTE } from '../workflows/summarize-workflow';
import { validateWorkflowConfig } from '../workflows/validate-workflow.service';
import {
	getWorkflowSourceFileBinding,
	saveWorkflowSourceFileBinding,
} from '../workflows/workflow-file-bindings';
import { createWorkflowsTool } from '../workflows.tool';

// Mock the setup-workflow.service module to avoid pulling in heavy dependencies
vi.mock('../workflows/setup-workflow.service', () => ({
	analyzeWorkflow: vi.fn().mockResolvedValue([]),
	applyCredentialHints: vi.fn(),
	applyNodeCredentials: vi.fn().mockResolvedValue({ failed: [] }),
	applyNodeParameters: vi.fn().mockResolvedValue({ failed: [] }),
	applyNodeChanges: vi.fn().mockResolvedValue({ applied: [], failed: [] }),
	buildCompletedReport: vi.fn().mockReturnValue([]),
}));

vi.mock('../workflows/validate-workflow.service', () => ({
	validateWorkflowConfig: vi.fn(),
}));

// Mock the dynamic import of @n8n/workflow-sdk used by get-as-code
vi.mock('@n8n/workflow-sdk', () => ({
	generateWorkflowCode: vi.fn().mockReturnValue('// generated code'),
}));

const emptyList = { workflows: [], total: 0, totalInScope: 0 };

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

function getInputSchema(tool: unknown): { safeParse: (input: unknown) => { success: boolean } } {
	return (tool as { inputSchema: { safeParse: (input: unknown) => { success: boolean } } })
		.inputSchema;
}

function getDescription(tool: unknown): string {
	return (tool as { description: string }).description;
}

describe('workflows tool', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('action schema', () => {
		it('should support get-as-code', async () => {
			const context = createMockContext();
			const tool = createWorkflowsTool(context);

			const result = await executeTool(
				tool,
				{ action: 'get-as-code', workflowId: 'w1' } as never,
				{} as never,
			);

			expect(result).toEqual({
				workflowId: 'w1',
				name: 'Test WF',
				code: '// generated code',
			});
		});

		it('should reject raw workflow actions', () => {
			const context = createMockContext();
			const tool = createWorkflowsTool(context);
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

	describe('validate action', () => {
		const validationResult = {
			workflowId: 'wf1',
			issues: {},
			summary: [],
			valid: true,
		};

		it('includes a report when the workflow has pinned data', async () => {
			vi.mocked(validateWorkflowConfig).mockResolvedValue(validationResult);
			const context = createMockContext();
			const getPinnedDataSummary = context.workflowService.getPinnedDataSummary;
			if (!getPinnedDataSummary) throw new Error('Expected pinned-data summary mock');
			vi.mocked(getPinnedDataSummary).mockResolvedValue([
				{ nodeName: 'Example Data', itemCount: 3 },
			]);

			const result = await executeTool(
				createWorkflowsTool(context),
				{ action: 'validate', workflowId: 'wf1' },
				{} as never,
			);

			expect(result).toEqual({
				...validationResult,
				pinnedNodes: [{ nodeName: 'Example Data', itemCount: 3 }],
				pinnedDataNote: expect.stringContaining('pinned data'),
			});
		});

		it('returns the validation result unchanged when no nodes are pinned', async () => {
			vi.mocked(validateWorkflowConfig).mockResolvedValue(validationResult);
			const context = createMockContext();

			const result = await executeTool(
				createWorkflowsTool(context),
				{ action: 'validate', workflowId: 'wf1' },
				{} as never,
			);

			expect(result).toEqual(validationResult);
		});

		it('keeps validation available when the pinned-data lookup fails', async () => {
			vi.mocked(validateWorkflowConfig).mockResolvedValue(validationResult);
			const context = createMockContext();
			const getPinnedDataSummary = context.workflowService.getPinnedDataSummary;
			if (!getPinnedDataSummary) throw new Error('Expected pinned-data summary mock');
			vi.mocked(getPinnedDataSummary).mockRejectedValue(new Error('pin lookup failed'));

			const result = await executeTool(
				createWorkflowsTool(context),
				{ action: 'validate', workflowId: 'wf1' },
				{} as never,
			);

			expect(result).toEqual(validationResult);
		});
	});

	describe('version actions', () => {
		it('should support version actions when listVersions exists', async () => {
			const context = createMockContext();
			const versions = [{ id: 'v1', versionId: 1 }];
			context.workflowService.listVersions = vi.fn().mockResolvedValue(versions);
			context.workflowService.getVersion = vi.fn();
			context.workflowService.restoreVersion = vi.fn();

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
			await executeTool(tool, { action: 'list', status: 'archived' }, {} as never);

			expect(context.workflowService.list).toHaveBeenCalledWith({ status: 'archived' });
		});

		it('should pass all status when listing all workflows', async () => {
			const context = createMockContext();
			(context.workflowService.list as Mock).mockResolvedValue(emptyList);

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
			const result = await executeTool(tool, { action: 'list' }, {} as never);

			expect(result).toEqual({ workflows: [], total: 0, totalInScope: 0 });
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

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
			const result = await executeTool(tool, { action: 'get', workflowId: 'wf1' }, {} as never);

			expect(result).toEqual(small);
		});

		it('should fall back to a plain structure listing when codegen fails', async () => {
			const context = createMockContext();
			(context.workflowService.get as Mock).mockResolvedValue(detail);
			vi.mocked(generateWorkflowCode).mockImplementationOnce(() => {
				throw new Error('unsupported graph');
			});

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
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

	describe('get-as-code action', () => {
		/**
		 * The code returned here is what the agent edits and builds back into the same
		 * saved workflow, so it has to carry node ids or the rebuild re-identifies every
		 * node (INS-970, INS-1120, INS-1179).
		 */
		it('should ask codegen to emit node ids for get-as-code', async () => {
			const context = createMockContext();
			const tool = createWorkflowsTool(context);

			await executeTool(tool, { action: 'get-as-code', workflowId: 'wf1' }, {} as never);

			expect(vi.mocked(generateWorkflowCode)).toHaveBeenCalledWith(
				expect.objectContaining({ includeNodeIds: true }),
			);
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

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
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
	});

	describe('delete action', () => {
		it('should return denied when permission is blocked', async () => {
			const context = createMockContext({
				permissions: { deleteWorkflow: 'blocked' },
			});

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
			const result = await executeTool(tool, { action: 'delete', workflowId: 'wf1' }, {
				resumeData: { approved: true },
			} as never);

			expect(context.workflowService.archive).toHaveBeenCalledWith('wf1');
			expect(result).toEqual({ success: true });
		});

		it('should return denied when user rejects', async () => {
			const context = createMockContext();

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
			const result = await executeTool(tool, { action: 'unarchive', workflowId: 'wf1' }, {
				suspend,
				resumeData: undefined,
			} as never);

			expect(result).toBe(suspension);
			expect(context.workflowService.unarchive).not.toHaveBeenCalled();
		});

		it('should unarchive when approved via resume', async () => {
			const context = createMockContext();

			const tool = createWorkflowsTool(context);
			const result = await executeTool(tool, { action: 'unarchive', workflowId: 'wf1' }, {
				resumeData: { approved: true },
			} as never);

			expect(context.workflowService.unarchive).toHaveBeenCalledWith('wf1');
			expect(result).toEqual({ success: true });
		});

		it('should return denied when user rejects', async () => {
			const context = createMockContext();

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
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
			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
			await executeTool(tool, { action: 'setup', workflowId: 'wf1', allowPlainGenericAuth: true }, {
				suspend,
				resumeData: undefined,
			} as never);

			expect(suspend).toHaveBeenCalled();
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

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
			await executeTool(tool, { action: 'setup', workflowId: 'wf1' }, {
				suspend,
				resumeData: undefined,
			} as never);

			expect(suspend).toHaveBeenCalled();
		});

		it('should return success when no nodes need setup', async () => {
			(analyzeWorkflow as Mock).mockResolvedValue([]);

			const context = createMockContext();

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
			const result = await executeTool(tool, { action: 'setup', workflowId: 'wf1' }, {
				resumeData: {
					approved: true,
					action: 'apply',
					credentials: { Slack: { slackApi: 'cred-1' } },
				},
			} as never);

			expect(analyzeWorkflow).toHaveBeenCalledWith(context, 'wf1', undefined, {
				includeSettled: true,
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

				const tool = createWorkflowsTool(context);
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

				const tool = createWorkflowsTool(context);
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

				const tool = createWorkflowsTool(context);
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

				const tool = createWorkflowsTool(context);
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

				const tool = createWorkflowsTool(context);
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

				const tool = createWorkflowsTool(context);
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

				const tool = createWorkflowsTool(context);
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

				const tool = createWorkflowsTool(context);
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

				const tool = createWorkflowsTool(context);
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

				const tool = createWorkflowsTool(context);
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

				const tool = createWorkflowsTool(context);
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

				const tool = createWorkflowsTool(context);
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

				const tool = createWorkflowsTool(context);
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

				const tool = createWorkflowsTool(context);
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
	});

	describe('unpublish action', () => {
		it('should unpublish when approved', async () => {
			const context = createMockContext();

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
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
