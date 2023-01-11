import type { WorkflowEntity as Workflow } from '@/databases/entities/WorkflowEntity';
import type { Risk } from '@/audit/types';

type Node = Workflow['nodes'][number];

export const toFlaggedNode = ({ node, workflow }: { node: Node; workflow: Workflow }) => ({
	kind: 'node' as const,
	workflowId: workflow.id,
	workflowName: workflow.name,
	nodeId: node.id,
	nodeName: node.name,
	nodeType: node.type,
});

export const toReportTitle = (riskCategory: Risk.Category) =>
	riskCategory.charAt(0).toUpperCase() + riskCategory.slice(1) + ' Risk Report';

export function getNodeTypes(workflows: Workflow[], test: (element: Node) => boolean) {
	return workflows.reduce<Risk.NodeLocation[]>((acc, workflow) => {
		workflow.nodes.forEach((node) => {
			if (test(node)) acc.push(toFlaggedNode({ node, workflow }));
		});

		return acc;
	}, []);
}
