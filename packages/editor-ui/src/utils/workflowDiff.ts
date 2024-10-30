import type { WorkflowDiff } from '@/types/workflowDiff.types';
import type { INodeUi, IWorkflowDb } from '@/Interface';
import { NodeDiffStatus } from '@/types/workflowDiff.types';
import _pick from 'lodash/pick';
import _isEqual from 'lodash/isEqual';

export function compareNodes(base: INodeUi, target: INodeUi): boolean {
	const propsToCompare = ['name', 'type', 'typeVersion', 'webhookId', 'credentials', 'parameters'];

	const baseNode = _pick(base, propsToCompare);
	const targetNode = _pick(target, propsToCompare);

	return _isEqual(baseNode, targetNode);
}

export function compareWorkflows(
	base: Pick<IWorkflowDb, 'nodes'>,
	target: Pick<IWorkflowDb, 'nodes'>,
	nodesEqual: (base: INodeUi, target: INodeUi) => boolean = compareNodes,
): WorkflowDiff {
	const baseNodes = base.nodes.reduce(
		(accu, node) => {
			accu[node.id] = node;
			return accu;
		},
		{} as Record<string, INodeUi>,
	);

	const targetNodes = target.nodes.reduce(
		(accu, node) => {
			accu[node.id] = node;
			return accu;
		},
		{} as Record<string, INodeUi>,
	);

	const diff: WorkflowDiff = {};

	Object.keys(baseNodes).forEach((id) => {
		if (!targetNodes[id]) {
			diff[id] = NodeDiffStatus.DELETED;
		} else if (!nodesEqual(baseNodes[id], targetNodes[id])) {
			diff[id] = NodeDiffStatus.MODIFIED;
		} else {
			diff[id] = NodeDiffStatus.EQ;
		}
	});

	Object.keys(targetNodes).forEach((id) => {
		if (!baseNodes[id]) {
			diff[id] = NodeDiffStatus.ADDED;
		}
	});

	return diff;
}
