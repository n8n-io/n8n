import { describe, expect, it } from 'vitest';

import { toDraftWorkflowDb } from '../instanceAi.workflowDraftCanvas';
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
