import type { WorkflowEntity } from '@n8n/db';
import type { INode } from 'n8n-workflow';

import {
	collectMissingNodeTypes,
	missingNodeTypeBlockingFailures,
	workflowsWithMissingNodeTypes,
} from '../missing-node-type-mode';
import type { PreparedWorkflow } from '../workflow-import.types';

const SUPPORTED_VERSIONS: Record<string, number[]> = {
	'n8n-nodes-base.manualTrigger': [1],
	'n8n-nodes-base.set': [1, 2, 3],
};

const getSupportedVersions = (nodeType: string) => SUPPORTED_VERSIONS[nodeType];

function prepared(
	sourceWorkflowId: string,
	nodes: Array<Pick<INode, 'type' | 'typeVersion'>>,
): PreparedWorkflow {
	return {
		entity: {
			nodes: nodes.map((node, index) => ({
				id: `n${index}`,
				name: `Node ${index}`,
				position: [0, 0],
				parameters: {},
				...node,
			})),
		} as WorkflowEntity,
		sourceWorkflowId,
		sourcePublished: false,
		parentFolderId: null,
	};
}

describe('collectMissingNodeTypes', () => {
	it('returns nothing for an empty workflows array', () => {
		expect(collectMissingNodeTypes([], getSupportedVersions)).toEqual([]);
	});

	it('returns nothing when every node type and version is supported', () => {
		const workflows = [
			prepared('wf-1', [
				{ type: 'n8n-nodes-base.manualTrigger', typeVersion: 1 },
				{ type: 'n8n-nodes-base.set', typeVersion: 3 },
			]),
		];

		expect(collectMissingNodeTypes(workflows, getSupportedVersions)).toEqual([]);
	});

	it('reports an unknown node type as missing', () => {
		const workflows = [prepared('wf-1', [{ type: 'n8n-nodes-base.unknown', typeVersion: 2 }])];

		expect(collectMissingNodeTypes(workflows, getSupportedVersions)).toEqual([
			{ type: 'n8n-nodes-base.unknown', typeVersion: 2, usedByWorkflows: ['wf-1'] },
		]);
	});

	it('reports a known node type at an unsupported version as missing', () => {
		const workflows = [prepared('wf-1', [{ type: 'n8n-nodes-base.set', typeVersion: 4 }])];

		expect(collectMissingNodeTypes(workflows, getSupportedVersions)).toEqual([
			{ type: 'n8n-nodes-base.set', typeVersion: 4, usedByWorkflows: ['wf-1'] },
		]);
	});

	it('folds duplicate pairs into one requirement with merged workflow ids', () => {
		const workflows = [
			prepared('wf-1', [
				{ type: 'n8n-nodes-base.unknown', typeVersion: 1 },
				// The same pair twice within one workflow must not duplicate the id.
				{ type: 'n8n-nodes-base.unknown', typeVersion: 1 },
			]),
			prepared('wf-2', [
				{ type: 'n8n-nodes-base.unknown', typeVersion: 1 },
				{ type: 'n8n-nodes-base.unknown', typeVersion: 2 },
			]),
		];

		expect(collectMissingNodeTypes(workflows, getSupportedVersions)).toEqual([
			{ type: 'n8n-nodes-base.unknown', typeVersion: 1, usedByWorkflows: ['wf-1', 'wf-2'] },
			{ type: 'n8n-nodes-base.unknown', typeVersion: 2, usedByWorkflows: ['wf-2'] },
		]);
	});

	it('dedupes a workflow id that reappears non-adjacently in the input', () => {
		const workflows = [
			prepared('wf-1', [{ type: 'n8n-nodes-base.unknown', typeVersion: 1 }]),
			prepared('wf-2', [{ type: 'n8n-nodes-base.unknown', typeVersion: 1 }]),
			prepared('wf-1', [{ type: 'n8n-nodes-base.unknown', typeVersion: 1 }]),
		];

		expect(collectMissingNodeTypes(workflows, getSupportedVersions)).toEqual([
			{ type: 'n8n-nodes-base.unknown', typeVersion: 1, usedByWorkflows: ['wf-1', 'wf-2'] },
		]);
	});
});

describe('missingNodeTypeBlockingFailures', () => {
	const missing = [{ type: 'n8n-nodes-base.unknown', typeVersion: 1, usedByWorkflows: ['wf-1'] }];

	it('fail treats every missing pair as blocking', () => {
		expect(missingNodeTypeBlockingFailures('fail', missing)).toEqual(missing);
	});

	it('import-anyway treats nothing as blocking', () => {
		expect(missingNodeTypeBlockingFailures('import-anyway', missing)).toEqual([]);
	});
});

describe('workflowsWithMissingNodeTypes', () => {
	it('unions the workflow ids across every missing pair', () => {
		const blocked = workflowsWithMissingNodeTypes([
			{ type: 'n8n-nodes-base.unknown', typeVersion: 1, usedByWorkflows: ['wf-1', 'wf-2'] },
			{ type: 'n8n-nodes-base.other', typeVersion: 2, usedByWorkflows: ['wf-2', 'wf-3'] },
		]);

		expect(blocked).toEqual(new Set(['wf-1', 'wf-2', 'wf-3']));
	});
});
