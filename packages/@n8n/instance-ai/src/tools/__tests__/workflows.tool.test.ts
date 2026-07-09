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
import {
	getWorkflowSourceFileBinding,
	saveWorkflowSourceFileBinding,
} from '../workflows/workflow-file-bindings';
import { createWorkflowsTool, type WorkflowAction } from '../workflows.tool';

// Mock the setup-workflow.service module to avoid pulling in heavy dependencies
vi.mock('../workflows/setup-workflow.service', () => ({
	analyzeWorkflow: vi.fn().mockResolvedValue([]),
	applyNodeCredentials: vi.fn().mockResolvedValue({ failed: [] }),
	applyNodeParameters: vi.fn().mockResolvedValue({ failed: [] }),
	applyNodeChanges: vi.fn().mockResolvedValue({ applied: [], failed: [] }),
	buildCompletedReport: vi.fn().mockReturnValue([]),
}));

// Mock the dynamic import of @n8n/workflow-sdk used by get-as-code
vi.mock('@n8n/workflow-sdk', () => ({
	generateWorkflowCode: vi.fn().mockReturnValue('// generated code'),
}));

function createMockContext(
	overrides: Partial<Omit<InstanceAiContext, 'permissions'>> & {
		permissions?: Partial<InstanceAiPermissions>;
	} = {},
): InstanceAiContext {
	return {
		userId: 'user-1',
		workflowService: {
			list: vi.fn(),
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

		it('should allow code inspection but reject raw update on orchestrator surface', () => {
			const context = createMockContext();
			const tool = createWorkflowsTool(context, 'orchestrator');
			const schema = getInputSchema(tool);

			expect(schema.safeParse({ action: 'get-json', workflowId: 'w1' }).success).toBe(true);
			expect(schema.safeParse({ action: 'get-as-code', workflowId: 'w1' }).success).toBe(true);
			expect(
				schema.safeParse({
					action: 'update',
					workflowId: 'w1',
					workflow: { name: 'WF', nodes: [], connections: {} },
				}).success,
			).toBe(false);
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
			(context.workflowService.list as Mock).mockResolvedValue(workflows);

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(
				tool,
				{ action: 'list', query: 'test', limit: 10 },
				{} as never,
			);

			expect(context.workflowService.list).toHaveBeenCalledWith({ limit: 10, query: 'test' });
			expect(result).toEqual({ workflows });
		});

		it('should pass archived status when listing archived workflows', async () => {
			const context = createMockContext();
			(context.workflowService.list as Mock).mockResolvedValue([]);

			const tool = createWorkflowsTool(context, 'full');
			await executeTool(tool, { action: 'list', status: 'archived' }, {} as never);

			expect(context.workflowService.list).toHaveBeenCalledWith({ status: 'archived' });
		});

		it('should pass all status when listing all workflows', async () => {
			const context = createMockContext();
			(context.workflowService.list as Mock).mockResolvedValue([]);

			const tool = createWorkflowsTool(context, 'full');
			await executeTool(tool, { action: 'list', status: 'all' }, {} as never);

			expect(context.workflowService.list).toHaveBeenCalledWith({ status: 'all' });
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

			expect(analyzeWorkflow).toHaveBeenCalledWith(context, 'wf1');
			expect(suspend).toHaveBeenCalled();
			expect(suspend.mock.calls[0][0]).toMatchObject({
				message: 'Configure credentials for your workflow',
				severity: 'info',
				setupRequests,
				workflowId: 'wf1',
			});
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
