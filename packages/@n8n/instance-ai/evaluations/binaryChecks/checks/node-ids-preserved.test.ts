import { nodeIdsPreserved } from './node-ids-preserved';
import type { WorkflowResponse } from '../../clients/n8n-client';
import type { BinaryCheckContext } from '../types';

function workflow(nodes: Array<{ id: string; name: string }>): WorkflowResponse {
	return {
		id: 'wf-1',
		name: 'Workflow',
		active: false,
		versionId: 'v1',
		nodes: nodes.map((node) => ({
			...node,
			type: 'n8n-nodes-base.set',
			typeVersion: 3.4,
			position: [0, 0] as [number, number],
			parameters: {},
		})),
		connections: {},
	} as unknown as WorkflowResponse;
}

function ctx(before?: WorkflowResponse): BinaryCheckContext {
	return { prompt: 'edit the workflow', ...(before ? { workflowBefore: before } : {}) };
}

describe('nodeIdsPreserved', () => {
	it('passes when every surviving node keeps its id', async () => {
		const before = workflow([
			{ id: 'a', name: 'Trigger' },
			{ id: 'b', name: 'Set' },
		]);
		const after = workflow([
			{ id: 'a', name: 'Trigger' },
			{ id: 'b', name: 'Set' },
		]);

		expect(await nodeIdsPreserved.run(after, ctx(before))).toMatchObject({ pass: true });
	});

	it('fails when a node keeps its name but changes id', async () => {
		const before = workflow([
			{ id: 'a', name: 'Trigger' },
			{ id: 'b', name: 'Set' },
		]);
		const after = workflow([
			{ id: 'a', name: 'Trigger' },
			{ id: 'fresh', name: 'Set' },
		]);

		const result = await nodeIdsPreserved.run(after, ctx(before));

		expect(result.pass).toBe(false);
		expect(result.comment).toContain('Set');
	});

	it('fails and names every re-identified node when the whole graph is re-idded', async () => {
		const before = workflow([
			{ id: 'a', name: 'Trigger' },
			{ id: 'b', name: 'Set' },
		]);
		const after = workflow([
			{ id: 'x', name: 'Trigger' },
			{ id: 'y', name: 'Set' },
		]);

		const result = await nodeIdsPreserved.run(after, ctx(before));

		expect(result.pass).toBe(false);
		expect(result.comment).toContain('Trigger');
		expect(result.comment).toContain('Set');
	});

	/**
	 * A rename or a deletion removes the name from the "after" side, and neither is this
	 * check's business — it only asserts that identity does not move under a stable name.
	 */
	it('passes when a node was renamed', async () => {
		const before = workflow([{ id: 'a', name: 'Old Name' }]);
		const after = workflow([{ id: 'a', name: 'New Name' }]);

		expect(await nodeIdsPreserved.run(after, ctx(before))).toMatchObject({ pass: true });
	});

	it('passes when a node was deleted', async () => {
		const before = workflow([
			{ id: 'a', name: 'Trigger' },
			{ id: 'b', name: 'Set' },
		]);
		const after = workflow([{ id: 'a', name: 'Trigger' }]);

		expect(await nodeIdsPreserved.run(after, ctx(before))).toMatchObject({ pass: true });
	});

	it('passes when nodes were added', async () => {
		const before = workflow([{ id: 'a', name: 'Trigger' }]);
		const after = workflow([
			{ id: 'a', name: 'Trigger' },
			{ id: 'new', name: 'Added' },
		]);

		expect(await nodeIdsPreserved.run(after, ctx(before))).toMatchObject({ pass: true });
	});

	it('is not applicable to a from-scratch build', async () => {
		const after = workflow([{ id: 'a', name: 'Trigger' }]);

		expect(await nodeIdsPreserved.run(after, ctx())).toMatchObject({ applicable: false });
	});

	it('is not applicable when the previous workflow had no nodes', async () => {
		const after = workflow([{ id: 'a', name: 'Trigger' }]);

		expect(await nodeIdsPreserved.run(after, ctx(workflow([])))).toMatchObject({
			applicable: false,
		});
	});
});
