import type { WorkflowDiff } from '@/types/workflowDiff.types';
import { NodeDiffStatus } from '@/types/workflowDiff.types';
import type { INodeUi, IWorkflowDb } from '@/Interface';
import { pick as _pick, isEqual as _isEqual } from 'lodash-es';

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
			diff[id] = { status: NodeDiffStatus.Deleted };
		} else if (!nodesEqual(baseNodes[id], targetNodes[id])) {
			diff[id] = { status: NodeDiffStatus.Modified };
		} else {
			diff[id] = { status: NodeDiffStatus.Eq };
		}
	});

	Object.keys(targetNodes).forEach((id) => {
		if (!baseNodes[id]) {
			diff[id] = { status: NodeDiffStatus.Added };
		}
	});

	return diff;
}
