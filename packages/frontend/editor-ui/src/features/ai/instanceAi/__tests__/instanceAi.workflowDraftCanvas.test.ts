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

	it('keys the workflow by its own document id and revision', () => {
		const workflow = toDraftWorkflowDb(draft(), 'draft-doc');

		expect(workflow).toMatchObject({ id: 'draft-doc', name: 'Demo', versionId: 'draft-3' });
	});

	it('gives every node an id and parameters', () => {
		const [start, set] = toDraftWorkflowDb(draft(), 'draft-doc').nodes;

		expect(start).toMatchObject({ id: 'node-1', parameters: { mode: 'manual' } });
		expect(set.id).toEqual(expect.any(String));
		expect(set.id).not.toBe(start.id);
		expect(set.parameters).toEqual({});
	});

	it('keeps node ids stable across revisions of the same draft', () => {
		const first = toDraftWorkflowDb(draft(), 'draft-doc').nodes[1].id;
		const second = toDraftWorkflowDb({ ...draft(), revision: 4 }, 'draft-doc').nodes[1].id;

		expect(second).toBe(first);
	});

	it('keeps the node groups', () => {
		const nodeGroups = [{ id: 'g-1', name: 'Intake', nodeIds: ['node-1'] }];

		expect(toDraftWorkflowDb(draft({ nodeGroups }), 'draft-doc').nodeGroups).toEqual(nodeGroups);
	});

	it('keeps connections of known types and drops the rest', () => {
		const workflow = toDraftWorkflowDb(
			draft({
				connections: {
					Start: {
						main: [[{ node: 'Set', type: 'main', index: 0 }]],
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

	it('keys a node by its id, else by its name', () => {
		const { nodes } = draft().workflow;

		expect(nodes.map(draftNodeKey)).toEqual(['node-1', 'Set']);
	});
});
