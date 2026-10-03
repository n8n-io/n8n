import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { keepSubnodesWithParentGroup } from '../keep-subnodes-with-parent-group';

function node(name: string) {
	return { id: `id-${name}`, name, type: 'n8n-nodes-base.set', typeVersion: 1, position: [0, 0] };
}

function aiWorkflow(nodeGroups: WorkflowJSON['nodeGroups']): WorkflowJSON {
	return {
		name: 'Test',
		nodes: [node('Fetch'), node('Agent'), node('Model'), node('Vector Store'), node('Embeddings')],
		connections: {
			Fetch: { main: [[{ node: 'Agent', type: 'main', index: 0 }]] },
			Model: { ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 0 }]] },
			'Vector Store': { ai_tool: [[{ node: 'Agent', type: 'ai_tool', index: 0 }]] },
			Embeddings: {
				ai_embedding: [[{ node: 'Vector Store', type: 'ai_embedding', index: 0 }]],
			},
		},
		nodeGroups,
	} as unknown as WorkflowJSON;
}

describe('keepSubnodesWithParentGroup', () => {
	it('adds missing sub-nodes, including chained ones, to the parent group', () => {
		const json = aiWorkflow([{ id: 'g1', name: 'Answer', nodeIds: ['id-Agent'] }]);

		const warnings = keepSubnodesWithParentGroup(json);

		expect(json.nodeGroups?.[0].nodeIds.sort()).toEqual(
			['id-Agent', 'id-Embeddings', 'id-Model', 'id-Vector Store'].sort(),
		);
		expect(warnings.map((warning) => warning.code)).toEqual([
			'AUTO_GROUPED_SUBNODE',
			'AUTO_GROUPED_SUBNODE',
			'AUTO_GROUPED_SUBNODE',
		]);
	});

	it('removes a sub-node from a group its parent is not in', () => {
		const json = aiWorkflow([{ id: 'g1', name: 'Prepare', nodeIds: ['id-Fetch', 'id-Model'] }]);

		const warnings = keepSubnodesWithParentGroup(json);

		expect(json.nodeGroups?.[0].nodeIds).toEqual(['id-Fetch']);
		expect(warnings).toEqual([
			expect.objectContaining({ code: 'AUTO_UNGROUPED_SUBNODE', nodeName: 'Model' }),
		]);
	});

	it('leaves a sub-node and parent in two different groups for the validator', () => {
		const groups = [
			{ id: 'g1', name: 'Answer', nodeIds: ['id-Agent'] },
			{ id: 'g2', name: 'Models', nodeIds: ['id-Model'] },
		];
		const json = aiWorkflow(groups.map((group) => ({ ...group, nodeIds: [...group.nodeIds] })));

		keepSubnodesWithParentGroup(json);

		expect(json.nodeGroups?.[0].nodeIds).toEqual(expect.arrayContaining(['id-Agent']));
		expect(json.nodeGroups?.[0].nodeIds).not.toContain('id-Model');
		expect(json.nodeGroups?.[1].nodeIds).toEqual(['id-Model']);
	});

	it('does nothing without groups', () => {
		const json = aiWorkflow(undefined);
		expect(keepSubnodesWithParentGroup(json)).toEqual([]);
	});
});
