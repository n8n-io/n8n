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
				connectionsAdded: [{ from: 'B', to: 'A', type: 'main', fromOutput: 0, toInput: 0 }],
				connectionsRemoved: [{ from: 'A', to: 'B', type: 'main', fromOutput: 0, toInput: 0 }],
			});
		});

		describe('node identity in the connection diff', () => {
			const trigger = makeNode({ id: 'node-t', name: 'Trigger' });
			const slack = makeNode({ id: 'node-s', name: 'Slack' });
			// Trigger -> <middle> -> Slack. Connections are keyed by node name, which
			// is exactly what makes a rename look like a rewire.
			const chainVia = (middle: string) => ({
				[trigger.name]: { main: [[{ node: middle, type: 'main', index: 0 }]] },
				[middle]: { main: [[{ node: slack.name, type: 'main', index: 0 }]] },
			});
			const triggerStraightToSlack = {
				[trigger.name]: { main: [[{ node: slack.name, type: 'main', index: 0 }]] },
			};

			const diffVersions = async (
				fromNodes: INode[],
				toNodes: INode[],
				fromConnections: object,
				toConnections: object,
			) => {
				mockVersions(fromNodes, toNodes, fromConnections, toConnections);
				const result = await buildTool().handler(
					{ workflowId: 'wf-1', fromVersionId: 'v1', toVersionId: 'v2' },
					callContext,
				);
				return result.structuredContent as {
					nodesModified: Array<Record<string, unknown>>;
					connectionsAdded: Array<Record<string, unknown>>;
					connectionsRemoved: Array<Record<string, unknown>>;
				};
			};

			test('a rename alone does not change the connection diff', async () => {
				const content = await diffVersions(
					[trigger, makeNode({ id: 'node-f', name: 'Fetch' }), slack],
					[trigger, makeNode({ id: 'node-f', name: 'Get Data' }), slack],
					chainVia('Fetch'),
					chainVia('Get Data'),
				);

				// The wiring is unchanged, so only the node itself is reported.
				expect(content.connectionsAdded).toEqual([]);
				expect(content.connectionsRemoved).toEqual([]);
				expect(content.nodesModified).toMatchObject([
					{
						id: 'node-f',
						name: 'Get Data',
						changes: { name: { __old: 'Fetch', __new: 'Get Data' } },
					},
				]);
			});

			test('a rewire in the same version as a rename still reports the rewire', async () => {
				const content = await diffVersions(
					[trigger, makeNode({ id: 'node-f', name: 'Fetch' }), slack],
					[trigger, makeNode({ id: 'node-f', name: 'Get Data' }), slack],
					chainVia('Fetch'),
					triggerStraightToSlack,
				);

				expect(content.connectionsAdded).toMatchObject([{ from: 'Trigger', to: 'Slack' }]);
				// Reported under the renamed node's current name, which still resolves.
				expect(content.connectionsRemoved).toMatchObject([
					{ from: 'Trigger', to: 'Get Data' },
					{ from: 'Get Data', to: 'Slack' },
				]);
			});

			test('a removed node keeps its base-version name on removed connections', async () => {
				const content = await diffVersions(
					[trigger, makeNode({ id: 'node-f', name: 'Fetch' }), slack],
					[trigger, slack],
					chainVia('Fetch'),
					{},
				);

				expect(content.connectionsRemoved).toMatchObject([
					{ from: 'Trigger', to: 'Fetch' },
					{ from: 'Fetch', to: 'Slack' },
				]);
			});

			test('empty output slots do not register as connection changes', async () => {
				const ifNode = makeNode({ id: 'node-if', name: 'If', type: 'n8n-nodes-base.if' });
				const connections = {
					[ifNode.name]: { main: [null, [{ node: slack.name, type: 'main', index: 0 }]] },
				};

				const content = await diffVersions([ifNode, slack], [ifNode, slack], connections, {
					...connections,
				});

				expect(content.connectionsAdded).toEqual([]);
				expect(content.connectionsRemoved).toEqual([]);
			});
		});

		test('distinguishes a rewire between two outputs of the same node', async () => {
			const ifNode = makeNode({ id: 'node-if', name: 'If', type: 'n8n-nodes-base.if' });
			const slack = makeNode({ id: 'node-s', name: 'Slack' });
			const target = [{ node: slack.name, type: 'main', index: 0 }];

			mockVersions(
				[ifNode, slack],
				[ifNode, slack],
				{ [ifNode.name]: { main: [target, []] } },
				{ [ifNode.name]: { main: [[], target] } },
			);

			const tool = buildTool();
			const result = await tool.handler(
				{ workflowId: 'wf-1', fromVersionId: 'v1', toVersionId: 'v2' },
				callContext,
			);

			// Without the output index both entries would be identical, hiding the
			// move from the true branch to the false branch.
			expect(result.structuredContent).toMatchObject({
				connectionsAdded: [{ from: 'If', to: 'Slack', fromOutput: 1 }],
				connectionsRemoved: [{ from: 'If', to: 'Slack', fromOutput: 0 }],
			});
		});

		test.each([
			['disabled', { disabled: true }],
			['onError', { onError: 'continueRegularOutput' as const }],
			['retryOnFail', { retryOnFail: true }],
			['executeOnce', { executeOnce: true }],
			['alwaysOutputData', { alwaysOutputData: true }],
			['notes', { notes: 'handle rate limits here' }],
		])('reports a change to the %s node setting', async (property, override) => {
			mockVersions([makeNode({})], [makeNode(override)]);

			const tool = buildTool();
			const result = await tool.handler(
				{ workflowId: 'wf-1', fromVersionId: 'v1', toVersionId: 'v2' },
				callContext,
			);

			const content = result.structuredContent as {
				nodesModified: Array<{ changes: Record<string, unknown> }>;
			};
			expect(content.nodesModified).toHaveLength(1);
			expect(content.nodesModified[0].changes).toHaveProperty(`${property}__added`);
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
