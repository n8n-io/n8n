import { describe, expect, it } from 'vitest';

import { draftNodeKey, toDraftWorkflowDb, withDraftNodes } from '../instanceAi.workflowDraftCanvas';
import type { WorkflowDraft } from '../instanceAi.workflowDrafts';

function draft(overrides: Partial<WorkflowDraft['workflow']> = {}): WorkflowDraft {
	return {
		filePath: 'src/workflows/demo.workflow.ts',
		revision: 3,
		workflow: {
			name: 'Demo',
			nodes: [
				{
					id: 'node-1',
					name: 'Start',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: { mode: 'manual' },
				},
				{
					name: 'Set',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [200, 0],
				},
			],
			connections: {
				Start: { main: [[{ node: 'Set', type: 'main', index: 0 }]] },
			},
			...overrides,
		},
	};
}

describe('toDraftWorkflowDb', () => {
	it('marks the nodes that the draft issues name', () => {
		const withIssues: WorkflowDraft = {
			...draft(),
			issues: [
				{ code: 'SET_INVALID_ASSIGNMENT', message: 'Missing id', nodeName: 'Set' },
				{ code: 'SET_EMPTY', message: 'No fields', nodeName: 'Set' },
				{ code: 'GROUP_DROPPED_OVER_CEILING', message: 'Too many groups' },
				{ code: 'GHOST', message: 'Gone', nodeName: 'Missing' },
			],
		};

		const workflow = toDraftWorkflowDb(withIssues, 'draft-doc');

		expect(workflow.nodes[0].issues).toBeUndefined();
		expect(workflow.nodes[1].issues).toEqual({
			parameters: { SET_INVALID_ASSIGNMENT: ['Missing id'], SET_EMPTY: ['No fields'] },
		});
	});

	it('marks an issue whose code is also an object property name', () => {
		const withIssues: WorkflowDraft = {
			...draft(),
			issues: [{ code: 'constructor', message: 'Odd code', nodeName: 'Set' }],
		};

		const workflow = toDraftWorkflowDb(withIssues, 'draft-doc');

		expect(workflow.nodes[1].issues).toEqual({ parameters: { constructor: ['Odd code'] } });
	});

	it('keys the workflow by its own document id and revision', () => {
		const workflow = toDraftWorkflowDb(draft(), 'draft-doc');

		expect(workflow).toMatchObject({ id: 'draft-doc', name: 'Demo', versionId: 'draft-3' });
	});

	it('gives every node an id and parameters', () => {
		const [start, set] = toDraftWorkflowDb(draft(), 'draft-doc').nodes;

		expect(start).toMatchObject({ id: expect.any(String), parameters: { mode: 'manual' } });
		expect(set.id).toEqual(expect.any(String));
		expect(set.id).not.toBe(start.id);
		expect(set.parameters).toEqual({});
	});

	it('keeps node ids stable across revisions, also when each compile gives new ids', () => {
		const first = toDraftWorkflowDb(draft(), 'draft-doc').nodes[0].id;
		const next = draft();
		next.workflow.nodes[0] = { ...next.workflow.nodes[0], id: 'node-1-recompiled' };
		const second = toDraftWorkflowDb({ ...next, revision: 4 }, 'draft-doc').nodes[0].id;

		expect(second).toBe(first);
	});

	it('keeps the node groups on the nodes they hold', () => {
		const nodeGroups = [{ id: 'g-1', name: 'Intake', nodeIds: ['node-1'] }];

		const workflow = toDraftWorkflowDb(draft({ nodeGroups }), 'draft-doc');

		expect(workflow.nodeGroups).toEqual([
			{ id: 'g-1', name: 'Intake', nodeIds: [workflow.nodes[0].id] },
		]);
	});

	it('keeps connections of known types and drops the rest', () => {
		const workflow = toDraftWorkflowDb(
			draft({
				connections: {
					Start: {
						main: [
							[
								{ node: 'Set', type: 'main', index: 0 },
								{ node: 'Set', type: 'bogus', index: 0 },
							],
						],
						bogus: [[{ node: 'Set', type: 'bogus', index: 0 }]],
					},
				},
			}),
			'draft-doc',
		);

		expect(workflow.connections).toEqual({
			Start: { main: [[{ node: 'Set', type: 'main', index: 0 }]] },
		});
	});
});

describe('withDraftNodes', () => {
	it('keeps the given nodes and the connections between them', () => {
		const full = draft();

		const partial = withDraftNodes(full, [full.workflow.nodes[0]]);

		expect(partial.workflow.nodes.map((node) => node.name)).toEqual(['Start']);
		expect(partial.workflow.connections).toEqual({ Start: { main: [[]] } });
		expect(partial.revision).toBe(full.revision);
	});

	it('keeps the connections between the shown nodes', () => {
		const full = draft();

		const partial = withDraftNodes(full, full.workflow.nodes);

		expect(partial.workflow.connections).toEqual({
			Start: { main: [[{ node: 'Set', type: 'main', index: 0 }]] },
		});
	});

	it('keeps only the shown nodes in groups and drops empty groups', () => {
		const full = draft({
			nodeGroups: [
				{ id: 'g-1', name: 'Both', nodeIds: ['node-1', 'missing'] },
				{ id: 'g-2', name: 'Hidden', nodeIds: ['missing'] },
			],
		});

		const partial = withDraftNodes(full, [full.workflow.nodes[0]]);

		expect(partial.workflow.nodeGroups).toEqual([{ id: 'g-1', name: 'Both', nodeIds: ['node-1'] }]);
	});

	it('keys a node by its name, which stays the same when a compile gives new ids', () => {
		const { nodes } = draft().workflow;

		expect(nodes.map(draftNodeKey)).toEqual(['Start', 'Set']);
	});
});
