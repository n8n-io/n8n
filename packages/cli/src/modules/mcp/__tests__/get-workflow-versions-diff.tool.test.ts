import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';
import type { INode } from 'n8n-workflow';
import type { Mock } from 'vitest';

import { WorkflowHistoryVersionNotFoundError } from '@/errors/workflow-history-version-not-found.error';
import { Telemetry } from '@/telemetry';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';

import { createWorkflow, createWorkflowHistoryVersion } from './mock.utils';
import { createGetWorkflowVersionsDiffTool } from '../tools/get-workflow-versions-diff.tool';

const makeNode = (overrides: Partial<INode>): INode => ({
	id: 'node-1',
	name: 'HTTP Request',
	type: 'n8n-nodes-base.httpRequest',
	typeVersion: 4.2,
	position: [0, 0],
	parameters: { url: 'https://example.com' },
	...overrides,
});

describe('get-workflow-versions-diff MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });
	let workflowFinderService: WorkflowFinderService;
	let workflowHistoryService: WorkflowHistoryService;
	let telemetry: Telemetry;

	beforeEach(() => {
		workflowFinderService = mockInstance(WorkflowFinderService);
		workflowHistoryService = mockInstance(WorkflowHistoryService);
		telemetry = mockInstance(Telemetry, { track: vi.fn() });
	});

	const buildTool = () =>
		createGetWorkflowVersionsDiffTool(
			user,
			workflowFinderService,
			workflowHistoryService,
			telemetry,
		);

	const callContext = {} as Parameters<ReturnType<typeof buildTool>['handler']>[1];

	const mockVersions = (
		fromNodes: INode[],
		toNodes: INode[],
		connections = {},
		toConnections = {},
	) => {
		(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(createWorkflow());
		(workflowHistoryService.getVersion as Mock).mockImplementation(
			async (_user: User, workflowId: string, versionId: string) =>
				createWorkflowHistoryVersion({
					workflowId,
					versionId,
					nodes: versionId === 'v1' ? fromNodes : toNodes,
					connections: versionId === 'v1' ? connections : toConnections,
				}),
		);
	};

	describe('smoke tests', () => {
		test('creates tool correctly', () => {
			const tool = buildTool();

			expect(tool.name).toBe('get_workflow_versions_diff');
			expect(tool.config.inputSchema).toBeDefined();
			expect(tool.config.outputSchema).toBeDefined();
			expect(tool.config.annotations?.readOnlyHint).toBe(true);
			expect(typeof tool.handler).toBe('function');
		});
	});

	describe('handler tests', () => {
		test('reports added, removed, and modified nodes with a field-level delta', async () => {
			const unchanged = makeNode({ id: 'node-keep', name: 'Keep' });
			const removed = makeNode({ id: 'node-gone', name: 'Old Node' });
			const modifiedBefore = makeNode({ id: 'node-mod', name: 'Fetch' });
			const modifiedAfter = makeNode({
				id: 'node-mod',
				name: 'Fetch',
				parameters: { url: 'https://changed.example.com' },
			});
			const added = makeNode({
				id: 'node-new',
				name: 'New Node',
				type: 'n8n-nodes-base.set',
				parameters: { mode: 'manual', assignments: { assignments: [] } },
				credentials: { httpHeaderAuth: { id: 'cred-1', name: 'Secret' } },
			});

			mockVersions([unchanged, removed, modifiedBefore], [unchanged, modifiedAfter, added]);

			const tool = buildTool();
			const result = await tool.handler(
				{ workflowId: 'wf-1', fromVersionId: 'v1', toVersionId: 'v2' },
				callContext,
			);

			expect(result.structuredContent).toMatchObject({
				success: true,
				workflowId: 'wf-1',
				fromVersionId: 'v1',
				toVersionId: 'v2',
				// Added nodes carry their full content (with credentials reduced to
				// id and name); removed nodes are summaries only.
				nodesAdded: [
					{
						id: 'node-new',
						name: 'New Node',
						type: 'n8n-nodes-base.set',
						parameters: { mode: 'manual', assignments: { assignments: [] } },
						credentials: { httpHeaderAuth: { id: 'cred-1', name: 'Secret' } },
					},
				],
				nodesRemoved: [{ id: 'node-gone', name: 'Old Node' }],
				nodesModified: [
					{
						id: 'node-mod',
						name: 'Fetch',
						changes: {
							parameters: {
								url: { __old: 'https://example.com', __new: 'https://changed.example.com' },
							},
						},
					},
				],
			});
			const content = result.structuredContent as { nodesRemoved: Array<Record<string, unknown>> };
			expect(content.nodesRemoved[0]).not.toHaveProperty('parameters');
		});

		test('does not report position-only moves as modifications', async () => {
			const before = makeNode({ position: [0, 0] });
			const after = makeNode({ position: [200, 300] });

			mockVersions([before], [after]);

			const tool = buildTool();
			const result = await tool.handler(
				{ workflowId: 'wf-1', fromVersionId: 'v1', toVersionId: 'v2' },
				callContext,
			);

			expect(result.structuredContent).toMatchObject({
				success: true,
				nodesAdded: [],
				nodesRemoved: [],
				nodesModified: [],
			});
		});

		test('lists a renamed node by its target-version name with the rename in the delta', async () => {
			const before = makeNode({ name: 'Old Name' });
			const after = makeNode({ name: 'New Name' });

			mockVersions([before], [after]);

			const tool = buildTool();
			const result = await tool.handler(
				{ workflowId: 'wf-1', fromVersionId: 'v1', toVersionId: 'v2' },
				callContext,
			);

			expect(result.structuredContent).toMatchObject({
				nodesModified: [
					{
						id: 'node-1',
						name: 'New Name',
						changes: { name: { __old: 'Old Name', __new: 'New Name' } },
					},
				],
			});
		});

		test('reports added and removed connections as flat from/to/type entries', async () => {
			const nodes = [makeNode({ id: 'node-a', name: 'A' }), makeNode({ id: 'node-b', name: 'B' })];
			const fromConnections = {
				A: { main: [[{ node: 'B', type: 'main', index: 0 }]] },
			};
			const toConnections = {
				B: { main: [[{ node: 'A', type: 'main', index: 0 }]] },
			};

			mockVersions(nodes, nodes, fromConnections, toConnections);

			const tool = buildTool();
			const result = await tool.handler(
				{ workflowId: 'wf-1', fromVersionId: 'v1', toVersionId: 'v2' },
				callContext,
			);

			expect(result.structuredContent).toMatchObject({
				success: true,
				connectionsAdded: [{ from: 'B', to: 'A', type: 'main' }],
				connectionsRemoved: [{ from: 'A', to: 'B', type: 'main' }],
			});
		});

		test('reduces credentials to id and name in the delta', async () => {
			const before = makeNode({
				credentials: { httpHeaderAuth: { id: 'cred-1', name: 'Old Cred' } },
			});
			const after = makeNode({
				credentials: { httpHeaderAuth: { id: 'cred-2', name: 'New Cred' } },
			});

			mockVersions([before], [after]);

			const tool = buildTool();
			const result = await tool.handler(
				{ workflowId: 'wf-1', fromVersionId: 'v1', toVersionId: 'v2' },
				callContext,
			);

			expect(result.structuredContent).toMatchObject({
				nodesModified: [
					{
						changes: {
							credentials: {
								httpHeaderAuth: {
									id: { __old: 'cred-1', __new: 'cred-2' },
									name: { __old: 'Old Cred', __new: 'New Cred' },
								},
							},
						},
					},
				],
			});
		});

		test('returns a structured friendly error when a version is not found', async () => {
			(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(createWorkflow());
			(workflowHistoryService.getVersion as Mock).mockRejectedValue(
				new WorkflowHistoryVersionNotFoundError(''),
			);

			const tool = buildTool();
			const result = await tool.handler(
				{ workflowId: 'wf-1', fromVersionId: 'missing', toVersionId: 'v2' },
				callContext,
			);

			expect(result.isError).toBe(true);
			expect(result.structuredContent).toMatchObject({
				success: false,
				workflowId: 'wf-1',
				fromVersionId: 'missing',
				toVersionId: 'v2',
				nodesAdded: [],
				nodesRemoved: [],
				nodesModified: [],
				connectionsAdded: [],
				connectionsRemoved: [],
			});
			expect((result.structuredContent as { error: string }).error).toContain(
				'was not found for this workflow',
			);
		});

		test('returns a structured error when the workflow is not accessible', async () => {
			(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(null);

			const tool = buildTool();
			const result = await tool.handler(
				{ workflowId: 'wf-1', fromVersionId: 'v1', toVersionId: 'v2' },
				callContext,
			);

			expect(result.isError).toBe(true);
			expect(result.structuredContent).toMatchObject({
				success: false,
				workflowId: 'wf-1',
				error: "Workflow not found or you don't have permission to access it.",
			});
			expect(workflowHistoryService.getVersion).not.toHaveBeenCalled();
		});
	});
});
