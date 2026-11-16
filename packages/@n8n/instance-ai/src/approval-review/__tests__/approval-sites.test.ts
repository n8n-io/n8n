/**
 * Runs the real tools that ask for approval through Auto mode. Each site checks
 * that the probe reads the tool's card, that the route matches the tool's name,
 * that an approval runs the action without a card, and that an ask shows the
 * same card as Manual mode.
 */
import type { BuiltTool, InterruptibleToolContext } from '@n8n/agents';
import type { Mock } from 'vitest';

import type { Logger } from '../../logger';
import { createToolRegistry } from '../../tool-registry';
import { createDeleteCredentialTool } from '../../tools/credentials.tool';
import { createDataTableTool } from '../../tools/data-tables.tool';
import { createExecutionTool } from '../../tools/executions.tool';
import { createWorkflowTool } from '../../tools/workflows.tool';
import { createWorkspaceActionTool } from '../../tools/workspace.tool';
import type { InstanceAiContext } from '../../types';
import {
	applyApprovalReview,
	type ApprovalReviewOutcome,
	type InstanceAiApprovalReviewer,
} from '../approval-review';
import type { ApprovalRoute } from '../pending-approval';

const logger: Logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };

const WORKFLOW = { id: 'wf_1', name: 'Lead router', active: true, isArchived: false };

function createContext(): InstanceAiContext {
	return {
		userId: 'user-1',
		logger,
		permissions: {},
		workflowService: {
			get: vi.fn().mockResolvedValue(WORKFLOW),
			getAsWorkflowJSON: vi.fn().mockResolvedValue({ ...WORKFLOW, nodes: [], connections: {} }),
			archive: vi.fn().mockResolvedValue(undefined),
			unarchive: vi.fn().mockResolvedValue(undefined),
			publish: vi.fn().mockResolvedValue({ activeVersionId: 'v_2' }),
			unpublish: vi.fn().mockResolvedValue(undefined),
			restoreVersion: vi.fn().mockResolvedValue(undefined),
			updateVersion: vi.fn().mockResolvedValue({ versionId: 'v_1', name: 'Before cleanup' }),
			getVersion: vi
				.fn()
				.mockResolvedValue({ versionId: 'v_1', createdAt: '2026-01-01T00:00:00Z' }),
			listVersions: vi.fn().mockResolvedValue([]),
		},
		executionService: {
			run: vi.fn().mockResolvedValue({ executionId: 'exec_1', status: 'success' }),
			runStep: vi.fn().mockResolvedValue({ executionId: 'exec_2', status: 'success' }),
		},
		credentialService: {
			get: vi.fn().mockResolvedValue({ id: 'cred_1', name: 'Slack account', type: 'slackApi' }),
			delete: vi.fn().mockResolvedValue(undefined),
		},
		dataTableService: {
			list: vi.fn().mockResolvedValue([]),
			getSchema: vi.fn().mockResolvedValue([]),
			resolveTableReference: vi.fn().mockResolvedValue({ id: 'dt_1', name: 'Leads' }),
			create: vi.fn().mockResolvedValue({ id: 'dt_1', name: 'Leads' }),
			delete: vi.fn().mockResolvedValue(undefined),
			addColumn: vi.fn().mockResolvedValue({}),
			deleteColumn: vi.fn().mockResolvedValue(undefined),
			renameColumn: vi.fn().mockResolvedValue(undefined),
			insertRows: vi.fn().mockResolvedValue({ insertedCount: 1 }),
			updateRows: vi.fn().mockResolvedValue({ updatedCount: 1 }),
			deleteRows: vi.fn().mockResolvedValue({ deletedCount: 1 }),
		},
		workspaceService: {
			createFolder: vi.fn().mockResolvedValue({ id: 'folder_1', name: 'Reports' }),
			deleteFolder: vi.fn().mockResolvedValue(undefined),
			tagWorkflow: vi.fn().mockResolvedValue(['reports']),
			moveWorkflowToFolder: vi.fn().mockResolvedValue(undefined),
			cleanupTestExecutions: vi.fn().mockResolvedValue({ deletedCount: 2 }),
			listTags: vi.fn().mockResolvedValue([]),
			listFolders: vi.fn().mockResolvedValue([]),
			listProjects: vi.fn().mockResolvedValue([]),
		},
	} as unknown as InstanceAiContext;
}

interface ApprovalSite {
	name: string;
	route: ApprovalRoute;
	build(context: InstanceAiContext): BuiltTool;
	input: Record<string, unknown>;
	/** The service call that the action makes once it is approved. */
	action(context: InstanceAiContext): Mock;
}

function service<T>(value: T): Record<string, Mock> {
	return value as unknown as Record<string, Mock>;
}

const SITES: ApprovalSite[] = [
	{
		name: 'delete a credential',
		route: 'always-ask',
		build: (context) => createDeleteCredentialTool(context),
		input: { credentialId: 'cred_1' },
		action: (context) => service(context.credentialService).delete,
	},
	{
		name: 'delete a data table',
		route: 'always-ask',
		build: (context) => createDataTableTool(context, 'delete'),
		input: { dataTableId: 'dt_1' },
		action: (context) => service(context.dataTableService).delete,
	},
	{
		name: 'archive a workflow',
		route: 'always-ask',
		build: (context) => createWorkflowTool(context, 'delete'),
		input: { workflowId: 'wf_1' },
		action: (context) => service(context.workflowService).archive,
	},
	{
		name: 'unpublish a workflow',
		route: 'always-ask',
		build: (context) => createWorkflowTool(context, 'unpublish'),
		input: { workflowId: 'wf_1' },
		action: (context) => service(context.workflowService).unpublish,
	},
	{
		name: 'restore a workflow version',
		route: 'always-ask',
		build: (context) => createWorkflowTool(context, 'restore-version'),
		input: { workflowId: 'wf_1', versionId: 'v_1' },
		action: (context) => service(context.workflowService).restoreVersion,
	},
	{
		name: 'create a data table',
		route: 'low-risk',
		build: (context) => createDataTableTool(context, 'create'),
		input: { name: 'Leads', columns: [{ name: 'email', type: 'string' }] },
		action: (context) => service(context.dataTableService).create,
	},
	{
		name: 'add a data table column',
		route: 'low-risk',
		build: (context) => createDataTableTool(context, 'add-column'),
		input: { dataTableId: 'dt_1', columnName: 'phone', type: 'string' },
		action: (context) => service(context.dataTableService).addColumn,
	},
	{
		name: 'create a folder',
		route: 'low-risk',
		build: (context) => createWorkspaceActionTool(context, 'create-folder'),
		input: { name: 'Reports' },
		action: (context) => service(context.workspaceService).createFolder,
	},
	{
		name: 'tag a workflow',
		route: 'low-risk',
		build: (context) => createWorkspaceActionTool(context, 'tag-workflow'),
		input: { workflowId: 'wf_1', tags: ['reports'] },
		action: (context) => service(context.workspaceService).tagWorkflow,
	},
	{
		name: 'delete data table rows',
		route: 'judge',
		build: (context) => createDataTableTool(context, 'delete-rows'),
		input: {
			dataTableId: 'dt_1',
			filter: { type: 'and', filters: [{ columnName: 'status', condition: 'eq', value: 'test' }] },
		},
		action: (context) => service(context.dataTableService).deleteRows,
	},
	{
		name: 'insert data table rows',
		route: 'judge',
		build: (context) => createDataTableTool(context, 'insert-rows'),
		input: { dataTableId: 'dt_1', rows: [{ email: 'jane@example.com' }] },
		action: (context) => service(context.dataTableService).insertRows,
	},
	{
		name: 'delete a folder',
		route: 'always-ask',
		build: (context) => createWorkspaceActionTool(context, 'delete-folder'),
		input: { folderId: 'folder_1' },
		action: (context) => service(context.workspaceService).deleteFolder,
	},
	{
		name: 'publish a workflow',
		route: 'judge',
		build: (context) => createWorkflowTool(context, 'publish'),
		input: { workflowId: 'wf_1' },
		action: (context) => service(context.workflowService).publish,
	},
	{
		name: 'unarchive a workflow',
		route: 'judge',
		build: (context) => createWorkflowTool(context, 'unarchive'),
		input: { workflowId: 'wf_1' },
		action: (context) => service(context.workflowService).unarchive,
	},
	{
		name: 'run a workflow',
		route: 'judge',
		build: (context) => createExecutionTool(context, 'run'),
		input: { workflowId: 'wf_1' },
		action: (context) => service(context.executionService).run,
	},
	{
		name: 'run one node of a workflow',
		route: 'judge',
		build: (context) => createExecutionTool(context, 'run-step'),
		input: { workflowId: 'wf_1', nodeName: 'HTTP Request' },
		action: (context) => service(context.executionService).runStep,
	},
	{
		name: 'name a workflow version',
		route: 'judge',
		build: (context) => createWorkflowTool(context, 'update-version'),
		input: { workflowId: 'wf_1', versionId: 'v_1', name: 'Before cleanup' },
		action: (context) => service(context.workflowService).updateVersion,
	},
	{
		name: 'update data table rows',
		route: 'judge',
		build: (context) => createDataTableTool(context, 'update-rows'),
		input: {
			dataTableId: 'dt_1',
			filter: { type: 'and', filters: [{ columnName: 'status', condition: 'eq', value: 'test' }] },
			data: { status: 'done' },
		},
		action: (context) => service(context.dataTableService).updateRows,
	},
	{
		name: 'delete a data table column',
		route: 'judge',
		build: (context) => createDataTableTool(context, 'delete-column'),
		input: { dataTableId: 'dt_1', columnId: 'col_1', currentColumnName: 'phone' },
		action: (context) => service(context.dataTableService).deleteColumn,
	},
	{
		name: 'rename a data table column',
		route: 'judge',
		build: (context) => createDataTableTool(context, 'rename-column'),
		input: {
			dataTableId: 'dt_1',
			columnId: 'col_1',
			currentColumnName: 'phone',
			newName: 'mobile',
		},
		action: (context) => service(context.dataTableService).renameColumn,
	},
	{
		name: 'move a workflow to a folder',
		route: 'judge',
		build: (context) => createWorkspaceActionTool(context, 'move-workflow-to-folder'),
		input: { workflowId: 'wf_1', folderId: 'folder_1' },
		action: (context) => service(context.workspaceService).moveWorkflowToFolder,
	},
	{
		name: 'clean up test executions',
		route: 'judge',
		build: (context) => createWorkspaceActionTool(context, 'cleanup-test-executions'),
		input: { workflowId: 'wf_1' },
		action: (context) => service(context.workspaceService).cleanupTestExecutions,
	},
];

function interruptibleContext(): InterruptibleToolContext & { suspend: Mock } {
	return {
		resumeData: undefined,
		toolCallId: 'call_1',
		suspend: vi.fn(async () => ({ suspended: true }) as never),
	} as unknown as InterruptibleToolContext & { suspend: Mock };
}

function stubReviewer(decision: 'approve' | 'ask') {
	const outcomes: ApprovalReviewOutcome[] = [];
	const value: InstanceAiApprovalReviewer = {
		judge: vi.fn(async () => ({ decision, reason: `stub ${decision}` })),
		onReviewed: (_approval, outcome) => {
			outcomes.push(outcome);
		},
	};
	return { value, outcomes };
}

async function runInAuto(site: ApprovalSite, decision: 'approve' | 'ask') {
	const context = createContext();
	const tool = site.build(context);
	const reviewer = stubReviewer(decision);
	const wrapped = applyApprovalReview(createToolRegistry([[tool.name, tool]]), {
		approvalReviewer: reviewer.value,
		logger,
	}).get(tool.name);
	if (!wrapped?.handler) throw new Error(`tool ${tool.name} is missing`);
	const ctx = interruptibleContext();
	await wrapped.handler(site.input, ctx);
	return { context, ctx, reviewer };
}

/** The card that Manual mode shows. Each card gets a new request ID. */
async function cardInManual(site: ApprovalSite): Promise<Record<string, unknown>> {
	const tool = site.build(createContext());
	if (!tool.handler) throw new Error(`tool ${tool.name} has no handler`);
	const ctx = interruptibleContext();
	await tool.handler(site.input, ctx);
	expect(ctx.suspend).toHaveBeenCalledTimes(1);
	return {
		...(ctx.suspend.mock.calls[0][0] as Record<string, unknown>),
		requestId: expect.any(String),
	};
}

describe('approval sites in Auto mode', () => {
	describe.each(SITES)('$name', (site) => {
		it(`goes to the ${site.route} route`, async () => {
			const { reviewer } = await runInAuto(site, 'ask');
			expect(reviewer.outcomes).toHaveLength(1);
			expect(reviewer.outcomes[0].route).toBe(site.route);
			if (site.route === 'judge') return;
			// The judge would ask, so a low-risk action that runs shows that the rule decided.
			expect(reviewer.value.judge).not.toHaveBeenCalled();
			expect(reviewer.outcomes[0]).toMatchObject({
				decidedBy: 'rule',
				decision: site.route === 'low-risk' ? 'approve' : 'ask',
			});
		});

		if (site.route !== 'always-ask') {
			it('runs the action without a card when the review approves', async () => {
				const { context, ctx } = await runInAuto(site, 'approve');
				expect(ctx.suspend).not.toHaveBeenCalled();
				expect(site.action(context)).toHaveBeenCalledTimes(1);
			});
		}

		if (site.route !== 'low-risk') {
			it('shows the same card as Manual mode when the review asks', async () => {
				const manualCard = await cardInManual(site);
				const { context, ctx } = await runInAuto(site, 'ask');
				expect(ctx.suspend).toHaveBeenCalledTimes(1);
				expect(ctx.suspend.mock.calls[0][0]).toEqual(manualCard);
				expect(site.action(context)).not.toHaveBeenCalled();
			});
		}
	});
});
